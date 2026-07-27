-- ============================================================
-- schema_v16_vendor_email.sql — 2026-07-28
-- 目的：廠商投稿留聯絡 Email，計畫通過上架時自動寄通知信（Resend）。
-- 資安：Email 絕不放 programs 表 —— 那張表 live 列是匿名可讀的，
--       放進去等於全公開。獨立 program_contacts 表，RLS 只給 admin 讀，
--       寫入只走 security definer RPC，Edge Function 用 service role 讀。
-- 冪等：全部 if not exists / create or replace，可重複執行。
-- ============================================================

-- 1) 聯絡表：一計畫一筆；notified_at＝防重寄（寄過就不再寄）
create table if not exists program_contacts (
  program_id text primary key references programs(id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table program_contacts enable row level security;

-- 只有 admin 能讀（後台顯示用）；沒有任何 insert/update policy —— 寫入只走 RPC 與 service role
drop policy if exists contacts_admin_select on program_contacts;
create policy contacts_admin_select on program_contacts
  for select using (is_admin());

-- 2) submit_program 加收 email（選傳：學生提報 report.js 沒有 email，照舊運作）
create or replace function submit_program(form jsonb)
returns text as $$
declare
  new_id text := gen_random_uuid()::text;
begin
  insert into programs (id, brand, emoji, category, title, summary, tasks, benefits,
    eligibility, term, paid, location, deadline, apply_url, source_url, submitted_by, status)
  values (
    new_id,
    form->>'brand',
    coalesce(nullif(form->>'emoji', ''), '📌'),
    coalesce(nullif(form->>'category', ''), '其他'),
    form->>'title',
    form->>'summary',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(form->'tasks', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(form->'benefits', '[]'::jsonb)) x), '{}'),
    form->>'eligibility',
    form->>'term',
    coalesce((form->>'paid')::boolean, false),
    form->>'location',
    nullif(form->>'deadline', '')::date,
    form->>'apply_url',
    form->>'source_url',
    auth.uid(),
    'pending'
  );

  -- 有留 email 才建聯絡資料（防呆：去空白、轉小寫）
  if nullif(trim(form->>'contact_email'), '') is not null then
    insert into program_contacts (program_id, email)
    values (new_id, lower(trim(form->>'contact_email')))
    on conflict (program_id) do update set email = excluded.email;
  end if;

  return new_id;
end;
$$ language plpgsql security definer;
