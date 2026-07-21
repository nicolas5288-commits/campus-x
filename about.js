// 關於校園大使頁 — 頁尾聯絡圖示 + 撈精選心得當社會證明（有才顯示，沒有整區隱藏）
(function () {
  const cfg = (window.DB && window.DB.cfg) || {};
  const ig = document.getElementById("footIg");
  const mail = document.getElementById("footMail");
  if (ig) { if (cfg.CONTACT_IG) ig.href = cfg.CONTACT_IG; else ig.style.display = "none"; }
  if (mail) {
    if (cfg.CONTACT_EMAIL) mail.href = "mailto:" + cfg.CONTACT_EMAIL + "?subject=UniEmbassy%20聯絡";
    else mail.style.display = "none";
  }
})();
(async function () {
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  // 從結構化欄位挑一句最有代表性的話當引言
  function pickQuote(r) {
    const cand = r.type === "interview"
      ? [r.tips, r.gains, r.process, r.questions]
      : [r.gains, r.advice, r.workload];
    const txt = (cand.find((v) => v && v.trim().length > 6) || r.extra || "").trim();
    return txt.length > 90 ? txt.slice(0, 88) + "…" : txt;
  }
  function shortBrand(b) { return String(b || "").replace(/\s*(校園)?大使\s*$/, "").trim(); }

  try {
    if (!window.DB || !window.DB.getFeaturedReviews) return;
    const reviews = await window.DB.getFeaturedReviews(3);
    const usable = (reviews || []).filter((r) => pickQuote(r));
    if (!usable.length) return; // 沒心得就維持隱藏

    const box = document.getElementById("voices");
    box.innerHTML = usable.map((r) => {
      const who = r.anonymous ? `前 ${shortBrand(r.brand) || "校園"} 大使` : "校園大使";
      const stars = "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0));
      return `<div class="voice sketch">
        <div class="quote">${escapeHtml(pickQuote(r))}</div>
        <div class="who">— ${escapeHtml(who)}　<span class="stars">${stars}</span></div>
      </div>`;
    }).join("");
    document.getElementById("voicesSec").style.display = "";
  } catch (e) {
    console.error("[about] featured reviews failed:", e);
    // 失敗就維持隱藏，不影響整頁
  }
})();
