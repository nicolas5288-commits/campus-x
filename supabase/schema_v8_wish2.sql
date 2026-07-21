-- ============================================================
-- Campus X 增量 schema v8：名片治理 + 許願池 2.0（2026-07-22）
-- ① profile_reports：名片檢舉（登入可檢舉、admin 審核）
-- ② brand_wishes / wish_votes：廠商許願公開牆 + 投票
-- ③ feature_wishes：功能許願（私密，只有 admin 看得到）
-- ④ admin_stats 覆蓋：加 brand/feature 計數 + 待處理檢舉數
-- 在 Supabase SQL Editor 貼上整段執行一次（schema.sql + v2~v7 跑過後才跑這個）。
-- 舊 wishes 表照舊不動（歷史私密名單）。
-- ============================================================

-- ---------- ① 名片檢舉 profile_reports ----------
create table if not exists profile_reports (
  id text primary key default gen_random_uuid()::text,
  profile_id uuid not null references profiles(id) on delete cascade,
  reporter_id uuid references auth.users(id) not null,
  reason text not null,          -- 冒充身分 / 資訊不實 / 廣告或詐騙 / 不當內容 / 其他
  content text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz default now()
);

alter table profile_reports enable row level security;
-- 登入者可檢舉（且只能以自己身分、status 必為 pending）
create policy preport_insert on profile_reports for insert
  with check (auth.uid() = reporter_id and status = 'pending');
-- 只有管理員能看與處理（檢舉不公開）
create policy preport_admin_select on profile_reports for select using (is_admin());
create policy preport_admin_update on profile_reports for update using (is_admin());

-- ---------- ② 廠商許願公開牆 brand_wishes ----------
create table if not exists brand_wishes (
  id text primary key default gen_random_uuid()::text,
  brand_name text not null,
  reason text,
  created_by uuid references auth.users(id) not null,
  anonymous boolean not null default false,
  created_at timestamptz default now()
);

alter table brand_wishes enable row level security;
create policy bwish_read on brand_wishes for select using (true);            -- 公開讀（牆）
create policy bwish_insert on brand_wishes for insert
  with check (auth.uid() = created_by);                                      -- 登入才可許願
create policy bwish_admin_delete on brand_wishes for delete using (is_admin()); -- admin 刪垃圾卡

-- ---------- 投票 wish_votes（每人每品牌一票）----------
create table if not exists wish_votes (
  wish_id text not null references brand_wishes(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  primary key (wish_id, user_id)
);

alter table wish_votes enable row level security;
create policy wvote_read on wish_votes for select using (true);              -- 公開讀（算票數）
create policy wvote_insert on wish_votes for insert with check (auth.uid() = user_id);
create policy wvote_delete on wish_votes for delete using (auth.uid() = user_id); -- 收回自己的票

-- ---------- ③ 功能許願 feature_wishes（私密）----------
create table if not exists feature_wishes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table feature_wishes enable row level security;
create policy fwish_insert on feature_wishes for insert with check (auth.uid() = user_id);
create policy fwish_admin_select on feature_wishes for select using (is_admin());
create policy fwish_admin_delete on feature_wishes for delete using (is_admin());

-- ---------- ④ 後台數據 RPC 覆蓋 ----------
-- 加 brand_wishes/feature_wishes 計數（保留舊 wishes 欄避免壞舊引用）+ 待處理檢舉數
create or replace function admin_stats() returns json as $$
  select case when is_admin() then json_build_object(
    'users', (select count(*) from auth.users),
    'favorites', (select count(*) from favorites),
    'subscriptions', (select count(*) from subscriptions),
    'wishes', (select count(*) from wishes),
    'brand_wishes', (select count(*) from brand_wishes),
    'feature_wishes', (select count(*) from feature_wishes),
    'profiles_live', (select count(*) from profiles where status = 'live'),
    'programs_live', (select count(*) from programs where status = 'live'),
    'pending_programs', (select count(*) from programs where status = 'pending'),
    'pending_reviews', (select count(*) from reviews where status = 'pending'),
    'pending_profiles', (select count(*) from profiles where status = 'pending'),
    'pending_events', (select count(*) from events where status = 'pending'),
    'pending_notes', (select count(*) from program_notes where status = 'pending'),
    'pending_reports', (select count(*) from profile_reports where status = 'pending')
  ) else null end;
$$ language sql stable security definer;
