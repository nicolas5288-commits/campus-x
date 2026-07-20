// 會員頁 — 我的收藏
(function () {
  const DB = window.DB;
  document.getElementById("modeBadge").textContent = DB.MODE === "supabase" ? "☁️ 雲端資料庫" : "🖥️ 本機展示模式";
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
    document.getElementById("favWrap").style.display = yes ? "block" : "none";
    document.getElementById("needLogin").style.display = yes ? "none" : "block";
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
      if (loggedIn) renderFavs();
    });
    await DB.initAuth();
  }
  boot();
})();
