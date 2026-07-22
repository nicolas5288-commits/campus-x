// 會員頁 — 我的收藏
(function () {
  const DB = window.DB;
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  let allPrograms = [];

  function cardHTML(p) {
    const paidTag = p.paid ? '<span class="tag paid">有薪</span>' : '<span class="tag unpaid">無薪</span>';
    const statusSpan = p.recruiting === false
      ? `<span class="deadline closed">${p.deadline ? "本梯已截止" : "招募時間見官方"}</span>`
      : `<span class="deadline">${p.deadline ? p.deadline + " 截止" : "隨到隨審"}</span>`;
    return `<div class="card" data-id="${p.id}">
      <div class="card-top">
        <div class="card-emoji">${p.emoji || "📌"}</div>
        <button class="fav-btn on" data-unfav="${p.id}" title="取消收藏">♥</button>
      </div>
      <div><h3>${esc(p.title)}</h3><div class="brand">${esc(p.brand)}</div></div>
      <div class="desc">${esc(p.summary || "")}</div>
      <div class="tags">${paidTag}<span class="tag">${esc(p.category)}</span><span class="tag">${esc(p.location)}</span></div>
      <div class="card-foot">
        ${statusSpan}
        <a class="btn ghost sm" href="index.html?p=${encodeURIComponent(p.id)}">看詳情</a>
      </div>
    </div>`;
  }

  async function renderFavs() {
    const grid = document.getElementById("favGrid");
    const empty = document.getElementById("favEmpty");
    const countEl = document.getElementById("favCount");
    let favIds = [];
    try { favIds = await DB.getFavorites(); } catch { favIds = []; }
    const favs = allPrograms.filter((p) => favIds.includes(p.id));
    countEl.textContent = `共 ${favs.length} 個收藏`;
    if (!favs.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    grid.innerHTML = favs.map(cardHTML).join("");
    grid.querySelectorAll("[data-unfav]").forEach((b) => b.onclick = async (e) => {
      e.stopPropagation();
      await DB.toggleFavorite(b.dataset.unfav);
      toast("已移除收藏");
      renderFavs();
    });
  }

  function showLoggedIn(yes) {
    document.getElementById("memberWrap").style.display = yes ? "block" : "none";
    document.getElementById("needLogin").style.display = yes ? "none" : "block";
  }

  // ---------- 個人檔案 ----------
  let accPickedFile = null, accPreviewUrl = null;
  const accPreview = document.getElementById("accAvatarPreview");
  const accClear = document.getElementById("accAvatarClear");
  function toPreview(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const out = Math.min(400, side);
        const c = document.createElement("canvas"); c.width = out; c.height = out;
        c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, out, out);
        resolve(c.toDataURL("image/jpeg", 0.85)); URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }
  document.getElementById("accAvatarFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    accPickedFile = f; accPreviewUrl = await toPreview(f);
    accPreview.innerHTML = accPreviewUrl ? `<img src="${accPreviewUrl}" alt="" />` : "🙂";
    accClear.style.display = "";
  };
  accClear.onclick = () => {
    accPickedFile = null; accPreviewUrl = null;
    document.getElementById("accAvatarFile").value = "";
    accClear.style.display = "none";
    loadAccount();
  };
  async function loadAccount() {
    let acc = null;
    try { acc = await DB.getMyAccount(); } catch {}
    document.getElementById("accNickname").value = acc?.nickname || "";
    if (acc?.avatar_url) { accPreview.innerHTML = `<img src="${acc.avatar_url}" alt="" />`; accClear.style.display = ""; }
    else { accPreview.innerHTML = "🙂"; accClear.style.display = "none"; }
  }
  document.getElementById("accSave").onclick = async () => {
    const btn = document.getElementById("accSave");
    const nickname = document.getElementById("accNickname").value.trim();
    btn.disabled = true; btn.textContent = "儲存中…";
    try {
      const form = { nickname };
      if (accPickedFile) { btn.textContent = "上傳頭貼中…"; form.avatar_url = await DB.uploadAvatar(accPickedFile); }
      await DB.saveAccount(form);
      accPickedFile = null;
      toast("個人檔案已儲存 ✓");
      loadAccount();
    } catch (e) { toast(e.message || "儲存失敗"); }
    finally { btn.disabled = false; btn.textContent = "儲存個人檔案"; }
  };

  // ---------- 我的積分卡 ----------
  async function renderScore() {
    const card = document.getElementById("scoreCard");
    if (!card) return;
    let s = null;
    try { s = await DB.getMyScore(); } catch {}
    if (!s) { card.style.display = "none"; return; }
    const score = s.score || 0;
    const lv = window.levelOf ? window.levelOf(score) : { emoji: "🌱", name: "新生報到" };
    const nx = window.nextLevel ? window.nextLevel(score) : null;
    const pct = nx ? Math.min(100, Math.round((score / nx.min) * 100)) : 100;
    const nextTxt = nx ? `再 <b>${nx.min - score}</b> 分升上 ${nx.emoji} ${esc(nx.name)}` : "已達最高等級 🏆 外交大使";
    const chip = (label, n, unit) => n > 0 ? `<span>${label} <b>${n}</b>${unit}</span>` : "";
    const breaks = [
      chip("心得", s.reviews, " 篇"), chip("情報", s.notes, " 則"),
      chip("計畫", s.programs, " 筆"), chip("名片", s.profile, ""), chip("活動", s.events, " 場"),
    ].filter(Boolean).join("");
    card.innerHTML = `
      <div class="sc-top">
        <span class="sc-lv">${lv.emoji || "🌱"}</span>
        <div><div class="sc-lv-name">${esc(lv.name)}</div><div class="auth-sub" style="margin:0;font-size:13px;">你的貢獻等級</div></div>
        <div class="sc-score"><b>${score}</b><span>貢獻積分</span></div>
      </div>
      <div class="sc-bar"><i style="width:${pct}%;"></i></div>
      <div class="sc-next">${nextTxt}</div>
      ${breaks ? `<div class="sc-break">${breaks}</div>` : `<div class="sc-next" style="margin-top:14px;">還沒有積分——<a href="index.html">分享一篇心得</a>或<a href="network.html">建一張名片</a>就開始累積 👀</div>`}`;
    card.style.display = "block";
  }

  document.getElementById("loginCta").onclick = async () => {
    try { await DB.signInWithGoogle(); } catch (e) { toast(e.message || "登入失敗"); }
  };
  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  async function boot() {
    try { allPrograms = await DB.getPrograms(); } catch { allPrograms = []; }
    DB.onAuth((user) => {
      // 本機模式沒有真登入，直接顯示收藏（localStorage）
      const loggedIn = DB.configured ? !!user : true;
      showLoggedIn(loggedIn);
      if (loggedIn) { renderFavs(); loadAccount(); renderScore(); }
    });
    await DB.initAuth();
  }
  boot();
})();
