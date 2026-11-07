// expired-programs — 「過期待清」清單：找出截止日已過（或被標已截止）卻還在上架的計畫
//
// ⚠️ 這支函式只「列清單＋寄信」，絕對不改任何資料。
//    真正的下架一律在後台 admin.html「⏰ 過期待清」分頁，由人勾選＋確認後，前端用管理員權限把 status 改成 closed。
//
// 兩種呼叫者：
//   1. GitHub Action（.github/workflows/expired-programs-digest.yml，每天台灣 09:17）
//      帶 GitHub 發的 OIDC 身分證（header x-github-oidc），body {action:"digest"} → 有過期的就寄對照表給主理人
//      → 不用設任何共用密碼：函式直接跟 GitHub 驗證「真的是 campus-x 這個 repo 的 main 分支、這支 workflow 在叫」
//   2. 後台分頁（登入者 JWT，必須在 staff 團隊名單裡）
//      body {action:"list"}   → 回傳 JSON 對照表給畫面用
//      body {action:"digest"} → 寄一封測試信給「按按鈕的那個人」
//
// 部署：Supabase 後台 → Edge Functions → Deploy a new function → Via Editor → 名稱 expired-programs → 貼整份 → Deploy
//       ⚠️ 部署完到這支函式的設定把「Verify JWT」（Enforce JWT verification）關掉：
//          GitHub 的身分證不是 Supabase 的 JWT，不關的話排程會被擋在門口（401）。身分驗證由函式自己做（見下方 authorize）。
// Secrets：沿用 notify-approved 已設好的 RESEND_API_KEY / FROM_EMAIL / REPLY_TO / ADMIN_EMAIL，不用新增。
//
// 過期規則（跟 db.js expiryOf 同一套，改一邊要改另一邊）：
//   status = live 且（deadline 早於今天〔台灣時間〕或 recruiting = false）

import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const SITE = "https://uniembassy.tw";
const ADMIN_URL = `${SITE}/admin.html?tab=expired`;

// GitHub OIDC：只認這個 repo 的 main 分支上的這支 workflow
const GH_ISSUER = "https://token.actions.githubusercontent.com";
const GH_AUDIENCE = "uniembassy-expired-programs";
const GH_REPO = "nicolas5288-commits/campus-x";
const GH_WORKFLOW = `${GH_REPO}/.github/workflows/expired-programs-digest.yml@refs/heads/main`;
const ghJwks = createRemoteJWKSet(new URL(`${GH_ISSUER}/.well-known/jwks`));

