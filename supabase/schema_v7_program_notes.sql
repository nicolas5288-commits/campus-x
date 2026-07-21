-- ============================================================
-- Campus X 增量 schema v7：計畫補充/回報 program_notes（2026-07-21）
-- 用戶對某計畫提出「資訊有誤 / 已截止或重開 / 連結失效 / 其他補充」，
-- 只有管理員看得到（當情報，Nicolas 再用編輯功能更新計畫本體，不公開顯示）。
-- 在 Supabase SQL Editor 貼上整段執行一次（schema.sql + v2 跑過後才跑這個）。
-- ============================================================

create table if not exists program_notes (
  id text primary key default gen_random_uuid()::text,
  program_id text not null references programs(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  type text not null,            -- 資訊有誤 / 已截止或重開 / 連結失效 / 其他補充
  content text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

alter table program_notes enable row level security;
-- 登入者可新增（且只能以自己身分、status 必為 pending）
create policy pnote_insert on program_notes for insert
  with check (auth.uid() = user_id and status = 'pending');
-- 只有管理員能看與處理（回報不公開）
create policy pnote_admin_select on program_notes for select using (is_admin());
create policy pnote_admin_update on program_notes for update using (is_admin());

-- 後台數據 RPC 覆蓋（加待審補充數 pending_notes）
create or replace function admin_stats() returns json as $$
  select case when is_admin() then json_build_object(
    'users', (select count(*) from auth.users),
    'favorites', (select count(*) from favorites),
    'subscriptions', (select count(*) from subscriptions),
    'wishes', (select count(*) from wishes),
    'profiles_live', (select count(*) from profiles where status = 'live'),
    'programs_live', (select count(*) from programs where status = 'live'),
    'pending_programs', (select count(*) from programs where status = 'pending'),
    'pending_reviews', (select count(*) from reviews where status = 'pending'),
    'pending_profiles', (select count(*) from profiles where status = 'pending'),
    'pending_events', (select count(*) from events where status = 'pending'),
    'pending_notes', (select count(*) from program_notes where status = 'pending')
  ) else null end;
$$ language sql stable security definer;
