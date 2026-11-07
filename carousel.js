// IG 輪播素材產生器（v51）
// 廠商投稿進後台 → 自動排出 IG 輪播圖（canvas 1080×1350 PNG，IG 4:5）＋貼文文案（模板套字）
// 視覺沿用 2026-08-29 開站輪播：奶油底、四角粉彩圓、手繪雙框、黃色螢光筆
//
// 用法（admin.html）：
//   const canvases = await Carousel.render(program)  → 3–5 張（沒填任務／福利就少那一張）
//   const blobs    = await Carousel.toBlobs(canvases)
//   const text     = Carousel.caption(program)        → IG 貼文文案
// program 用 db.js normalizeRow 的欄位：brand, emoji, category, title, summary, tasks[], benefits[],
//   eligibility, term, paid, location, deadline, applyUrl, slug, id
(function () {
  const W = 1080, H = 1350;
  const C = {
    cream: "#FAF7EE", ink: "#1A1A1A", gray: "#555049", gold: "#A8842C",
    yellow: "#F5C842", ys: "#FBEBB9", ps: "#F8D7DC", bs: "#CFE4F0", gs: "#D9EBD3",
    paper: "#FFFDF6", mute: "#B7AF9F", foot: "#8B8578", sep: "#C9C2B4", pagerOff: "#DDD5C4",
  };
  const PASTELS = [C.ys, C.bs, C.ps, C.gs];
  const SITE = "uniembassy.tw";
  const IG = "@uniembassy.tw";
  const CONTENT_W = 816;               // 框內可用寬（左右各留 132）
  const ZONE_TOP = 214, ZONE_BOT = 1132; // 標頭與頁尾之間的內容區

  // ---------- 字型：Mac 用系統 PingFang（跟開站輪播一致）；其他電腦載 Noto Sans TC，夥伴用 Windows 排出來也一樣 ----------
  let FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  let usingNoto = null;
  function hasFont(name) {
    const c = document.createElement("canvas").getContext("2d");
    const s = "mmmmwwwwiiiilll UniEmbassy 0123";
    c.font = "72px monospace"; const a = c.measureText(s).width;
    c.font = `72px "${name}", monospace`; const b = c.measureText(s).width;
    return a !== b;
  }
  function loadNotoCss() {
    return new Promise((resolve) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700;800&display=swap";
      l.onload = resolve; l.onerror = resolve;
      document.head.appendChild(l);
      setTimeout(resolve, 4000); // 字型站連不上也別卡住，退回系統字
    });
  }
  async function ensureFont(text) {
    if (usingNoto === null) {
      usingNoto = !hasFont("PingFang TC");
      if (usingNoto) {
        FONT = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';
        await loadNotoCss();
      }
    }
    if (!usingNoto || !document.fonts) return;
    // Google Fonts 的中文字是切片載入，要把這次會用到的字一起丟進去
    try { await Promise.all(["500", "700", "800"].map((w) => document.fonts.load(`${w} 40px "Noto Sans TC"`, text))); }
    catch (e) { /* 載不到就用系統字 */ }
  }

  // ---------- 小工具 ----------
  const rad = (deg) => (deg * Math.PI) / 180;
  function setFont(ctx, size, weight) { ctx.font = `${weight} ${Math.round(size)}px ${FONT}`; }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

  // 中英混排斷行：中文一字一單位、英文單字不拆；標點不放行首；超出行數補「…」
  const NO_LINE_START = /^[，。、！？；：」』）)\]】〉》,.!?;:…%]/;
  function tokenize(text) { return String(text).match(/[A-Za-z0-9@#&'’._\-\/:+%]+\s*|\s+|[\s\S]/gu) || []; }
  function wrap(ctx, text, maxW, maxLines) {
    const lines = []; let cur = "";
    const push = () => { if (cur.trim()) lines.push(cur.trim()); cur = ""; };
    for (let tok of tokenize(String(text || "").replace(/\s*\n\s*/g, " "))) {
      if (!cur && !tok.trim()) continue;
      if (ctx.measureText((cur + tok).trimEnd()).width <= maxW) { cur += tok; continue; }
      if (cur && NO_LINE_START.test(tok)) { cur += tok; continue; }
      if (ctx.measureText(tok.trim()).width > maxW) { // 超長英文（網址之類）逐字拆
        for (const ch of tok) {
          if (ctx.measureText(cur + ch).width > maxW && cur) push();
          cur += ch;
        }
        continue;
      }
      push(); cur = tok.trimStart();
    }
    push();
    if (maxLines && lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      kept[maxLines - 1] = last + "…";
      return kept;
    }
    return lines;
  }
  // 由大往小試字級，直到行數與寬度都塞得下
  function fit(ctx, text, maxW, maxLines, from, to, weight) {
    for (let s = from; s >= to; s -= 4) {
      setFont(ctx, s, weight);
      const lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines) return { size: s, lines };
    }
    setFont(ctx, to, weight);
    return { size: to, lines: wrap(ctx, text, maxW, maxLines) };
  }
  // 黃色螢光筆底線（畫在字後面）
  function highlight(ctx, cx, baseline, w, size, color) {
    ctx.save();
    ctx.translate(cx, baseline);
    ctx.rotate(rad(-0.6));
    ctx.fillStyle = color || C.yellow;
    rrect(ctx, -w / 2 - 8, -size * 0.12, w + 16, size * 0.27, 6);
    ctx.fill();
    ctx.restore();
  }

  // ---------- 資料整理 ----------
  function brandName(p) {
    const b = String(p.brand || "").trim();
    const short = b.replace(/\s*(校園大使計畫|校園大使|大使計畫)\s*$/u, "").trim();
    return short || b || "校園大使";
  }
  const WEEK = "日一二三四五六";
  function fmtDate(iso, withYear) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    const md = `${+m[2]}/${+m[3]}（${WEEK[d.getDay()]}）`;
    return withYear ? `${m[1]}/${md}` : md;
  }
  function programUrl(p) { return `${SITE}/p/${encodeURIComponent(p.slug || p.id)}/`; }
  // 去掉舊資料殘留的行首符號（*、-、•、1. …），空行濾掉
  const clean = (arr) => (arr || [])
    .map((x) => String(x || "").trim().replace(/^(?:[*\-•．・·▪●○◦]+|\d{1,2}[.、)）])\s*/u, "").trim())
    .filter(Boolean);

  // ---------- 背景、標頭、頁尾 ----------
  function drawBackground(ctx) {
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    circle(ctx, 70, 60, 150, C.ys);
    circle(ctx, 1065, 265, 115, C.ps);
    circle(ctx, 890, 1290, 130, C.bs);
    circle(ctx, 25, 1145, 85, C.gs);
    // 手繪感雙框：兩層微旋轉
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(rad(0.3)); ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = 0.25; ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
    rrect(ctx, 56, 56, W - 112, H - 112, 30); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(rad(-0.25)); ctx.translate(-W / 2, -H / 2);
    ctx.lineWidth = 3.5; ctx.strokeStyle = C.ink;
    rrect(ctx, 52, 52, W - 104, H - 104, 26); ctx.stroke();
    ctx.restore();
  }
  function drawBrandline(ctx, y) {
    setFont(ctx, 42, 700); const wEn = ctx.measureText("UniEmbassy").width;
    setFont(ctx, 34, 700); const wZh = ctx.measureText("校園大使館").width;
    const total = 20 + 16 + wEn + 16 + 2 + 16 + wZh;
    let x = (W - total) / 2;
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    circle(ctx, x + 10, y, 10, C.ink); x += 36;
    setFont(ctx, 42, 700); ctx.fillStyle = C.ink; ctx.fillText("UniEmbassy", x, y + 2); x += wEn + 16;
    ctx.fillStyle = C.sep; ctx.fillRect(x, y - 18, 2, 36); x += 18;
    setFont(ctx, 34, 700); ctx.fillStyle = C.gold; ctx.fillText("校園大使館", x, y + 2);
  }
  function drawKicker(ctx, y, num, label) {
    setFont(ctx, 30, 800); const wNum = ctx.measureText(num).width + 36;
    setFont(ctx, 30, 700); const wLab = ctx.measureText(label).width;
    let x = (W - (wNum + 14 + wLab)) / 2;
    ctx.fillStyle = C.ink; rrect(ctx, x, y - 25, wNum, 50, 12); ctx.fill();
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    setFont(ctx, 30, 800); ctx.fillStyle = C.cream; ctx.fillText(num, x + wNum / 2, y + 1);
    x += wNum + 14;
    ctx.textAlign = "left"; setFont(ctx, 30, 700); ctx.fillStyle = C.gold; ctx.fillText(label, x, y + 1);
  }
  function drawFooter(ctx, idx, total, withIg) {
    const y = 1186;
    ctx.textBaseline = "middle";
    setFont(ctx, 32, 700);
    if (withIg) {
      const a = SITE, mid = "  ·  ", b = IG;
      const wa = ctx.measureText(a).width, wm = ctx.measureText(mid).width;
      setFont(ctx, 32, 600); const wb = ctx.measureText(b).width;
      let x = (W - (wa + wm + wb)) / 2;
      ctx.textAlign = "left";
      setFont(ctx, 32, 700); ctx.fillStyle = C.ink; ctx.fillText(a, x, y); x += wa;
      ctx.fillStyle = C.mute; ctx.fillText(mid, x, y); x += wm;
      setFont(ctx, 32, 600); ctx.fillStyle = C.foot; ctx.fillText(b, x, y);
    } else {
      ctx.textAlign = "center"; ctx.fillStyle = C.ink; ctx.fillText(SITE, W / 2, y);
    }
    // 頁碼點點
    const py = 1238, gap = 12, dot = 14, on = 34;
    const totalW = on + (total - 1) * dot + (total - 1) * gap;
    let x = (W - totalW) / 2;
    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i === idx ? C.ink : C.pagerOff;
      const w = i === idx ? on : dot;
      rrect(ctx, x, py - dot / 2, w, dot, dot / 2); ctx.fill();
      x += w + gap;
    }
  }

  // ---------- 內容積木：每塊先量高度，最後整組垂直置中 ----------
  function bIcon(emoji, bg, s) {
    const r = 92 * s;
    return {
      h: r * 2 + 30,
      draw(ctx, y) {
        const cy = y + 15 + r;
        ctx.save(); ctx.globalAlpha = 0.2; ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
        ctx.beginPath(); ctx.arc(W / 2 + 1, cy - 1, r + 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        circle(ctx, W / 2, cy, r, bg);
        ctx.lineWidth = 3.5; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, Math.PI * 2); ctx.stroke();
        setFont(ctx, r * 1.02, 400); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = C.ink; ctx.fillText(emoji, W / 2, cy + r * 0.06);
      },
    };
  }
  function bBadge(text, s) {
    return {
      h: 70 * s,
      draw(ctx, y) {
        setFont(ctx, 30 * s, 600); const w = ctx.measureText(text).width + 68 * s;
        const h = 70 * s;
        ctx.fillStyle = C.paper; rrect(ctx, (W - w) / 2, y, w, h, h / 2); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = C.yellow; ctx.stroke();
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = C.ink;
        ctx.fillText(text, W / 2, y + h / 2 + 1);
      },
    };
  }
  // 大標（可多行），每行底下一條螢光筆
  function bHero(ctx, text, maxLines, from, to) {
    const f = fit(ctx, text, CONTENT_W, maxLines, from, to, 800);
    const lh = f.size * 1.2;
    return {
      h: f.lines.length * lh,
      draw(ctx, y) {
        setFont(ctx, f.size, 800); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        f.lines.forEach((line, i) => {
          const base = y + i * lh + f.size * 0.92;
          highlight(ctx, W / 2, base, ctx.measureText(line).width, f.size);
          ctx.fillStyle = C.ink; ctx.fillText(line, W / 2, base);
        });
      },
    };
  }
  function bText(ctx, text, size, weight, color, maxLines, lhRatio) {
    setFont(ctx, size, weight);
    const lines = wrap(ctx, text, CONTENT_W, maxLines);
    const lh = size * (lhRatio || 1.6);
    return {
      h: lines.length * lh,
      draw(ctx, y) {
        setFont(ctx, size, weight); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color;
        lines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * lh + lh / 2));
      },
    };
  }
  function bChips(ctx, items, s) {
    const size = 28 * s, padX = 24 * s, h = 60 * s, gap = 14 * s;
    setFont(ctx, size, 700);
    const widths = items.map((t) => Math.min(ctx.measureText(t).width + padX * 2, CONTENT_W));
    const rows = [[]]; let rowW = 0;
    widths.forEach((w, i) => {
      if (rows[rows.length - 1].length && rowW + gap + w > CONTENT_W) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(i); rowW += (rowW ? gap : 0) + w;
    });
    return {
      h: rows.length * h + (rows.length - 1) * gap,
      draw(ctx, y) {
        setFont(ctx, size, 700); ctx.textBaseline = "middle"; ctx.textAlign = "center";
        rows.forEach((row, r) => {
          const rw = row.reduce((a, i) => a + widths[i], 0) + gap * (row.length - 1);
          let x = (W - rw) / 2;
          const ry = y + r * (h + gap);
          row.forEach((i) => {
            ctx.fillStyle = PASTELS[i % PASTELS.length]; rrect(ctx, x, ry, widths[i], h, h / 2); ctx.fill();
            ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
            ctx.fillStyle = C.ink; ctx.fillText(items[i], x + widths[i] / 2, ry + h / 2 + 1);
            x += widths[i] + gap;
          });
        });
      },
    };
  }
  // 清單：黃圈勾勾／數字＋文字，整組靠左、整塊置中（同開站輪播 CTA 頁）
  function bChecks(ctx, items, s, numbered) {
    const size = 40 * s, dot = 54 * s, gapX = 22 * s, gapY = 26 * s, lh = size * 1.45;
    const textW = CONTENT_W - dot - gapX;
    setFont(ctx, size, 600);
    const isMore = items.map((t) => t.startsWith(MORE_MARK));
    const rows = items.map((t, i) => wrap(ctx, isMore[i] ? t.slice(MORE_MARK.length) : t, textW, 2));
    const blockW = Math.min(CONTENT_W, dot + gapX + Math.max(...rows.map((ls) => Math.max(...ls.map((l) => ctx.measureText(l).width)))));
    const heights = rows.map((ls) => Math.max(dot, ls.length * lh));
    return {
      h: heights.reduce((a, b) => a + b, 0) + gapY * (rows.length - 1),
      draw(ctx, y) {
        const x0 = (W - blockW) / 2;
        let cy = y;
        rows.forEach((ls, i) => {
          const rowH = heights[i];
          const dotY = cy + (ls.length > 1 ? lh / 2 : rowH / 2);
          // 「＋還有 N 項」那列：虛線空心圈、灰字，跟真正的項目分開
          circle(ctx, x0 + dot / 2, dotY, dot / 2, isMore[i] ? C.paper : C.yellow);
          ctx.save();
          if (isMore[i]) { ctx.setLineDash([6, 5]); ctx.strokeStyle = C.foot; } else ctx.strokeStyle = C.ink;
          ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x0 + dot / 2, dotY, dot / 2, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          setFont(ctx, dot * 0.56, 800); ctx.fillStyle = isMore[i] ? C.foot : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(isMore[i] ? "＋" : numbered ? String(i + 1) : "✓", x0 + dot / 2, dotY + 1);
          setFont(ctx, size, 600); ctx.textAlign = "left"; ctx.fillStyle = isMore[i] ? C.foot : C.ink;
          const ty = cy + (rowH - ls.length * lh) / 2;
          ls.forEach((l, k) => ctx.fillText(l, x0 + dot + gapX, ty + k * lh + lh / 2));
          cy += rowH + gapY;
        });
      },
    };
  }
  // 便條紙：粉彩底、微微歪，一則一張（福利頁）
  function bNotes(ctx, items, s) {
    const size = 38 * s, padX = 38 * s, padY = 20 * s, gap = 22 * s, lh = size * 1.4;
    setFont(ctx, size, 600);
    const notes = items.map((t) => {
      const more = t.startsWith(MORE_MARK);
      const lines = wrap(ctx, more ? t.slice(MORE_MARK.length) : t, CONTENT_W - padX * 2, 2);
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
      return { lines, w, h: lines.length * lh + padY * 2, more };
    });
    const TILT = [-1.2, 0.8, -0.6, 1, -0.9, 0.6];
    const FILL = [C.ps, C.bs, C.ys, C.gs, C.paper];
    return {
      h: notes.reduce((a, n) => a + n.h, 0) + gap * (notes.length - 1),
      draw(ctx, y) {
        let cy = y;
        notes.forEach((n, i) => {
          ctx.save();
          ctx.translate(W / 2, cy + n.h / 2); ctx.rotate(rad(TILT[i % TILT.length]));
          ctx.fillStyle = n.more ? C.cream : FILL[i % FILL.length]; rrect(ctx, -n.w / 2, -n.h / 2, n.w, n.h, 18 * s); ctx.fill();
          ctx.lineWidth = 2.5; ctx.strokeStyle = n.more ? C.foot : C.ink;
          if (n.more) ctx.setLineDash([8, 6]);
          ctx.stroke(); ctx.setLineDash([]);
          setFont(ctx, size, 600); ctx.fillStyle = n.more ? C.foot : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          n.lines.forEach((l, k) => ctx.fillText(l, 0, -n.h / 2 + padY + k * lh + lh / 2));
          ctx.restore();
          cy += n.h + gap;
        });
      },
    };
  }
  // 資訊表：白紙卡＋金色欄名（報名資訊）
  function bTable(ctx, rows, s) {
    const pad = 36 * s, labelW = 168 * s, size = 37 * s, lh = size * 1.45, rowPad = 20 * s;
    const valW = CONTENT_W - pad * 2 - labelW;
    setFont(ctx, size, 600);
    const laid = rows.map(([k, v]) => ({ k, lines: wrap(ctx, v, valW, 2) }));
    const heights = laid.map((r) => r.lines.length * lh + rowPad * 2);
    const h = heights.reduce((a, b) => a + b, 0) + pad;
    return {
      h,
      draw(ctx, y) {
        const x0 = (W - CONTENT_W) / 2;
        ctx.fillStyle = C.paper; rrect(ctx, x0, y, CONTENT_W, h, 24); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
        let cy = y + pad / 2;
        laid.forEach((r, i) => {
          if (i > 0) {
            ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.sep; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x0 + pad, cy); ctx.lineTo(x0 + CONTENT_W - pad, cy); ctx.stroke(); ctx.restore();
          }
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          setFont(ctx, size * 0.9, 700); ctx.fillStyle = C.gold;
          ctx.fillText(r.k, x0 + pad, cy + rowPad + lh / 2);
          setFont(ctx, size, 600); ctx.fillStyle = C.ink;
          r.lines.forEach((l, k) => ctx.fillText(l, x0 + pad + labelW, cy + rowPad + k * lh + lh / 2));
          cy += heights[i];
        });
      },
    };
  }

  // 把積木由上往下排、整組在內容區垂直置中；塞不下回傳 false 讓外層縮小重排
  function layout(ctx, blocks, gap, force) {
    const total = blocks.reduce((a, b) => a + b.h, 0) + gap * (blocks.length - 1);
    const zoneH = ZONE_BOT - ZONE_TOP;
    if (total > zoneH && !force) return false;
    let y = ZONE_TOP + Math.max(0, (zoneH - total) / 2);
    blocks.forEach((b) => { b.draw(ctx, y); y += b.h + gap; });
    return true;
  }

  // ---------- 各頁 ----------
  const MAX_ITEMS = 6;
  const MORE_MARK = "\u0000more:"; // 內部標記：這列是「還有 N 項」，畫成灰色虛線樣式
  function capList(list, max) {
    if (list.length <= max) return list;
    return list.slice(0, max - 1).concat([`${MORE_MARK}還有 ${list.length - max + 1} 項，完整內容看官網`]);
  }

  function slideCover(ctx, p, s) {
    const chips = [p.paid ? "💰 有薪" : "", p.category, p.location, p.term].map((x) => String(x || "").trim()).filter(Boolean);
    const dl = fmtDate(p.deadline);
    const blocks = [
      bBadge("📣 校園大使招募中", s),
      bIcon(p.emoji || "📌", C.ys, s),
      bHero(ctx, brandName(p), 3, Math.round(150 * s), 60),
      p.title ? bText(ctx, p.title, 42 * s, 700, C.gray, 2, 1.45) : null,
      chips.length ? bChips(ctx, chips, s) : null,
      dl ? bText(ctx, `⏰ 報名截止 ${dl}`, 38 * s, 700, C.ink, 1) : null,
    ].filter(Boolean);
    return blocks;
  }
  function slideAbout(ctx, p, s) {
    const rows = [
      ["招募對象", p.eligibility],
      ["任期", p.term],
      ["地區", p.location],
      p.paid ? ["薪資", "有薪／有獎金"] : null,
      ["報名截止", fmtDate(p.deadline, true) || "依官方公告"],
    ].filter((r) => r && String(r[1] || "").trim());
    return [
      bIcon(p.emoji || "📌", C.ps, s * 0.8),
      bHero(ctx, "這是什麼計畫？", 1, Math.round(86 * s), 52),
      p.summary ? bText(ctx, `「${p.summary}」`, 44 * s, 700, C.ink, 4, 1.55) : null,
      rows.length ? bTable(ctx, rows, s) : null,
    ].filter(Boolean);
  }
  function slideTasks(ctx, list, s) {
    return [bIcon("🎯", C.bs, s), bHero(ctx, "你會做什麼？", 1, Math.round(86 * s), 52), bChecks(ctx, capList(list, MAX_ITEMS), s)];
  }
  function slideBenefits(ctx, list, s) {
    return [bIcon("🎁", C.gs, s), bHero(ctx, "你會得到什麼？", 1, Math.round(86 * s), 52), bNotes(ctx, capList(list, MAX_ITEMS - 1), s)];
  }
  // 收藏／轉發提醒：白紙膠囊，兩行
  function bReminder(ctx, s) {
    const lines = ["📌 先收藏，截止前別錯過", "👯 轉給想當大使的朋友"];
    const size = 36 * s, lh = size * 1.6, padX = 44 * s, padY = 22 * s;
    setFont(ctx, size, 700);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
    const h = lines.length * lh + padY * 2;
    return {
      h,
      draw(ctx, y) {
        ctx.fillStyle = C.paper; rrect(ctx, (W - w) / 2, y, w, h, 24); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = C.yellow; ctx.stroke();
        setFont(ctx, size, 700); ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        lines.forEach((l, i) => ctx.fillText(l, W / 2, y + padY + i * lh + lh / 2));
      },
    };
  }
  function slideCta(ctx, p, s) {
    const steps = [`打開 ${SITE}`, `搜尋「${brandName(p)}」`, "點「前往報名」直達官方報名頁"];
    return [
      bIcon("👉", C.ps, s),
      bHero(ctx, "怎麼報名？", 1, Math.round(86 * s), 52),
      bChecks(ctx, steps, s, true),
      bReminder(ctx, s),
    ];
  }

  async function render(p) {
    p = p || {};
    const tasks = clean(p.tasks), benefits = clean(p.benefits);
    const pages = [
      { kind: "cover", build: (ctx, s) => slideCover(ctx, p, s) },
      { kind: "about", label: "計畫簡介", build: (ctx, s) => slideAbout(ctx, p, s) },
      tasks.length ? { kind: "tasks", label: "大使任務", build: (ctx, s) => slideTasks(ctx, tasks, s) } : null,
      benefits.length ? { kind: "benefits", label: "大使福利", build: (ctx, s) => slideBenefits(ctx, benefits, s) } : null,
      { kind: "cta", label: "怎麼報名", build: (ctx, s) => slideCta(ctx, p, s) },
    ].filter(Boolean);

    await ensureFont([p.brand, p.title, p.summary, p.eligibility, p.term, p.location, p.category,
      tasks.join(""), benefits.join(""), "UniEmbassy校園大使館招募中這是什麼計畫你會做得到怎麼報名任務福利簡介對象期地區薪資有獎金截止依官方公告打開搜尋點前往直達頁先收藏別錯過轉給想當的朋友還項完整內容看網＋…「」？：／0123456789"].join(""));

    return pages.map((pg, idx) => {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      // 內容太多就整頁等比縮小重排（最多縮到 64%），最後一次不管多擠都畫
      for (let k = 0; k <= 6; k++) {
        const s = 1 - k * 0.06;
        drawBackground(ctx);
        if (pg.kind === "cover") drawBrandline(ctx, 150);
        else drawKicker(ctx, 150, String(idx).padStart(2, "0"), pg.label);
        drawFooter(ctx, idx, pages.length, pg.kind === "cover" || pg.kind === "cta");
        if (layout(ctx, pg.build(ctx, s), 40 * s, k === 6)) break;
      }
      return canvas;
    });
  }

  function toBlobs(canvases) {
    return Promise.all(canvases.map((c) => new Promise((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error("圖片輸出失敗"))), "image/png"))));
  }

  // ---------- IG 文案（模板套字）----------
  const CAT_TAG = {
    "3C 科技": "3C", "軟體工具": "科技", "美妝": "美妝", "消費品": "生活好物", "時尚配件": "穿搭",
    "餐飲外送": "美食", "金融": "理財", "旅遊": "旅遊", "教育": "教育", "媒體／職涯": "職涯",
  };
  function hashPick(seed, arr) {
    let h = 0; for (const ch of String(seed || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return arr[h % arr.length];
  }
  function caption(p) {
    p = p || {};
    const b = brandName(p);
    const tasks = clean(p.tasks), benefits = clean(p.benefits);
    const hook = hashPick(p.id || p.brand, [
      `📣 ${b} 校園大使開招了！`,
      `🎓 想當 ${b} 的校園大使嗎？`,
      `✨ 新計畫上架｜${b} 校園大使招募中`,
    ]);
    const L = [hook, ""];
    if (p.title) L.push(p.title);
    if (p.summary) L.push(p.summary);
    if (tasks.length) L.push("", "✅ 大使任務", ...tasks.map((t) => "・" + t));
    if (benefits.length) L.push("", "🎁 大使福利", ...benefits.map((t) => "・" + t));
    L.push("", "📋 計畫資訊");
    if (p.eligibility) L.push(`👥 招募對象：${p.eligibility}`);
    if (p.term) L.push(`🗓 任期：${p.term}`);
    if (p.location) L.push(`📍 地區：${p.location}`);
    if (p.paid) L.push("💰 有薪／有獎金");
    L.push(`⏰ 報名截止：${fmtDate(p.deadline, true) || "依官方公告"}`);
    L.push("", "👉 怎麼報名？",
      `到 ${SITE} 搜尋「${b}」，點「前往報名」直達官方報名頁`,
      `🔗 ${programUrl(p)}`,
      "", "📌 先收藏，截止前別錯過",
      "👯 標記一個適合當大使的朋友",
      "", `※ 詳細內容以 ${b} 官方公告為準`);
    const brandTag = b.replace(/[\s\p{P}\p{S}]/gu, "");
    const tags = ["校園大使", "校園大使招募"];
    if (brandTag && brandTag.length <= 20) tags.push(brandTag, brandTag + "校園大使");
    if (CAT_TAG[p.category]) tags.push(CAT_TAG[p.category]);
    tags.push("大學生", "大學生活", "UniEmbassy", "校園大使館");
    L.push("", [...new Set(tags)].map((t) => "#" + t).join(" "));
    return L.join("\n");
  }

  window.Carousel = { render, toBlobs, caption, brandName, programUrl, SIZE: { W, H } };
})();
