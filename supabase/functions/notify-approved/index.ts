// notify-approved — 計畫通過上架時寄通知信給廠商（Resend）
//
// 呼叫方式：admin.html 按「通過上架」後 sb.functions.invoke("notify-approved", { body: { program_id } })
// 防護：1) 驗證呼叫者 JWT 必須是 ADMIN_EMAIL  2) notified_at 蓋章防重寄
// 需要的 Secrets（Supabase 後台 Edge Functions → Secrets 設定）：
//   RESEND_API_KEY  — Resend 的 API key
//   ADMIN_EMAIL     — 管理員 email（跟 is_admin() 用的同一個）
//   FROM_EMAIL      — 寄件人，網域要先在 Resend 驗證，例：UniEmbassy 校園大使館 <notify@uniembassy.tw>
//   REPLY_TO        — 選填，廠商按「回覆」時寄到哪，例：4gpt4used@gmail.com
// （SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY 平台會自動注入，不用設）

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://uniembassy.tw";

const cors = {
  "Access-Control-Allow-Origin": SITE,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  try {
    // ---- 1. 驗證呼叫者是管理員 ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await anon.auth.getUser();
    const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "";
    if (!user || !adminEmail || user.email !== adminEmail) {
      return json(403, { error: "只有管理員能觸發通知信" });
    }

    const { program_id } = await req.json().catch(() => ({}));
    if (!program_id || typeof program_id !== "string") {
      return json(400, { error: "缺 program_id" });
    }

    // ---- 2. service role 讀計畫＋聯絡信箱 ----
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: prog, error: pErr } = await svc.from("programs").select("*").eq("id", program_id).maybeSingle();
    if (pErr) throw pErr;
    if (!prog) return json(404, { error: "查無此計畫" });
    if (prog.status !== "live") return json(409, { error: "計畫不是上架狀態，不寄信" });

    const { data: contact, error: cErr } = await svc.from("program_contacts")
      .select("email, notified_at").eq("program_id", program_id).maybeSingle();
    if (cErr) throw cErr;
    if (!contact) return json(200, { skipped: "no_email", message: "這筆投稿沒留 Email（可能是學生提報或舊資料），略過" });
    if (contact.notified_at) return json(200, { skipped: "already_sent", message: "先前已寄過通知信，略過" });

    // ---- 3. 組信寄出 ----
    const slugOrId = prog.slug || prog.id;
    const pageUrl = `${SITE}/p/${encodeURIComponent(slugOrId)}/`;
    const trackUrl = `${SITE}/track.html?code=${encodeURIComponent(prog.id)}`;
    const subject = `🎉 「${prog.brand}｜${prog.title}」已在 UniEmbassy 正式上架`;
    const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const html = `
<div style="font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
  <div style="padding:28px 0 18px;font-weight:800;font-size:18px;">● UniEmbassy 校園大使館</div>
  <div style="border:1px solid #e8e8e8;border-radius:14px;padding:28px;">
    <h1 style="font-size:20px;margin:0 0 14px;">恭喜！您的計畫已正式上架 🎉</h1>
    <p style="font-size:15px;line-height:1.7;margin:0 0 6px;"><b>${esc(prog.brand)}｜${esc(prog.title)}</b></p>
    <p style="font-size:14.5px;line-height:1.7;color:#555;margin:0 0 20px;">
      全台學生現在都能在 UniEmbassy 看到並報名您的校園大使計畫。</p>
    <a href="${pageUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;
      padding:12px 22px;border-radius:10px;font-size:14.5px;font-weight:600;">查看您的專屬招募頁 →</a>
    <p style="font-size:13.5px;line-height:1.7;color:#555;margin:20px 0 0;">
      這個專屬連結可以直接分享：貼到官網、社群，或傳給有興趣的同學，
      對方一打開就會看到您的招募資訊。<br/>
      <a href="${pageUrl}" style="color:#0a6ebd;">${pageUrl}</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0;" />
    <p style="font-size:13px;line-height:1.7;color:#888;margin:0;">
      隨時可到 <a href="${trackUrl}" style="color:#0a6ebd;">查稿頁</a> 查看計畫狀態。<br/>
      內容需要修改，直接回覆這封信告訴我們即可。</p>
  </div>
  <p style="font-size:12px;color:#aaa;padding:16px 0;">UniEmbassy 校園大使館 · <a href="${SITE}" style="color:#aaa;">${SITE.replace("https://", "")}</a></p>
</div>`;

    const payload: Record<string, unknown> = {
      from: Deno.env.get("FROM_EMAIL") ?? "UniEmbassy <onboarding@resend.dev>",
      to: [contact.email],
      subject,
      html,
    };
    const replyTo = Deno.env.get("REPLY_TO");
    if (replyTo) payload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json(502, { error: `Resend 回 ${res.status}`, detail });
    }

    // ---- 4. 蓋防重寄章 ----
    await svc.from("program_contacts").update({ notified_at: new Date().toISOString() }).eq("program_id", program_id);

    return json(200, { sent: true, to: contact.email });
  } catch (err) {
    return json(500, { error: (err as Error).message ?? String(err) });
  }
});
