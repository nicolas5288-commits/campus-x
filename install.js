// UniEmbassy PWA 安裝引導（全站共用）— 教使用者把網站裝到手機／筆電
(function () {
  // 註冊 service worker（可安裝的前提之一）
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // Chrome / Edge / Android 會丟這個事件，抓起來之後可一鍵安裝
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function showInstall() {
    // 已存在就不重複開
    if (document.getElementById("installMask")) return;
    let body;
    if (isStandalone()) {
      body = `<div class="ins-emoji">✅</div>
        <h2>已經裝好了！</h2>
        <p class="auth-sub">你正在用 App 模式開啟 UniEmbassy，畫面乾淨、開啟超快。</p>`;
    } else if (deferredPrompt) {
      body = `<div class="ins-emoji">📲</div>
        <h2>把 UniEmbassy 裝起來</h2>
        <p class="auth-sub">裝起來像真的 App：桌面／主畫面有圖示、全螢幕開啟、開啟秒速。</p>
        <button class="btn" id="insNow" style="width:100%;justify-content:center;margin-top:6px;">🚀 立即安裝</button>
        <p class="ins-hint">筆電（Chrome／Edge）：也可以點網址列右側的 <b>安裝圖示 ⊕</b> 安裝。</p>`;
    } else if (isIOS()) {
      body = `<div class="ins-emoji">📲</div>
        <h2>加到 iPhone 主畫面</h2>
        <p class="auth-sub">請用 <b>Safari</b> 開啟本站，照著做只要 3 步：</p>
        <ol class="ins-steps">
          <li>點畫面最下方的「<b>分享</b>」<span class="ins-ib">📤</span></li>
          <li>往下滑，選「<b>加入主畫面</b>」<span class="ins-ib">➕</span></li>
          <li>右上角按「<b>加入</b>」就完成！</li>
        </ol>`;
    } else {
      body = `<div class="ins-emoji">📲</div>
        <h2>裝到手機／筆電</h2>
        <p class="auth-sub">用瀏覽器開啟本站，就能像 App 一樣裝起來：</p>
        <ol class="ins-steps">
          <li><b>iPhone</b>：Safari →「分享 📤」→「加入主畫面」</li>
          <li><b>Android</b>：Chrome 右上「⋮」→「安裝應用程式／加到主畫面」</li>
          <li><b>筆電 Chrome／Edge</b>：網址列右側「安裝圖示 ⊕」→ 安裝</li>
          <li><b>Mac Safari</b>：選單列「檔案」→「加入程式塢…」</li>
        </ol>
        <div class="ins-url">${esc(location.origin + "/")}</div>`;
    }

    const mask = document.createElement("div");
    mask.className = "modal-mask open";
    mask.id = "installMask";
    mask.innerHTML = `<div class="modal" style="max-width:440px;text-align:center;">
      <button class="modal-close" id="insClose">✕</button>
      ${body}
    </div>`;
    document.body.appendChild(mask);

    const close = () => mask.remove();
    mask.onclick = (e) => { if (e.target === mask) close(); };
    document.getElementById("insClose").onclick = close;
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });
    const now = document.getElementById("insNow");
    if (now) now.onclick = async () => {
      close();
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
    };
  }

  // 對外：authui 下拉、其他地方可呼叫
  window.__uniInstall = showInstall;

  // 自動在頁尾放一個入口（有頁尾的頁面都會有，免登入可見；已安裝就不放）
  function wire() {
    document.querySelectorAll("[data-install]").forEach((el) => {
      el.onclick = (e) => { e.preventDefault(); showInstall(); };
    });
    if (isStandalone()) return;
    document.querySelectorAll("footer .foot-inner").forEach((fi) => {
      if (fi.querySelector(".foot-install")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "foot-install";
      b.textContent = "📲 安裝 App 到手機／筆電";
      b.onclick = showInstall;
      fi.insertBefore(b, fi.firstChild);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
