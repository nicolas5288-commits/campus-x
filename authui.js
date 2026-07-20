// 共用：右上角登入狀態（頭貼＋暱稱＋下拉選單）— 所有頁面載入
(function () {
  const DB = window.DB;
  if (!DB) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  async function render(user) {
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;
    const old = document.getElementById("userMenu");
    if (old) old.remove();
    if (!user) { loginBtn.style.display = ""; return; }
    loginBtn.style.display = "none";

    const meta = user.user_metadata || {};
    let nickname = meta.full_name || meta.name || (user.email || "").split("@")[0];
    let avatarHtml;
    let profile = null;
    try { profile = await DB.getMyProfile(); } catch {}
    if (profile) {
      nickname = profile.nickname || nickname;
      avatarHtml = `<span class="um-emoji">${escapeHtml(profile.avatar || "👤")}</span>`;
    } else if (meta.avatar_url || meta.picture) {
      avatarHtml = `<img src="${escapeHtml(meta.avatar_url || meta.picture)}" class="um-img" referrerpolicy="no-referrer" alt="" />`;
    } else {
      avatarHtml = `<span class="um-emoji">${escapeHtml((nickname[0] || "?").toUpperCase())}</span>`;
    }

    const menu = document.createElement("div");
    menu.id = "userMenu";
    menu.className = "user-menu";
    menu.innerHTML = `
      <button class="um-trigger" type="button">${avatarHtml}<span class="um-name">${escapeHtml(nickname)}</span><span class="um-caret">▾</span></button>
      <div class="um-dropdown">
        <a href="member.html">⭐ 我的收藏</a>
        <a href="network.html">🪪 大使名片</a>
        ${DB.isAdmin && DB.isAdmin() ? '<a href="admin.html">🛠️ 審核後台</a>' : ""}
        <button class="um-logout" type="button">登出</button>
      </div>`;
    loginBtn.parentNode.appendChild(menu);

    const dd = menu.querySelector(".um-dropdown");
    menu.querySelector(".um-trigger").onclick = (e) => { e.stopPropagation(); dd.classList.toggle("open"); };
    document.addEventListener("click", () => dd.classList.remove("open"));
    menu.querySelector(".um-logout").onclick = async () => { await DB.signOut(); };
  }

  DB.onAuth((u) => render(u));
})();
