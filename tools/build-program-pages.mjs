#!/usr/bin/env node
// 計畫獨立頁產生器 — 為每個上架中的計畫產出 p/<slug>/index.html，並重寫 sitemap.xml。
//
// 為什麼要有這支：詳情本來是彈窗，爬蟲讀不到，分享出去的預覽卡也永遠是通用站圖。
// 這裡直接把內容渲染成靜態 HTML（不靠 JS），Google 才收得到、LINE/FB 才抓得到該計畫的預覽。
//
// 資料來源用 config.js 裡那把 publishable key（本來就公開，RLS 只讓匿名讀 live），
// 所以不需要任何 GitHub secret，也不會有寫入權限。
//
// 用法：node tools/build-program-pages.mjs

import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://uniembassy.tw";
const OG_IMAGE = `${SITE}/og-image.png?v=2`;
const ASSET_VER = "45";           // 跟 HTML 的 ?v= 版控一致，改版時一起調
const PAGES_DIR = join(ROOT, "p");

// 首頁以外的公開頁（sitemap 用；順序＝重要性）
const STATIC_PAGES = [
  { loc: "/", freq: "weekly", pri: "1.0" },
  { loc: "/about.html", freq: "monthly", pri: "0.9" },
  { loc: "/for-brands.html", freq: "monthly", pri: "0.9" },
  { loc: "/network.html", freq: "weekly", pri: "0.7" },
  { loc: "/events.html", freq: "weekly", pri: "0.7" },
  { loc: "/submit.html", freq: "monthly", pri: "0.7" },
  { loc: "/wish.html", freq: "weekly", pri: "0.6" },
  { loc: "/track.html", freq: "monthly", pri: "0.3" },
];

// ---------- 小工具 ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 塞進 <script type="application/ld+json"> 的內容：JSON 本身已跳脫引號，
// 只要防止字串裡出現 </script> 提前關掉標籤即可。
const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/<\//g, "<\\/");

const today = () => new Date().toISOString().slice(0, 10);