const cors = {
  "Access-Control-Allow-Origin": SITE,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Caller = { kind: "cron" } | { kind: "staff"; email: string };

// service role：繞過 RLS 才數得到每個人的收藏、讀得到 staff 名單（只讀，不寫）
function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
type Svc = ReturnType<typeof serviceClient>;

// ---------- 身分驗證 ----------
async function authorize(req: Request, svc: Svc): Promise<Caller | null> {
  // 1. GitHub Action 排程
  const oidc = req.headers.get("x-github-oidc");
  if (oidc) {
    try {
      const { payload } = await jwtVerify(oidc, ghJwks, { issuer: GH_ISSUER, audience: GH_AUDIENCE });
      if (payload.repository !== GH_REPO) return null;
      if (payload.ref !== "refs/heads/main") return null;
      if (payload.workflow_ref !== GH_WORKFLOW) return null;
      return { kind: "cron" };
    } catch {
      return null;
    }
  }
  // 2. 後台登入者（要在 staff 團隊名單裡）
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await anon.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  const { data: staffRow, error: staffErr } = await svc.from("staff").select("role").eq("email", email).maybeSingle();
  // staff 表不存在（v18 沒跑）→ 退回單一 ADMIN_EMAIL 判斷，跟 notify-approved 一致
  const allowed = staffErr ? email === (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase() : !!staffRow;
  return allowed ? { kind: "staff", email } : null;
}

// ---------- 過期規則（跟 db.js expiryOf 同一套）----------
function taipeiToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function expiryOf(p: Record<string, unknown>, today: string) {
  if (p.status !== "live") return null;
  const dl = p.deadline ? String(p.deadline).slice(0, 10) : null;
  const pastDeadline = !!dl && dl < today;
  if (!pastDeadline && p.recruiting !== false) return null;
  return {
    reason: pastDeadline ? "deadline" : "manual",
    daysPast: pastDeadline ? Math.round((Date.parse(today) - Date.parse(dl!)) / 86400000) : null,
  };
}

type Item = {
  id: string; slug: string | null; emoji: string; brand: string; title: string;
  deadline: string | null; recruiting: boolean; reason: string; daysPast: number | null;
  url: string; reviews: number; favorites: number;
};

async function countBy(svc: Svc, table: string, programId: string, liveOnly: boolean) {
  let q = svc.from(table).select("*", { count: "exact", head: true }).eq("program_id", programId);
  if (liveOnly) q = q.eq("status", "live");
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function buildList(svc: Svc) {
  const today = taipeiToday();
  const { data, error } = await svc.from("programs")
    .select("id, slug, emoji, brand, title, deadline, recruiting, status")
    .eq("status", "live");
  if (error) throw error;
  const rows = (data ?? []).map((p) => ({ p, ex: expiryOf(p, today) })).filter((r) => r.ex);
  // 一筆一筆數（head 查詢只回數字，不會被 1000 列上限截斷）
  const items: Item[] = await Promise.all(rows.map(async ({ p, ex }) => ({
    id: p.id, slug: p.slug ?? null, emoji: p.emoji || "📌", brand: p.brand, title: p.title,
    deadline: p.deadline ?? null, recruiting: p.recruiting !== false,
    reason: ex!.reason, daysPast: ex!.daysPast,
    url: `${SITE}/p/${encodeURIComponent(p.slug || p.id)}/`,
    reviews: await countBy(svc, "reviews", p.id, true),
    favorites: await countBy(svc, "favorites", p.id, false),
  })));
  items.sort((a, b) => (b.daysPast ?? -1) - (a.daysPast ?? -1) || a.brand.localeCompare(b.brand));
  return { today, items };
}

// ---------- 信件 ----------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function pastLabel(it: Item) {
  if (it.reason === "deadline") return `已過 ${it.daysPast} 天${it.daysPast === 1 ? "（🆕 昨天截止）" : ""}`;
  return "手動標已截止";
}

function digestHtml(today: string, items: Item[]) {
  const nDeadline = items.filter((i) => i.reason === "deadline").length;
  const nManual = items.length - nDeadline;
  const rows = items.map((it) => `
    <tr>
      <td style="padding:10px 8px;border-top:1px solid #eee;vertical-align:top;">
        <div style="font-size:13px;color:#666;">${esc(it.emoji)} ${esc(it.brand)}</div>
        <div style="font-size:14.5px;font-weight:600;color:#1a1a1a;">${esc(it.title)}</div>
      </td>
      <td style="padding:10px 8px;border-top:1px solid #eee;vertical-align:top;font-size:13px;white-space:nowrap;">
        ${it.deadline ? esc(it.deadline) : "沒有截止日"}<br/><span style="color:#c0392b;">${esc(pastLabel(it))}</span>
      </td>
      <td style="padding:10px 8px;border-top:1px solid #eee;vertical-align:top;font-size:13px;white-space:nowrap;">
        💬 心得 ${it.reviews}<br/>⭐ 收藏 ${it.favorites}<br/>
        <a href="${esc(it.url)}" style="color:#0a6ebd;">專屬頁</a>
      </td>
    </tr>`).join("");
  return `
<div style="font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
  <div style="padding:24px 0 14px;font-weight:800;font-size:18px;">● UniEmbassy 校園大使館</div>
  <div style="border:1px solid #e8e8e8;border-radius:14px;padding:24px;">
    <h1 style="font-size:19px;margin:0 0 10px;">⏰ 有 ${items.length} 筆計畫過期了還在上架</h1>
    <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 6px;">
      ${esc(today)}（台灣時間）自動檢查：截止日已過 ${nDeadline} 筆、被手動標成已截止 ${nManual} 筆。</p>
    <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 18px;">
      <b>系統不會自己動任何資料。</b>到後台勾選要下架的計畫、再按一次確認，才會下架。
      下架後心得、收藏都會保留，之後可以一鍵重新上架。</p>
    <a href="${ADMIN_URL}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;
      padding:12px 22px;border-radius:10px;font-size:14.5px;font-weight:600;">到後台確認 →</a>
    <table style="width:100%;border-collapse:collapse;margin-top:22px;">
      <tr style="text-align:left;font-size:12px;color:#888;">
        <th style="padding:0 8px 6px;font-weight:600;">品牌／計畫</th>
        <th style="padding:0 8px 6px;font-weight:600;">截止日</th>
        <th style="padding:0 8px 6px;font-weight:600;">會受影響</th>
      </tr>${rows}
    </table>
    <p style="font-size:12.5px;line-height:1.7;color:#888;margin:18px 0 0;">完整對照表在附件 CSV（可用 Excel／Google 試算表開）。</p>
  </div>
  <p style="font-size:12px;color:#aaa;padding:14px 0;">這封信由 GitHub Action 每天早上自動寄出；清單是空的那天不會寄。</p>
</div>`;
}

function digestCsv(items: Item[]) {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["品牌", "計畫名稱", "截止日", "已過幾天", "原因", "專屬頁", "心得數", "收藏數", "計畫編號"];
  const lines = items.map((it) => [
    it.brand, it.title, it.deadline ?? "", it.daysPast ?? "",
    it.reason === "deadline" ? "截止日已過" : "手動標已截止",
    it.url, it.reviews, it.favorites, it.id,
  ].map(cell).join(","));
  return "﻿" + [head.join(","), ...lines].join("\r\n");  // BOM：Excel 開中文才不會亂碼
}

function toBase64(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function ownerEmails(svc: Svc): Promise<string[]> {
  const { data, error } = await svc.from("staff").select("email").eq("role", "owner");
  const list = !error && data ? data.map((r) => String(r.email)).filter(Boolean) : [];
  if (list.length) return list;
  const fallback = Deno.env.get("ADMIN_EMAIL");
  return fallback ? [fallback] : [];
}

async function sendDigest(to: string[], today: string, items: Item[]) {
  const payload: Record<string, unknown> = {
    from: Deno.env.get("FROM_EMAIL") ?? "UniEmbassy <onboarding@resend.dev>",
    to,
    subject: `⏰ 過期待清：${items.length} 筆計畫已截止還在上架（${today}）`,
    html: digestHtml(today, items),
    attachments: [{ filename: `過期待清_${today}.csv`, content: toBase64(digestCsv(items)) }],
  };
  const replyTo = Deno.env.get("REPLY_TO");
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend 回 ${res.status}：${await res.text()}`);
}

// ---------- 入口 ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  try {
    const svc = serviceClient();
    const caller = await authorize(req, svc);
    if (!caller) return json(403, { error: "只有管理員或每日排程能呼叫" });

    const { action } = await req.json().catch(() => ({}));
    if (action !== "list" && action !== "digest") return json(400, { error: "action 要是 list 或 digest" });
    // 排程只能寄信，不能拿清單（清單只給登入的後台成員看）
    if (caller.kind === "cron" && action !== "digest") return json(403, { error: "排程只能呼叫 digest" });

    const { today, items } = await buildList(svc);
    if (action === "list") return json(200, { today, count: items.length, items });

    if (!items.length) return json(200, { today, count: 0, sent: false, message: "今天沒有過期還在上架的計畫，不寄信" });
    const to = caller.kind === "staff" ? [caller.email] : await ownerEmails(svc);
    if (!to.length) return json(500, { error: "找不到收件人（staff 表沒有 owner，也沒設 ADMIN_EMAIL）" });
    await sendDigest(to, today, items);
    // repo 是公開的，Action 的執行紀錄誰都看得到 → 排程呼叫只回收件人數，不回 email
    return json(200, caller.kind === "cron"
      ? { today, count: items.length, sent: true, recipients: to.length }
      : { today, count: items.length, sent: true, to });
  } catch (err) {
    return json(500, { error: (err as Error).message ?? String(err) });
  }
});
