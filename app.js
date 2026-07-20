// Campus X — 前台邏輯（Phase 2：改用 DB 資料層，支援雲端 / 本機雙模式）
(function () {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const catSelect = document.getElementById("catSelect");
  const paidOnly = document.getElementById("paidOnly");
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
    return livePrograms.filter((p) => {
      if (activeCat !== "全部" && p.category !== activeCat) return false;
      if (paidOnly.checked && !p.paid) return false;
      if (q) {
        const hay = (p.brand + p.title + p.summary + p.category).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ---------- 卡片 ----------
  function cardHTML(p) {
    const isFav = favSet.has(p.id);
    const dl = fmtDeadline(p.deadline);
    const paidTag = p.paid
      ? '<span class="tag paid">有薪</span>'
      : '<span class="tag unpaid">無薪</span>';
    return `
      <div class="card" data-id="${p.id}">
        <div class="card-top">
          <div class="card-emoji">${p.emoji}</div>
          <button class="fav-btn ${isFav ? "on" : ""}" data-fav="${p.id}" title="收藏">${isFav ? "♥" : "♡"}</button>
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
          <span class="deadline ${dl.soon ? "soon" : ""}">${dl.text}</span>
          <span class="btn ghost sm">看詳情</span>
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
        if (e.target.closest("[data-fav]")) return;
        openModal(el.dataset.id);
      };
    });
    grid.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        await handleFav(btn.dataset.fav);
      };
    });
  }

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
      <div class="modal-emoji">${p.emoji}</div>
      <h2>${p.title}</h2>
      <div class="m-brand">${p.brand}</div>
      <div class="m-tags">${paidTag}<span class="tag">${p.category}</span><span class="tag">${p.location}</span></div>
      <p style="color:var(--ink-soft);font-size:15.5px;">${p.summary}</p>

      <div class="meta-grid">
        <div class="m"><span>招募對象</span><b>${p.eligibility || "—"}</b></div>
        <div class="m"><span>任期</span><b>${p.term || "—"}</b></div>
        <div class="m"><span>地區</span><b>${p.location || "—"}</b></div>
        <div class="m"><span>報名截止</span><b>${p.deadline || "長期招募"}</b></div>
      </div>

      <h4>任務內容</h4>
      <ul>${(p.tasks || []).map((t) => `<li>${t}</li>`).join("")}</ul>

      <h4>大使福利</h4>
      <div class="benefit-pills">${(p.benefits || []).map((b) => `<span>${b}</span>`).join("")}</div>

      <div class="modal-actions">
        <a href="${p.applyUrl}" target="_blank" rel="noopener" class="btn">前往報名 ↗</a>
        <button class="btn ghost" id="modalFav" data-fav="${p.id}" data-id="${p.id}">${favSet.has(p.id) ? "♥ 已收藏" : "♡ 收藏"}</button>
      </div>

      <div class="reviews-block">
        <div class="reviews-head">
          <h4>學長姐怎麼說</h4>
          <button class="btn ghost sm" id="shareExpBtn">＋ 分享我的經驗</button>
        </div>
        <div class="rev-tabs" id="revViewTabs">
          <button class="rev-tab active" data-rv="interview">面試經驗</button>
          <button class="rev-tab" data-rv="experience">參與心得</button>
        </div>
        <div id="revList"><div class="rev-empty">載入中…</div></div>
      </div>`;

    document.getElementById("modalMask").classList.add("open");
    document.getElementById("modalClose").onclick = closeModal;
    document.getElementById("modalFav").onclick = () => handleFav(p.id);
    document.getElementById("shareExpBtn").onclick = () => openReview(p);

    // 載入該計畫的心得
    loadProgramReviews(p);
  }

  // ---------- 學長姐怎麼說 ----------
  let reviewViewType = "interview";
  async function loadProgramReviews(p) {
    let reviews = [];
    try { reviews = await window.DB.getReviews(p.id); } catch { reviews = []; }
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
    const who = r.anonymous ? `前 ${shortBrand} 大使` : (r.nickname || "校園大使");
    const stars = "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0));
    const rows = r.type === "interview"
      ? [["面試流程", r.process], ["被問了什麼", r.questions], ["準備建議", r.tips], ["結果", r.result]]
      : [["任務量", r.workload], ["收穫", r.gains], ["建議", r.advice]];
    const body = rows.filter(([, v]) => v).map(([k, v]) =>
      `<div class="rev-q">${k}</div><div class="rev-a">${escapeHtml(v)}</div>`).join("");
    return `<div class="rev-item">
      <div class="rev-who">👤 ${escapeHtml(who)} <span class="stars">${stars}</span></div>
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
    if (e.key === "Escape") { closeModal(); closeAuth(); closeReview(); }
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

  // ---------- Nav 使用者狀態 ----------
  function renderAuthState(user) {
    const loginBtn = document.getElementById("loginBtn");
    // 移除舊的 user chip
    const old = document.getElementById("userChip");
    if (old) old.remove();
    if (user) {
      loginBtn.style.display = "none";
      const initial = (user.email || "?")[0].toUpperCase();
      const chip = document.createElement("div");
      chip.id = "userChip";
      chip.className = "user-chip";
      chip.innerHTML = `<span class="avatar">${initial}</span><span>${user.email}</span><button class="logout" id="logoutBtn">登出</button>`;
      loginBtn.parentNode.appendChild(chip);
      document.getElementById("logoutBtn").onclick = async () => {
        await window.DB.signOut();
        toast("已登出");
      };
    } else {
      loginBtn.style.display = "";
    }
  }

  // 登入狀態改變 → 重載收藏 + 重繪
  async function refreshFavs() {
    try {
      favSet = new Set(await window.DB.getFavorites());
    } catch { favSet = new Set(); }
    render();
  }

  // ---------- 訂閱 ----------
  document.getElementById("subForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("subEmail").value.trim();
    document.getElementById("subEmail").value = "";
    try {
      const r = await window.DB.subscribe(email, []);
      if (r.local) toast(`已收到 ${email} 的訂閱！（Supabase 設定後即真實記錄）`);
      else toast(`訂閱成功！新計畫上架會通知 ${email} ✉️`);
    } catch (err) {
      toast("訂閱失敗：" + (err.message || "請稍後再試"));
    }
  };

  // ---------- 登入按鈕 ----------
  document.getElementById("loginBtn").onclick = (e) => {
    e.preventDefault();
    openAuth("login");
  };

  // ---------- 事件 ----------
  paidOnly.onchange = render;
  searchInput.oninput = render;

  // ---------- 啟動 ----------
  async function boot() {
    // 模式提示
    const badge = document.createElement("div");
    badge.className = "mode-badge";
    badge.textContent = window.DB.MODE === "supabase" ? "☁️ 雲端資料庫" : "🖥️ 本機展示模式";
    document.body.appendChild(badge);

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

    // Auth：狀態變化時更新 nav + 收藏
    window.DB.onAuth((user) => {
      renderAuthState(user);
      refreshFavs();
    });
    await window.DB.initAuth();

    // 若本機模式，onAuth 已用 null 觸發一次 refreshFavs；確保至少 render 一次
    if (!window.DB.configured) await refreshFavs();
  }

  boot();
})();
