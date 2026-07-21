// UniEmbassy — 前台邏輯（Phase 2：改用 DB 資料層，支援雲端 / 本機雙模式）
(function () {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const catSelect = document.getElementById("catSelect");
  const paidOnly = document.getElementById("paidOnly");
  const recruitingOnly = document.getElementById("recruitingOnly");
  const searchInput = document.getElementById("searchInput");
  const resultCount = document.getElementById("resultCount");

  let livePrograms = []; // 由 DB 載入
  let favSet = new Set(); // 目前使用者的收藏（快取）
  let activeCat = "全部";

  // ---------- 分類下拉選單 ----------
  window.CATEGORIES.forEach((cat) => {
    const o = document.createElement("option");
    o.value = cat;
    o.textContent = cat === "全部" ? "全部產業" : cat;
    catSelect.appendChild(o);
  });
  catSelect.onchange = () => {
    activeCat = catSelect.value;
    render();
  };

  // ---------- 截止日 ----------
  function daysLeft(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    return Math.ceil((d - today) / 86400000);
  }
  function fmtDeadline(dateStr) {
    if (!dateStr) return { text: "長期招募", soon: false };
    const dl = daysLeft(dateStr);
    if (dl < 0) return { text: "已截止", soon: false };
    if (dl <= 7) return { text: `剩 ${dl} 天截止`, soon: true };
    return { text: `${dateStr} 截止`, soon: false };
  }

  // ---------- 篩選 ----------
  function getFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    const list = livePrograms.filter((p) => {
      if (activeCat !== "全部" && p.category !== activeCat) return false;
      if (paidOnly.checked && !p.paid) return false;
      if (recruitingOnly.checked && p.recruiting === false) return false;
      if (q) {
        const hay = (p.brand + p.title + p.summary + p.category).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // 預設排序：招募中排前面，已截止的沉底（stable sort 維持組內原序）
    return list.sort((a, b) => (a.recruiting === false ? 1 : 0) - (b.recruiting === false ? 1 : 0));
  }

  // ---------- ⋯ 選單（依身分變臉）----------
  function moreMenuHTML(p) {
    const admin = window.DB.isAdmin && window.DB.isAdmin();
    const adminItems = admin
      ? `<button type="button" data-editp="${p.id}">✏️ 編輯計畫</button>
         <button type="button" data-togglerec="${p.id}">${p.recruiting === false ? "🟢 標為招募中" : "🔴 標為已截止"}</button>`
      : "";
    return `<div class="more-wrap">
        <button class="more-btn" type="button" data-more="${p.id}" title="更多">⋯</button>
        <div class="more-menu">
          ${adminItems}
          <button type="button" data-notep="${p.id}">📝 補充 / 回報資訊</button>
        </div>
      </div>`;
  }
  // 綁定：⋯ 開合 + 三個動作（可在 grid 卡片或 modal 內共用）
  function bindMoreMenus(root) {
    root.querySelectorAll(".more-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const wrap = btn.closest(".more-wrap");
        const wasOpen = wrap.classList.contains("open");
        document.querySelectorAll(".more-wrap.open").forEach((w) => w.classList.remove("open"));
        if (!wasOpen) wrap.classList.add("open");
      };
    });
    root.querySelectorAll("[data-notep]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); closeMenus(); openNote(b.dataset.notep); });
    root.querySelectorAll("[data-editp]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); closeMenus(); openEdit(b.dataset.editp); });
    root.querySelectorAll("[data-togglerec]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); closeMenus(); toggleRecruiting(b.dataset.togglerec); });
  }
  function closeMenus() { document.querySelectorAll(".more-wrap.open").forEach((w) => w.classList.remove("open")); }
  document.addEventListener("click", closeMenus);

  // ---------- 卡片 ----------
  function cardHTML(p) {
    const isFav = favSet.has(p.id);
    const dl = fmtDeadline(p.deadline);
    // 非招募中：不顯示倒數，改標明狀態
    const statusSpan = p.recruiting === false
      ? `<span class="deadline closed">${p.deadline ? "本梯已截止" : "招募時間見官方"}</span>`
      : `<span class="deadline ${dl.soon ? "soon" : ""}">${dl.text}</span>`;
    const paidTag = p.paid
      ? '<span class="tag paid">有薪</span>'
      : '<span class="tag unpaid">無薪</span>';
    return `
      <div class="card" data-id="${p.id}">
        <div class="card-top">
          <div class="card-emoji">${p.emoji}</div>
          <div class="card-top-actions">
            ${moreMenuHTML(p)}
            <button class="fav-btn ${isFav ? "on" : ""}" data-fav="${p.id}" title="收藏">${isFav ? "♥" : "♡"}</button>
          </div>
        </div>
        <div>
          <h3>${p.title}</h3>
          <div class="brand">${p.brand}</div>
        </div>
        <div class="desc">${p.summary}</div>
        <div class="tags">
          ${paidTag}
          <span class="tag">${p.category}</span>
          <span class="tag">${p.location}</span>
        </div>
        <div class="card-foot">
          ${statusSpan}
          <span style="display:flex;gap:6px;">
            <button class="btn ghost sm cmp-add ${compareSet.has(p.id) ? "on" : ""}" data-cmp="${p.id}">${compareSet.has(p.id) ? "✓ 比較中" : "＋比較"}</button>
            <span class="btn ghost sm">看詳情</span>
          </span>
        </div>
      </div>`;
  }

  function render() {
    const list = getFiltered();
    resultCount.textContent = `共 ${list.length} 個計畫`;
    if (list.length === 0) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = list.map(cardHTML).join("");

    grid.querySelectorAll(".card").forEach((el) => {
      el.onclick = (e) => {
        if (e.target.closest("[data-fav]") || e.target.closest("[data-cmp]") || e.target.closest(".more-wrap")) return;
        openModal(el.dataset.id);
      };
    });
    bindMoreMenus(grid);
    grid.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        await handleFav(btn.dataset.fav);
      };
    });
    grid.querySelectorAll("[data-cmp]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleCompare(btn.dataset.cmp);
      };
    });
  }

  // ---------- 計畫比較 ----------
  const compareSet = new Set();
  function toggleCompare(id) {
    if (compareSet.has(id)) compareSet.delete(id);
    else {
      if (compareSet.size >= 3) { toast("最多同時比較 3 個計畫"); return; }
      compareSet.add(id);
    }
    render();
    renderCompareBar();
  }
  function renderCompareBar() {
    const bar = document.getElementById("cmpBar");
    if (compareSet.size === 0) { bar.classList.remove("show"); return; }
    const names = [...compareSet]
      .map((id) => livePrograms.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => `${p.emoji} ${p.brand}`)
      .join("　vs　");
    document.getElementById("cmpNames").textContent = `已選 ${compareSet.size}/3：${names}`;
    bar.classList.add("show");
  }
  document.getElementById("cmpClearBtn").onclick = () => {
    compareSet.clear();
    render();
    renderCompareBar();
  };
  document.getElementById("cmpOpenBtn").onclick = () => openCompare();

  async function openCompare() {
    const progs = [...compareSet].map((id) => livePrograms.find((p) => p.id === id)).filter(Boolean);
    if (progs.length < 2) { toast("至少選 2 個計畫才能比較"); return; }
    // 各計畫的學長姐平均推薦度
    const ratings = await Promise.all(progs.map(async (p) => {
      try {
        const rs = await window.DB.getReviews(p.id);
        if (!rs.length) return null;
        return (rs.reduce((a, r) => a + (r.rating || 0), 0) / rs.length).toFixed(1);
      } catch { return null; }
    }));
    const col = (fn) => progs.map((p, i) => `<td>${fn(p, i)}</td>`).join("");
    document.getElementById("cmpBody").innerHTML = `
      <button class="modal-close" id="cmpClose">✕</button>
      <h2>計畫比較</h2>
      <div class="cmp-table-wrap">
        <table class="cmp-table">
          <tr><th></th>${col((p) => `<div style="font-size:26px;">${p.emoji}</div><div class="c-title">${escapeHtml(p.title)}</div><div class="c-brand">${escapeHtml(p.brand)}</div>`)}</tr>
          <tr><th>產業</th>${col((p) => escapeHtml(p.category))}</tr>
          <tr><th>有薪</th>${col((p) => p.paid ? '<span class="tag paid">有薪</span>' : '<span class="tag unpaid">無薪</span>')}</tr>
          <tr><th>地區</th>${col((p) => escapeHtml(p.location || "—"))}</tr>
          <tr><th>任期</th>${col((p) => escapeHtml(p.term || "—"))}</tr>
          <tr><th>截止日</th>${col((p) => escapeHtml(p.deadline || "長期招募"))}</tr>
          <tr><th>招募對象</th>${col((p) => escapeHtml(p.eligibility || "—"))}</tr>
          <tr><th>任務內容</th>${col((p) => (p.tasks || []).length ? `<ul>${p.tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : "—")}</tr>
          <tr><th>大使福利</th>${col((p) => (p.benefits || []).length ? `<ul>${p.benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : "—")}</tr>
          <tr><th>學長姐推薦</th>${col((_p, i) => ratings[i] ? `<span class="stars">★</span> ${ratings[i]} / 5` : "尚無心得")}</tr>
          <tr><th>報名</th>${col((p) => `<a class="btn sm" href="${p.applyUrl}" target="_blank" rel="noopener">前往報名 ↗</a>`)}</tr>
        </table>
      </div>`;
    document.getElementById("cmpMask").classList.add("open");
    document.getElementById("cmpClose").onclick = closeCompare;
  }
  function closeCompare() { document.getElementById("cmpMask").classList.remove("open"); }
  document.getElementById("cmpMask").onclick = (e) => { if (e.target.id === "cmpMask") closeCompare(); };

  // ---------- 收藏 ----------
  async function handleFav(id) {
    // 雲端模式但沒登入 → 引導登入
    if (window.DB.configured && !window.DB.getUser()) {
      openAuth("login", "登入後就能收藏計畫囉！");
      return;
    }
    const on = await window.DB.toggleFavorite(id);
    if (on) favSet.add(id);
    else favSet.delete(id);
    // 更新畫面上的按鈕（卡片＋modal）
    document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
      b.classList.toggle("on", on);
      b.textContent = on ? "♥" : "♡";
    });
    const mf = document.getElementById("modalFav");
    if (mf && mf.dataset.id === id) mf.textContent = on ? "♥ 已收藏" : "♡ 收藏";
    toast(on ? "已加入收藏 ♥" : "已移除收藏");
  }

  // ---------- 詳情 modal ----------
  function openModal(id) {
    const p = livePrograms.find((x) => x.id === id);
    if (!p) return;
    const body = document.getElementById("modalBody");
    const paidTag = p.paid
      ? '<span class="tag paid">有薪</span>'
      : '<span class="tag unpaid">無薪</span>';
    body.innerHTML = `
      <button class="modal-close" id="modalClose">✕</button>
      <div class="modal-more">${moreMenuHTML(p)}</div>
      <div class="modal-emoji">${p.emoji}</div>
      <h2>${p.title}</h2>
      <div class="m-brand">${p.brand}</div>
      <div class="m-tags">${paidTag}<span class="tag">${p.category}</span><span class="tag">${p.location}</span></div>
      <p style="color:var(--ink-soft);font-size:15.5px;">${p.summary}</p>
      ${p.recruiting === false
        ? `<div class="recruit-banner closed">🔴 ${p.recruitNote || "本梯報名已截止"}</div>`
        : (p.recruitNote ? `<div class="recruit-banner open">🟢 ${p.recruitNote}</div>` : "")}

      <div class="meta-grid">
        <div class="m"><span>招募對象</span><b>${p.eligibility || "—"}</b></div>
        <div class="m"><span>任期</span><b>${p.term || "—"}</b></div>
        <div class="m"><span>地區</span><b>${p.location || "—"}</b></div>
        <div class="m"><span>報名狀態</span><b>${p.recruiting === false ? (p.deadline ? "已截止 " + p.deadline : "見官方公告") : (p.deadline || "隨到隨審")}</b></div>
      </div>

      <h4>任務內容</h4>
      <ul>${(p.tasks || []).map((t) => `<li>${t}</li>`).join("")}</ul>

      <h4>大使福利</h4>
      <div class="benefit-pills">${(p.benefits || []).length ? p.benefits.map((b) => `<span>${b}</span>`).join("") : '<span style="background:var(--accent-soft);color:var(--ink-soft);">詳見官方頁</span>'}</div>

      <div class="modal-actions">
        <a href="${p.applyUrl}" target="_blank" rel="noopener" class="btn">${p.recruiting === false ? "查看官方頁 ↗" : "前往報名 ↗"}</a>
        <button class="btn ghost" id="modalFav" data-fav="${p.id}" data-id="${p.id}">${favSet.has(p.id) ? "♥ 已收藏" : "♡ 收藏"}</button>
      </div>
      ${p.sourceUrl ? `<div class="source-line">資料來源：<a href="${p.sourceUrl}" target="_blank" rel="noopener">官方頁面 ↗</a>　·　查證日 2026-07-20</div>` : ""}

      <div class="reviews-block">
        <div class="reviews-head">
          <h4>學長姐怎麼說</h4>
          <button class="btn ghost sm" id="shareExpBtn">＋ 分享我的經驗</button>
        </div>
        <div class="rev-tabs" id="revViewTabs">
          <button class="rev-tab active" data-rv="interview">面試經驗</button>
          <button class="rev-tab" data-rv="experience">參與心得</button>
          ${(window.DCARD_LINKS && window.DCARD_LINKS[p.id] && window.DCARD_LINKS[p.id].length) ? '<button class="rev-tab" data-rv="dcard">💬 Dcard 討論</button>' : ""}
        </div>
        <div id="revList"><div class="rev-empty">載入中…</div></div>
      </div>`;

    document.getElementById("modalMask").classList.add("open");
    document.getElementById("modalClose").onclick = closeModal;
    document.getElementById("modalFav").onclick = () => handleFav(p.id);
    document.getElementById("shareExpBtn").onclick = () => openReview(p);
    bindMoreMenus(body);

    // 載入該計畫的心得
    loadProgramReviews(p);
  }

  // ---------- 學長姐怎麼說 ----------
  let reviewViewType = "interview";
  let reviewAccounts = {};
  async function loadProgramReviews(p) {
    let reviews = [];
    try { reviews = await window.DB.getReviews(p.id); } catch { reviews = []; }
    try { reviewAccounts = await window.DB.getAccountsMap(reviews.map((r) => r.user_id)); } catch { reviewAccounts = {}; }
    const tabs = document.getElementById("revViewTabs");
    if (!tabs) return; // modal 已關
    tabs.querySelectorAll(".rev-tab").forEach((t) => {
      t.onclick = () => {
        reviewViewType = t.dataset.rv;
        tabs.querySelectorAll(".rev-tab").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        renderReviewList(reviews, p);
      };
    });
    renderReviewList(reviews, p);
  }
  function renderReviewList(reviews, p) {
    const box = document.getElementById("revList");
    if (!box) return;
    // Dcard 討論分頁：外連整理，非站內心得
    if (reviewViewType === "dcard") {
      const links = (window.DCARD_LINKS && window.DCARD_LINKS[p.id]) || [];
      box.innerHTML =
        links.map((l) =>
          `<a class="dcard-rev" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
             <span class="dcard-rev-badge">Dcard</span>
             <span class="dcard-rev-title">${escapeHtml(l.title)}</span>
             <span class="dcard-rev-go">看全文 →</span>
           </a>`).join("") +
        `<div class="dcard-rev-note">以上為 Dcard 公開文章連結，內容版權屬原作者。</div>`;
      return;
    }
    const list = reviews.filter((r) => r.type === reviewViewType);
    if (!list.length) {
      box.innerHTML = `<div class="rev-empty">還沒有${reviewViewType === "interview" ? "面試經驗" : "參與心得"}，當第一個分享的人吧 👋</div>`;
      return;
    }
    box.innerHTML = list.map((r) => reviewItemHTML(r, p)).join("");
  }
  function reviewItemHTML(r, p) {
    // 品牌名常已含「大使/校園大使」，去掉尾綴避免疊字（JLab 校園大使 → 前 JLab 大使）
    const shortBrand = (p.brand || "").replace(/\s*(校園)?大使\s*$/, "").trim();
    const acc = reviewAccounts[r.user_id];
    const who = r.anonymous ? `前 ${shortBrand} 大使` : (acc?.nickname || "校園大使");
    const avatar = (!r.anonymous && acc?.avatar_url)
      ? `<img src="${escapeHtml(acc.avatar_url)}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;" />`
      : "👤";
    const stars = "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0));
    const rows = r.type === "interview"
      ? [["面試流程", r.process], ["被問了什麼", r.questions], ["準備建議", r.tips], ["結果", r.result]]
      : [["任務量", r.workload], ["收穫", r.gains], ["建議", r.advice]];
    const body = rows.filter(([, v]) => v).map(([k, v]) =>
      `<div class="rev-q">${k}</div><div class="rev-a">${escapeHtml(v)}</div>`).join("");
    return `<div class="rev-item">
      <div class="rev-who">${avatar} ${escapeHtml(who)} <span class="stars">${stars}</span></div>
      ${body}
      ${r.extra ? `<div class="rev-q">補充</div><div class="rev-a">${escapeHtml(r.extra)}</div>` : ""}
    </div>`;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  // ---------- 分享經驗 Modal ----------
  let reviewFormType = "interview";
  let reviewTargetProgram = null;
  function openReview(p) {
    // 雲端模式需登入
    if (window.DB.configured && !window.DB.getUser()) {
      openAuth("login", "登入後就能分享你的經驗給學弟妹！");
      return;
    }
    reviewTargetProgram = p;
    document.getElementById("reviewFor").textContent = `${p.title}（${p.brand}）`;
    document.getElementById("reviewErr").textContent = "";
    document.getElementById("reviewForm").reset();
    setReviewFormType("interview");
    document.getElementById("reviewMask").classList.add("open");
  }
  function closeReview() { document.getElementById("reviewMask").classList.remove("open"); }
  function setReviewFormType(type) {
    reviewFormType = type;
    document.querySelectorAll("#revTypeTabs .rev-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.type === type));
    document.getElementById("revInterview").style.display = type === "interview" ? "" : "none";
    document.getElementById("revExperience").style.display = type === "experience" ? "" : "none";
  }
  document.querySelectorAll("#revTypeTabs .rev-tab").forEach((t) => {
    t.onclick = () => setReviewFormType(t.dataset.type);
  });
  // 推薦度星星選擇
  let pickedRating = 5;
  (function initRating() {
    const box = document.getElementById("ratingPick");
    box.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rev-tab" + (i <= pickedRating ? " active" : "");
      b.textContent = "★"; b.dataset.star = i;
      b.onclick = () => {
        pickedRating = i;
        box.querySelectorAll(".rev-tab").forEach((x) =>
          x.classList.toggle("active", +x.dataset.star <= i));
      };
      box.appendChild(b);
    }
  })();
  document.getElementById("reviewClose").onclick = closeReview;
  document.getElementById("reviewMask").onclick = (e) => { if (e.target.id === "reviewMask") closeReview(); };
  document.getElementById("reviewForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const errEl = document.getElementById("reviewErr");
    const btn = document.getElementById("reviewSubmit");
    errEl.textContent = "";
    const form = {
      program_id: reviewTargetProgram.id,
      type: reviewFormType,
      rating: pickedRating,
      anonymous: f.anonymous.checked,
      process: f.process.value.trim(), questions: f.questions.value.trim(),
      tips: f.tips.value.trim(), result: f.result.value,
      workload: f.workload.value.trim(), gains: f.gains.value.trim(), advice: f.advice.value.trim(),
      extra: f.extra.value.trim(),
    };
    // 至少填一欄
    const hasContent = form.type === "interview"
      ? (form.process || form.questions || form.tips)
      : (form.workload || form.gains || form.advice);
    if (!hasContent) { errEl.textContent = "至少填一個欄位再送出喔"; return; }
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await window.DB.submitReview(form);
      closeReview();
      toast("感謝分享！審核通過後就會顯示 🙌");
    } catch (err) {
      errEl.textContent = err.message || "送出失敗，請稍後再試";
    } finally {
      btn.disabled = false; btn.textContent = "送出（審核後上架）";
    }
  };
  function closeModal() {
    document.getElementById("modalMask").classList.remove("open");
  }
  document.getElementById("modalMask").onclick = (e) => {
    if (e.target.id === "modalMask") closeModal();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(); closeAuth(); closeReview(); closeCompare();
      document.getElementById("noteMask").classList.remove("open");
      document.getElementById("editMask").classList.remove("open");
    }
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- Auth Modal ----------
  let authMode = "login";
  const authMask = document.getElementById("authMask");
  function openAuth(mode = "login", note = "") {
    if (!window.DB.configured) {
      toast("會員系統需要先設定 Supabase（見 config.js）🔑");
      return;
    }
    setAuthMode(mode);
    document.getElementById("authErr").textContent = "";
    document.getElementById("authNote").textContent = note;
    authMask.classList.add("open");
  }
  function closeAuth() { authMask.classList.remove("open"); }
  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll(".auth-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.mode === mode));
    document.getElementById("authTitle").textContent = mode === "login" ? "歡迎回來" : "建立帳號";
    document.getElementById("authSub").textContent =
      mode === "login" ? "登入後可收藏計畫、分享心得。" : "註冊後即可收藏你有興趣的計畫。";
    document.getElementById("authSubmit").textContent = mode === "login" ? "登入" : "註冊";
  }
  document.querySelectorAll(".auth-tab").forEach((t) => {
    t.onclick = () => { setAuthMode(t.dataset.mode); document.getElementById("authErr").textContent = ""; };
  });
  document.getElementById("authClose").onclick = closeAuth;
  authMask.onclick = (e) => { if (e.target.id === "authMask") closeAuth(); };
  document.getElementById("googleBtn").onclick = async () => {
    try { await window.DB.signInWithGoogle(); }
    catch (err) { document.getElementById("authErr").textContent = err.message || "Google 登入失敗"; }
  };

  document.getElementById("authForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const pw = document.getElementById("authPassword").value;
    const errEl = document.getElementById("authErr");
    const submitBtn = document.getElementById("authSubmit");
    errEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "處理中…";
    try {
      if (authMode === "signup") {
        const res = await window.DB.signUp(email, pw);
        if (!res.session) {
          // 需 email 驗證的情況
          toast("註冊成功！請到信箱收驗證信後再登入 ✉️");
          setAuthMode("login");
        } else {
          toast("註冊成功，已自動登入 🎉");
          closeAuth();
        }
      } else {
        await window.DB.signIn(email, pw);
        toast("登入成功 👋");
        closeAuth();
      }
    } catch (err) {
      errEl.textContent = friendlyAuthError(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === "login" ? "登入" : "註冊";
    }
  };
  function friendlyAuthError(err) {
    const m = (err && err.message) || "發生錯誤";
    if (/invalid login/i.test(m)) return "Email 或密碼錯誤";
    if (/already registered|already exists/i.test(m)) return "這個 Email 已經註冊過了，直接登入吧";
    if (/password/i.test(m)) return "密碼至少要 6 碼";
    return m;
  }

  // 登入狀態改變 → 重載收藏 + 重繪（右上角使用者選單由 authui.js 負責）
  async function refreshFavs() {
    try {
      favSet = new Set(await window.DB.getFavorites());
    } catch { favSet = new Set(); }
    render();
  }

  // ---------- 追蹤 IG band（新計畫通知）----------
  const IG_READY = false; // ⭐ IG 開通後把這行改成 true：按鈕自動變成可追蹤連結（讀 config.CONTACT_IG）
  (function initIgBand() {
    const box = document.getElementById("followCta");
    if (!box) return;
    const ig = (window.DB.cfg || {}).CONTACT_IG;
    if (IG_READY && ig) {
      box.innerHTML = `<a href="${ig}" target="_blank" rel="noopener" class="btn">追蹤 UniEmbassy IG →</a>`;
    }
  })();

  // ---------- 登入按鈕 ----------
  document.getElementById("loginBtn").onclick = (e) => {
    e.preventDefault();
    openAuth("login");
  };

  // ---------- 補充 / 回報 Modal ----------
  const noteMask = document.getElementById("noteMask");
  let noteTargetId = null;
  function openNote(id) {
    // 需登入（雲端模式）
    if (window.DB.configured && !window.DB.getUser()) {
      openAuth("login", "登入後就能回報 / 補充計畫資訊！");
      return;
    }
    const p = livePrograms.find((x) => x.id === id);
    noteTargetId = id;
    document.getElementById("noteFor").textContent = p ? `${p.title}（${p.brand}）` : "";
    document.getElementById("noteErr").textContent = "";
    document.getElementById("noteForm").reset();
    noteMask.classList.add("open");
  }
  function closeNote() { noteMask.classList.remove("open"); }
  document.getElementById("noteClose").onclick = closeNote;
  noteMask.onclick = (e) => { if (e.target.id === "noteMask") closeNote(); };
  document.getElementById("noteForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = document.getElementById("noteSubmit");
    const errEl = document.getElementById("noteErr");
    errEl.textContent = "";
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await window.DB.submitProgramNote(noteTargetId, f.type.value, f.content.value.trim());
      closeNote();
      toast("已送出，感謝回報！我們會盡快確認 🙌");
    } catch (err) {
      errEl.textContent = err.message || "送出失敗，請稍後再試";
    } finally {
      btn.disabled = false; btn.textContent = "送出回報";
    }
  };

  // ---------- 管理員：編輯計畫 Modal ----------
  const editMask = document.getElementById("editMask");
  let editTargetId = null;
  // 分類下拉
  (function fillEditCat() {
    const sel = document.getElementById("editCat");
    if (!sel) return;
    (window.CATEGORIES || []).filter((c) => c !== "全部").forEach((c) => {
      const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
    });
  })();
  function openEdit(id) {
    const p = livePrograms.find((x) => x.id === id);
    if (!p) return;
    editTargetId = id;
    const f = document.getElementById("editForm");
    f.brand.value = p.brand || "";
    f.emoji.value = p.emoji || "";
    f.title.value = p.title || "";
    f.category.value = p.category || "";
    f.location.value = p.location || "";
    f.summary.value = p.summary || "";
    f.tasks.value = (p.tasks || []).join("\n");
    f.benefits.value = (p.benefits || []).join("\n");
    f.eligibility.value = p.eligibility || "";
    f.term.value = p.term || "";
    f.deadline.value = p.deadline || "";
    f.paid.checked = !!p.paid;
    f.recruiting.checked = p.recruiting !== false;
    f.recruitNote.value = p.recruitNote || "";
    f.applyUrl.value = p.applyUrl || "";
    f.sourceUrl.value = p.sourceUrl || "";
    document.getElementById("editErr").textContent = "";
    editMask.classList.add("open");
  }
  function closeEdit() { editMask.classList.remove("open"); }
  document.getElementById("editClose").onclick = closeEdit;
  editMask.onclick = (e) => { if (e.target.id === "editMask") closeEdit(); };
  document.getElementById("editForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = document.getElementById("editSubmit");
    const errEl = document.getElementById("editErr");
    errEl.textContent = "";
    btn.disabled = true; btn.textContent = "儲存中…";
    const lines = (v) => v.split("\n").map((x) => x.trim()).filter(Boolean);
    try {
      await window.DB.updateProgram(editTargetId, {
        brand: f.brand.value.trim(), emoji: f.emoji.value.trim() || "📌", category: f.category.value,
        title: f.title.value.trim(), summary: f.summary.value.trim(),
        tasks: lines(f.tasks.value), benefits: lines(f.benefits.value),
        eligibility: f.eligibility.value.trim(), term: f.term.value.trim(),
        paid: f.paid.checked, location: f.location.value.trim(),
        deadline: f.deadline.value || null, recruiting: f.recruiting.checked,
        recruitNote: f.recruitNote.value.trim(), applyUrl: f.applyUrl.value.trim(), sourceUrl: f.sourceUrl.value.trim(),
      });
      closeEdit();
      toast("計畫已更新 ✓");
      await reloadPrograms(editTargetId);
    } catch (err) {
      errEl.textContent = err.message || "儲存失敗";
    } finally {
      btn.disabled = false; btn.textContent = "儲存變更";
    }
  };

  // 管理員快捷：切換招募狀態
  async function toggleRecruiting(id) {
    const p = livePrograms.find((x) => x.id === id);
    if (!p) return;
    const next = p.recruiting === false; // 目前已截止→改招募中；反之亦然
    try {
      await window.DB.setRecruiting(id, next);
      toast(next ? "已標為 🟢 招募中" : "已標為 🔴 已截止");
      await reloadPrograms(id);
    } catch (err) { toast(err.message || "操作失敗"); }
  }

  // 重新載入計畫並重繪；若該計畫詳情正開著就刷新
  async function reloadPrograms(refreshId) {
    try { livePrograms = await window.DB.getPrograms(); } catch {}
    document.getElementById("statCount").textContent = livePrograms.length;
    document.getElementById("statPaid").textContent = livePrograms.filter((p) => p.paid).length;
    render();
    if (refreshId && document.getElementById("modalMask").classList.contains("open")) {
      openModal(refreshId);
    }
  }
  // 供 admin 深連結：index.html?p=id&edit=1（管理員看完回報一鍵編輯）
  window.__openEditFromDeepLink = (id) => openEdit(id);

  // ---------- 「我是廠商」下拉選單 ----------
  (function initVendorDd() {
    const dd = document.getElementById("vendorDd");
    const trigger = document.getElementById("vendorTrigger");
    if (!dd || !trigger) return;
    trigger.onclick = (e) => { e.stopPropagation(); dd.classList.toggle("open"); };
    document.addEventListener("click", () => dd.classList.remove("open"));
  })();

  // ---------- 聯絡我們（footer 連結）----------
  (function initContact() {
    const cfg = window.DB.cfg || {};
    const ig = document.getElementById("footIg");
    const mail = document.getElementById("footMail");
    if (ig) { if (cfg.CONTACT_IG) ig.href = cfg.CONTACT_IG; else ig.style.display = "none"; }
    if (mail) {
      if (cfg.CONTACT_EMAIL) mail.href = "mailto:" + cfg.CONTACT_EMAIL + "?subject=UniEmbassy%20聯絡";
      else mail.style.display = "none";
    }
  })();

  // ---------- 事件 ----------
  paidOnly.onchange = render;
  recruitingOnly.onchange = render;
  searchInput.oninput = render;

  // ---------- 啟動 ----------
  async function boot() {
    // 載入計畫
    try {
      livePrograms = await window.DB.getPrograms();
    } catch (err) {
      console.error(err);
      toast("計畫載入失敗，改用本機資料");
      livePrograms = (window.PROGRAMS || []).filter((p) => p.status === "live");
    }
    document.getElementById("statCount").textContent = livePrograms.length;
    document.getElementById("statPaid").textContent = livePrograms.filter((p) => p.paid).length;

    // 從會員頁「看詳情」帶 ?p=id 進來 → 自動開該計畫詳情
    // admin 深連結 ?p=id&edit=1（後台看完回報一鍵編輯）
    const params = new URLSearchParams(location.search);
    const wantP = params.get("p");
    if (wantP && livePrograms.some((x) => x.id === wantP)) {
      const wantEdit = params.get("edit") === "1";
      setTimeout(() => {
        if (wantEdit && window.DB.isAdmin && window.DB.isAdmin()) openEdit(wantP);
        else openModal(wantP);
      }, 400);
    }

    // Auth：狀態變化時重載收藏（nav 由 authui.js 處理）
    window.DB.onAuth(() => { refreshFavs(); });
    await window.DB.initAuth();

    // 若本機模式，onAuth 已用 null 觸發一次 refreshFavs；確保至少 render 一次
    if (!window.DB.configured) await refreshFavs();
  }

  boot();
})();
