// 品牌雷達 — 往年開過校園大使、目前不在招募期的品牌（靜態清單，不進 DB）
// 原則：只放查證過真實存在的品牌＋真連結；查不到確切招募季就標「招募季不定」，不編造報名連結/截止日。
// 之後某品牌真的開放招募 → 改走正式計畫（後台審核上架），再從這裡移除即可。
window.RADAR = [
  { brand: "104 人力銀行", emoji: "💼", category: "人力資源", season: "往年春季（約 3–4 月）", url: "https://www.104.com.tw/jobs/search/?keyword=%E6%A0%A1%E5%9C%92%E5%A4%A7%E4%BD%BF", note: "社群影音／品牌公關組，可遠端實習" },
  { brand: "文化總會", emoji: "🇹🇼", category: "政府／文化", season: "往年春夏（約 5–6 月）", url: "https://www.gacc.org.tw/TW/campus-ambassador", note: "文總校園大使，已辦至第五屆" },
  { brand: "KKBOX", emoji: "🎵", category: "音樂串流", season: "招募季不定", url: "https://www.instagram.com/p/DaPZbNXkls-/", note: "愛音樂、愛分享歌單的你，已辦至第 11 屆" },
  { brand: "敦煌書局", emoji: "📚", category: "圖書／教育", season: "招募季不定", url: "https://www.instagram.com/reel/DZePTWhjCQe/", note: "校園行銷、社群推廣，累積實戰經驗" },
  { brand: "Skyline", emoji: "✈️", category: "學生社群", season: "招募季不定", url: "https://skyline.tw/activity/12thambassador", note: "學生社群平台，已辦至第十二屆" },
  { brand: "臺灣企銀 Hokii", emoji: "🏦", category: "金融", season: "招募季不定", url: "https://bhuntr.com/tw/competitions/mg4lcrp3d1lug9ycph", note: "18 歲以上在學生，社群經營" },
  { brand: "CASETiFY", emoji: "📱", category: "消費品／3C 配件", season: "招募季不定", url: "https://www.dcard.tw/f/job/p/257407012", note: "手機殼品牌，公關品＋任務獎金（Dcard 有心得）" },
  { brand: "英業達 Inventec", emoji: "💻", category: "科技", season: "招募季不定", url: "https://www.dcard.tw/f/job/p/259028412", note: "科技業校園大使，活動＋職涯分享（Dcard 有心得）" },
  { brand: "傳說對決 Garena", emoji: "🎮", category: "遊戲", season: "招募季不定", url: "https://www.dcard.tw/f/job/p/260430401", note: "遊戲品牌校園大使（Dcard 有心得請益）" },
];

(function renderRadar() {
  var grid = document.getElementById("radarGrid");
  if (!grid || !window.RADAR) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  grid.innerHTML = window.RADAR.map(function (r) {
    return '<a class="radar-card" href="' + esc(r.url) + '" target="_blank" rel="noopener">' +
      '<div class="radar-top"><span class="radar-emoji">' + esc(r.emoji) + '</span>' +
      '<span class="radar-cat">' + esc(r.category) + '</span></div>' +
      '<div class="radar-brand">' + esc(r.brand) + '</div>' +
      '<div class="radar-season">🗓️ ' + esc(r.season) + '</div>' +
      '<div class="radar-note">' + esc(r.note) + '</div>' +
      '<div class="radar-more">看品牌資訊 →</div>' +
    '</a>';
  }).join("");
})();
