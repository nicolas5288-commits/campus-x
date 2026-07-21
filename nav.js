// 手機漢堡選單（全站共用）— 動態產生按鈕，不需改各頁 nav 結構
(function () {
  var inner = document.querySelector(".nav-inner");
  var links = document.querySelector(".nav-links");
  if (!inner || !links) return;

  var btn = document.createElement("button");
  btn.className = "nav-toggle";
  btn.type = "button";
  btn.setAttribute("aria-label", "選單");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    '<svg class="ico-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
    '<svg class="ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  inner.appendChild(btn);

  function close() {
    links.classList.remove("open");
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = links.classList.toggle("open");
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  // 點面板內的連結（含「我是廠商」下拉的子連結）就收起選單；點下拉觸發鈕不收
  links.addEventListener("click", function (e) {
    if (e.target.closest("a")) close();
  });
  // 點面板外收起
  document.addEventListener("click", function (e) {
    if (!links.contains(e.target) && !btn.contains(e.target)) close();
  });
})();
