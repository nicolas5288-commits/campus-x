// 分享卡生成器 — canvas 生圖，一鍵下載發 IG 限動
(function () {
  const DB = window.DB;
  const canvas = document.getElementById("cardCanvas");
  const ctx = canvas.getContext("2d");
  const W = 1080, H = 1920;
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }

  // 配色主題（accent 用在光暈＋品牌字＋頁尾）
  const THEMES = [
    { key: "blue", bg: "#0e1116", accent: "#6ED0EE", name: "天藍" },
    { key: "dark", bg: "#0a0a0a", accent: "#f5f5f5", name: "極簡黑" },
    { key: "orange", bg: "#1a1108", accent: "#FFB454", name: "暖橘" },
    { key: "purple", bg: "#140f1c", accent: "#B98CFF", name: "紫" },
    { key: "green", bg: "#0a1510", accent: "#5FE3A1", name: "綠" },
  ];
  const state = { type: "join", brand: "", cohort: "", name: "", theme: THEMES[0], avatarImg: null };

  // 各類型文案
  function copy() {
    const b = state.brand.trim() || "校園大使";
    const c = state.cohort.trim();
    switch (state.type) {
      case "grad": return { kicker: "🎓 圓滿結業", pre: "我完成了", big: b, post: (c ? c + " " : "") + "校園大使任期" };
      case "review": return { kicker: "✍️ 我在 Campus X", pre: "分享了", big: b, post: "大使心得，幫助學弟妹" };
      case "event": return { kicker: "🎪 我發起了活動", pre: "", big: b, post: "快來報名一起參加！" };
      default: return { kicker: "🎉 好消息", pre: "我正式成為", big: b, post: (c ? c + " " : "") + "校園大使" };
    }
  }

  const FONT = '"PingFang TC", "Noto Sans TC", -apple-system, sans-serif';
  function setFont(size, weight = "400") { ctx.font = `${weight} ${size}px ${FONT}`; }

  function draw() {
    const t = state.theme;
    // 背景
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);
    // 品牌色光暈（上方徑向）
    const g = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 780);
    g.addColorStop(0, hexA(t.accent, 0.28));
    g.addColorStop(1, hexA(t.accent, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";

    // 頂部 logo
    ctx.fillStyle = "#fff";
    setFont(46, "800");
    ctx.fillText("● Campus X", W / 2, 150);

    const c = copy();
    // 用文字中心對齊，間距依字體大小動態算，四種卡都有穩定呼吸感
    ctx.textBaseline = "middle";
    let y = 600;
    // kicker
    ctx.fillStyle = t.accent;
    setFont(50, "700");
    ctx.fillText(c.kicker, W / 2, y);
    y += 25 + 70; // kicker 半高 + gap
    // pre line（可能為空）
    if (c.pre) {
      setFont(72, "600");
      y += 36;
      ctx.fillStyle = "#e8e8e8";
      ctx.fillText(c.pre, W / 2, y);
      y += 36 + 40;
    }
    // big brand（過長自動縮字）
    let bigSize = 150;
    setFont(bigSize, "800");
    while (ctx.measureText(c.big).width > W - 140 && bigSize > 60) { bigSize -= 8; setFont(bigSize, "800"); }
    y += bigSize / 2;
    ctx.fillStyle = "#fff";
    ctx.fillText(c.big, W / 2, y);
    y += bigSize / 2 + 60;
    // post line（過長換行）
    setFont(60, "600");
    y += 30;
    ctx.fillStyle = "#e8e8e8";
    wrapText(c.post, W / 2, y, W - 160, 82);
    ctx.textBaseline = "alphabetic";

    // 頭像 + 名字（下方）
    const ay = 1500, ar = 90;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, ay, ar, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (state.avatarImg) {
      ctx.drawImage(state.avatarImg, W / 2 - ar, ay - ar, ar * 2, ar * 2);
    } else {
      ctx.fillStyle = t.accent;
      ctx.fillRect(W / 2 - ar, ay - ar, ar * 2, ar * 2);
      ctx.fillStyle = t.bg;
      setFont(90, "800");
      ctx.textBaseline = "middle";
      ctx.fillText((state.name.trim()[0] || "🎓").toUpperCase(), W / 2, ay + 4);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    // 頭像描邊
    ctx.strokeStyle = hexA("#ffffff", 0.25); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W / 2, ay, ar, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = "#fff";
    setFont(52, "700");
    ctx.fillText(state.name.trim() || "校園大使", W / 2, ay + ar + 80);

    // 頁尾
    ctx.fillStyle = hexA("#ffffff", 0.5);
    setFont(38, "500");
    ctx.fillText("在 Campus X 找校園大使機會 · campus-x", W / 2, H - 90);
  }

  function wrapText(text, x, y, maxW, lh) {
    const chars = text.split("");
    let line = "", yy = y;
    for (const ch of chars) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        ctx.fillText(line, x, yy); line = ch; yy += lh;
      } else line += ch;
    }
    if (line) ctx.fillText(line, x, yy);
  }
  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---- 配色選擇 ----
  const cp = document.getElementById("colorPicker");
  THEMES.forEach((th, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "color-opt" + (i === 0 ? " sel" : "");
    b.style.background = th.bg;
    b.innerHTML = `<span style="background:${th.accent}"></span>`;
    b.title = th.name;
    b.onclick = () => { state.theme = th; cp.querySelectorAll(".color-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); draw(); };
    cp.appendChild(b);
  });

  // ---- 表單事件 ----
  const typeSel = document.getElementById("cardType");
  const brandLabel = document.getElementById("brandLabel");
  const cohortField = document.getElementById("cohortField");
  typeSel.onchange = () => {
    state.type = typeSel.value;
    brandLabel.textContent = state.type === "event" ? "活動名稱" : "品牌 / 計畫名稱";
    cohortField.style.display = (state.type === "review" || state.type === "event") ? "none" : "";
    draw();
  };
  document.getElementById("brandInput").oninput = (e) => { state.brand = e.target.value; draw(); };
  document.getElementById("cohortInput").oninput = (e) => { state.cohort = e.target.value; draw(); };
  document.getElementById("nameInput").oninput = (e) => { state.name = e.target.value; draw(); };

  // ---- 下載 ----
  document.getElementById("downloadBtn").onclick = () => {
    canvas.toBlob((blob) => {
      if (!blob) { toast("產生失敗，請再試一次"); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "campus-x-分享卡.png";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("已下載！去 IG 發限動吧 🎉");
    }, "image/png");
  };

  // ---- 啟動：帶入個人檔案暱稱＋頭貼 ----
  async function boot() {
    draw();
    try {
      const acc = await DB.getMyAccount();
      if (acc) {
        if (acc.nickname) { state.name = acc.nickname; document.getElementById("nameInput").value = acc.nickname; }
        if (acc.avatar_url) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => { state.avatarImg = img; draw(); };
          img.src = acc.avatar_url;
        }
        draw();
      }
    } catch {}
    document.getElementById("loginBtn").onclick = async (e) => {
      e.preventDefault();
      if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
      try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
    };
    if (DB.initAuth) { DB.onAuth(() => {}); await DB.initAuth(); }
  }
  boot();
})();
