-- ============================================================
-- UniEmbassy 待跑 SQL 合輯（v15 + v16 + v17）
-- 產生日期：2026-07-28
-- 用法：整份貼到 Supabase SQL Editor 按 Run，一次跑完三份。
-- 三份都是冪等設計，重複執行不會出錯。
-- ============================================================


-- ============================================================
-- schema_v15_program_slug.sql — 2026-07-27
-- 目的：計畫獨立頁 /p/<slug>/。每個計畫可有一個好記的網址代稱，
--       留空就用系統編號（id），所以這欄純選填、不填也能運作。
-- 相容：slug 為 null＝產生器改用 id 當網址，既有計畫零影響。
-- 冪等：全部 if not exists / create or replace，可重複執行。
-- ============================================================

-- 1) slug 欄位（選填）＋唯一索引（只管有填的，null 不互相衝突）
alter table programs add column if not exists slug text;

create unique index if not exists programs_slug_uniq
  on programs (slug) where slug is not null;

-- 2) 查稿頁要顯示「你的專屬招募連結」，RPC 得一併回 slug。
--    回傳型別change 了，Postgres 不允許 create or replace 直接改，先 drop。
drop function if exists get_program_status(text);

create or replace function get_program_status(pid text)
returns table(title text, brand text, status text, reject_reason text, slug text) as $$
  select title, brand, status, reject_reason, slug from programs where id = pid;
$$ language sql stable security definer;


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


-- ============================================================
-- schema_v17_profile_edit.sql — 2026-07-28
-- 目的：大使能自助編輯名片。已上架的改完直接生效（不下架重審），
--       只在後台留「修改過」標記供抽查；被退回的看得到原因。
--
-- ⚠️ 同時修既有漏洞：prof_update_own 允許本人 update 任何欄位（含 status），
--    等於懂技術的人可直接打 API 把自己名片改成 live 跳過審核。
--    修法＝寫入全走 security definer RPC（status 由後端決定），收掉本人直接寫的 policy。
--
-- 冪等：全部 if not exists / create or replace / drop if exists，可重複執行。
-- ============================================================

-- 1) 兩個新欄位
alter table profiles add column if not exists edited_at timestamptz;      -- 上架後被本人修改的時間（後台抽查用）
alter table profiles add column if not exists reject_reason text;          -- 退回原因（大使在會員頁看得到）

-- 2) 名片寫入唯一入口：status 由後端決定，前端傳什麼都沒用
--    無名片 → pending；rejected → 轉 pending 並清原因；pending → 維持 pending；
--    live → 維持 live 並蓋 edited_at（＝直接生效策略）
create or replace function save_my_profile(form jsonb)
returns text as $$
declare
  uid uuid := auth.uid();
  cur text;
  next_status text;
begin
  if uid is null then
    raise exception '請先登入';
  end if;

  select status into cur from profiles where user_id = uid;

  if cur is null then
    next_status := 'pending';
  elsif cur = 'live' then
    next_status := 'live';
  else
    next_status := 'pending';   -- pending 維持待審；rejected 重送轉回待審
  end if;

  insert into profiles (
    user_id, nickname, avatar, avatar_url, school, grade, headline,
    skills, experiences, ig_url, contact_open, status, edited_at, reject_reason
  ) values (
    uid,
    form->>'nickname',
    coalesce(nullif(form->>'avatar', ''), '👤'),
    nullif(form->>'avatar_url', ''),
    form->>'school',
    form->>'grade',
    form->>'headline',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(form->'skills', '[]'::jsonb)) x), '{}'),
    coalesce(form->'experiences', '[]'::jsonb),
    nullif(form->>'ig_url', ''),
    coalesce((form->>'contact_open')::boolean, false),
    next_status,
    case when next_status = 'live' then now() else null end,
    null
  )
  on conflict (user_id) do update set
    nickname     = excluded.nickname,
    avatar       = excluded.avatar,
    -- 沒重傳照片就沿用舊的（前端不傳 avatar_url 時不該把既有照片清掉）
    avatar_url   = coalesce(excluded.avatar_url, profiles.avatar_url),
    school       = excluded.school,
    grade        = excluded.grade,
    headline     = excluded.headline,
    skills       = excluded.skills,
    experiences  = excluded.experiences,
    ig_url       = excluded.ig_url,
    contact_open = excluded.contact_open,
    status       = excluded.status,
    edited_at    = excluded.edited_at,
    reject_reason = null;

  return next_status;
end;
$$ language plpgsql security definer;

-- 3) 收掉本人直接寫入的權限（讀取 prof_read、管理員 prof_admin 保留）
drop policy if exists prof_upsert on profiles;
drop policy if exists prof_update_own on profiles;