// 網址代稱：只收 a-z0-9-，擋掉路徑跳脫（../、/）與空白
function safeSlug(program) {
  const raw = String(program.slug || program.id || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(raw) ? raw : null;
}

function truncate(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

// ---------- 讀設定（跟前台共用 config.js，不另外維護一份金鑰）----------
async function readConfig() {
  const src = await readFile(join(ROOT, "config.js"), "utf8");
  const pick = (key) => (src.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`)) || [])[1];
  const url = pick("SUPABASE_URL");
  const key = pick("SUPABASE_KEY");
  if (!url || !key) throw new Error("config.js 讀不到 SUPABASE_URL / SUPABASE_KEY");
  return { url, key };
}

async function fetchLivePrograms({ url, key }) {
  const endpoint = `${url}/rest/v1/programs?status=eq.live&select=*&order=deadline.asc`;
  const res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase 回 ${res.status}：${await res.text()}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("Supabase 回傳格式不是陣列");
  return rows;
}

// ---------- 頁面 ----------
function pageHTML(p, slug) {
  const url = `${SITE}/p/${slug}/`;
  const paid = p.paid;
  const open = p.recruiting !== false;
  const tasks = Array.isArray(p.tasks) ? p.tasks.filter(Boolean) : [];
  const benefits = Array.isArray(p.benefits) ? p.benefits.filter(Boolean) : [];
  const title = `${p.title}｜${p.brand} 校園大使招募 · UniEmbassy`;
  const desc = truncate(p.summary || `${p.brand} 正在招募校園大使，看任務內容、福利與報名方式。`, 90);
  const applyUrl = p.apply_url || "";

  // 已截止的計畫不發 JobPosting：Google 會把過期職缺當品質問題，寧可不標。
  const deadlineFuture = !p.deadline || p.deadline >= today();
  const ld = open && deadlineFuture ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: p.title,
    description: p.summary || p.title,
    identifier: { "@type": "PropertyValue", name: "UniEmbassy", value: p.id },
    hiringOrganization: { "@type": "Organization", name: p.brand },
    employmentType: paid ? "PART_TIME" : "VOLUNTEER",
    datePosted: (p.created_at || "").slice(0, 10) || today(),
    ...(p.deadline ? { validThrough: p.deadline } : {}),
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: p.location || "台灣", addressCountry: "TW" },
    },
    ...(applyUrl ? { directApply: false, url: applyUrl } : {}),
  } : null;

  const meta = (label, value) => `<div class="m"><span>${esc(label)}</span><b>${esc(value || "—")}</b></div>`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(url)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="UniEmbassy 校園大使館" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />

  <link rel="stylesheet" href="/styles.css?v=${ASSET_VER}" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="theme-color" content="#1a1a1a" />
${ld ? `  <script type="application/ld+json">\n${jsonLd(ld)}\n  </script>\n` : ""}</head>
<body>
  <header class="nav">
    <div class="wrap nav-inner">
      <a href="/" class="logo"><span class="dot"></span>UniEmbassy</a>
      <nav class="nav-links">
        <a href="/">找計畫</a>
        <a href="/about.html">什麼是校園大使</a>
        <a href="/events.html">活動</a>
      </nav>
    </div>
  </header>

  <div class="page">
    <a href="/" class="back-link">← 所有校園大使計畫</a>
    <article class="prog-card">
      <div class="modal-emoji">${esc(p.emoji || "📌")}</div>
      <h1>${esc(p.title)}</h1>
      <div class="m-brand">${esc(p.brand)}</div>
      <div class="m-tags">
        <span class="tag ${paid ? "paid" : "unpaid"}">${paid ? "有薪" : "無薪"}</span>
        ${p.category ? `<span class="tag">${esc(p.category)}</span>` : ""}
        ${p.location ? `<span class="tag">${esc(p.location)}</span>` : ""}
      </div>
      <p style="color:var(--ink-soft);font-size:15.5px;">${esc(p.summary || "")}</p>
      ${open
        ? (p.recruit_note ? `<div class="recruit-banner open">🟢 ${esc(p.recruit_note)}</div>` : "")
        : `<div class="recruit-banner closed">🔴 ${esc(p.recruit_note || "本梯報名已截止")}</div>`}

      <div class="meta-grid">
        ${meta("招募對象", p.eligibility)}
        ${meta("任期", p.term)}
        ${meta("地區", p.location)}
        ${meta("報名狀態", open ? (p.deadline || "隨到隨審") : (p.deadline ? "已截止 " + p.deadline : "見官方公告"))}
      </div>

      ${tasks.length ? `<h4>任務內容</h4>\n      <ul>${tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}

      ${benefits.length ? `<h4>大使福利</h4>\n      <div class="benefit-pills">${benefits.map((b) => `<span>${esc(b)}</span>`).join("")}</div>` : ""}

      <div class="modal-actions">
        ${applyUrl
          ? `<a href="${esc(applyUrl)}" target="_blank" rel="noopener" class="btn">${open ? "前往報名 ↗" : "查看官方頁 ↗"}</a>`
          : `<a href="/" class="btn">看其他計畫</a>`}
      </div>

      <h4>分享這個機會</h4>
      <div class="prog-share">
        <code id="shareUrl">${esc(url)}</code>
        <button class="btn ghost" id="copyBtn" type="button">複製連結</button>
      </div>
      ${p.source_url ? `<div class="source-line">資料來源：<a href="${esc(p.source_url)}" target="_blank" rel="noopener">官方頁面 ↗</a></div>` : ""}
    </article>

    <div class="prog-more">
      <a class="btn ghost" href="/">看更多校園大使計畫 →</a>
    </div>
  </div>

  <div class="toast" id="toast"></div>
  <script>
    document.getElementById("copyBtn").onclick = function () {
      var url = document.getElementById("shareUrl").textContent;
      var btn = this;
      function done() { btn.textContent = "已複製 ✓"; setTimeout(function () { btn.textContent = "複製連結"; }, 2000); }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("手動複製這個連結：", url); });
      else prompt("手動複製這個連結：", url);
    };
  </script>
  <script src="/install.js?v=${ASSET_VER}"></script>
</body>
</html>
`;
}

function sitemapXML(slugs) {
  const d = today();
  const urls = [
    ...STATIC_PAGES.map((s) => ({ loc: SITE + s.loc, freq: s.freq, pri: s.pri })),
    ...slugs.map((s) => ({ loc: `${SITE}/p/${s}/`, freq: "weekly", pri: "0.8" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${d}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

// ---------- 主流程 ----------
async function main() {
  const cfg = await readConfig();
  const rows = await fetchLivePrograms(cfg);

  // 安全閥：抓到 0 筆多半是 RLS 或網路出問題，不是真的全下架。
  // 這時若照常清理，會把所有既有頁面刪光 → 直接中止，讓 Action 紅燈。
  if (rows.length === 0) {
    throw new Error("查到 0 筆上架計畫，判定為異常（避免誤刪既有頁面），中止不動任何檔案");
  }

  const seen = new Map();
  const skipped = [];
  for (const p of rows) {
    const slug = safeSlug(p);
    if (!slug) { skipped.push(`${p.id}（代稱含不合法字元）`); continue; }
    if (seen.has(slug)) { skipped.push(`${p.id}（代稱 ${slug} 與 ${seen.get(slug).id} 重複）`); continue; }
    seen.set(slug, p);
  }

  for (const [slug, p] of seen) {
    const dir = join(PAGES_DIR, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), pageHTML(p, slug), "utf8");
  }

  // 清掉已下架計畫的殘頁，免得死頁被 Google 收錄
  let removed = [];
  if (existsSync(PAGES_DIR)) {
    const entries = await readdir(PAGES_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !seen.has(e.name)) {
        await rm(join(PAGES_DIR, e.name), { recursive: true, force: true });
        removed.push(e.name);
      }
    }
  }

  await writeFile(join(ROOT, "sitemap.xml"), sitemapXML([...seen.keys()]), "utf8");

  console.log(`✓ 產生 ${seen.size} 個計畫獨立頁`);
  if (removed.length) console.log(`✓ 清掉 ${removed.length} 個已下架殘頁：${removed.join(", ")}`);
  if (skipped.length) console.log(`⚠️ 跳過 ${skipped.length} 筆：${skipped.join("、")}`);
  console.log(`✓ sitemap.xml 共 ${STATIC_PAGES.length + seen.size} 個網址`);
}

main().catch((err) => {
  console.error("✗ 產生失敗：" + (err && err.message ? err.message : err));
  process.exit(1);
});
