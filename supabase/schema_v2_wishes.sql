-- ============================================================
-- Campus X 增量 schema v2：許願池 + 後台數據 RPC
-- （在 Supabase SQL Editor 貼上整段執行一次；schema.sql 之後才跑這個）
-- ============================================================

-- ---------- 許願池 wishes ----------
create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  brand_name text not null,
  reason text,
  created_at timestamptz default now()
);

alter table wishes enable row level security;
-- 登入者可許願（新增）；只有管理員看得到清單（許願不公開上牆）
create policy wish_insert on wishes for insert with check (auth.uid() = user_id);
create policy wish_admin_read on wishes for select using (is_admin());

-- ---------- 後台數據 RPC ----------
-- 註冊人數：前台公開金鑰讀不到 auth.users，用 security definer 只回一個數字（不外洩個資）
create or replace function count_users() returns integer as $$
  select count(*)::int from auth.users;
$$ language sql stable security definer;

-- 各表統計（內建管理員檢查；非管理員呼叫直接報錯）
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
    'pending_events', (select count(*) from events where status = 'pending')
  ) else null end;
$$ language sql stable security definer;

-- 許願清單（依品牌彙總，票數多的排前面）＝廠商開發名單
create or replace function admin_wishes() returns table(brand_name text, votes bigint, latest timestamptz) as $$
  select brand_name, count(*) as votes, max(created_at) as latest
  from wishes
  where is_admin()
  group by brand_name
  order by votes desc, latest desc;
$$ language sql stable security definer;
