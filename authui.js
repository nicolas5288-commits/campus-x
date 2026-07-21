// 共用：右上角登入狀態（頭貼＋暱稱＋下拉選單）— 所有頁面載入
(function () {
  const DB = window.DB;
  if (!DB) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  let renderToken = 0;
  async function render(user) {
    const token = ++renderToken;
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;

    // 個人檔案（accounts）＝右上角身分來源，不用 Google 頭像
    let account = null;
    if (user) { try { account = await DB.getMyAccount(); } catch {} }
    // 若期間有更新的 render 進來，放棄這次（防並行造成重複頭貼）
    if (token !== renderToken) return;

    const old = document.getElementById("userMenu");
    if (old) old.remove();
    if (!user) { loginBtn.style.display = ""; return; }
    loginBtn.style.display = "none";

    const nickname = (account && account.nickname) || (user.email || "").split("@")[0] || "會員";
    const avatarHtml = (account && account.avatar_url)
      ? `<img src="${escapeHtml(account.avatar_url)}" class="um-img" alt="" />`
      : `<span class="um-emoji">${escapeHtml((nickname[0] || "?").toUpperCase())}</span>`;

    const menu = document.createElement("div");
    menu.id = "userMenu";
    menu.className = "user-menu";
    // 聯絡我們（IG / 信箱，SVG logo；config 沒填就不顯示）
    const cfg = DB.cfg || {};
    const igSvg = '<svg class="um-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>';
    const mailSvg = '<svg class="um-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M3.5 7 L12 13.5 L20.5 7"/></svg>';
    const contactHtml =
      (cfg.CONTACT_IG || cfg.CONTACT_EMAIL ? '<div class="um-sep"></div>' : "") +
      (cfg.CONTACT_IG ? `<a href="${escapeHtml(cfg.CONTACT_IG)}" target="_blank" rel="noopener">${igSvg} Instagram</a>` : "") +
      (cfg.CONTACT_EMAIL ? `<a href="mailto:${escapeHtml(cfg.CONTACT_EMAIL)}?subject=UniEmbassy%20聯絡">${mailSvg} 聯絡信箱</a>` : "");

    menu.innerHTML = `
      <button class="um-trigger" type="button">${avatarHtml}<span class="um-name">${escapeHtml(nickname)}</span><span class="um-caret">▾</span></button>
      <div class="um-dropdown">
        <a href="member.html">👤 個人檔案</a>
        <a href="member.html">⭐ 我的收藏</a>
        <a href="network.html">🪪 大使名片</a>
        <a href="share.html">🎉 產生分享卡</a>
        <a href="wish.html">🪄 許願池</a>
        ${DB.isAdmin && DB.isAdmin() ? '<a href="admin.html">🛠️ 審核後台</a>' : ""}
        ${contactHtml}
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
