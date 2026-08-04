-- ============================================================
-- schema_v18_staff_roles.sql — 2026-08-01
-- 目的：後台可以多人審核。Nicolas＝owner（唯一能管權限的人），
--       合作夥伴＝mod（全部審核/退回/下架/永久刪除的權限，但動不了任何人的權限）。
--
-- 核心手法：全站幾十條 policy 都引用同一個 is_admin()，
--          只要把它從「寫死一個 email」改成「查 staff 名單表」，
--          夥伴就自動繼承全部審核權限，一條 policy 都不用重寫。
--
-- ⚠️ 遞迴坑：staff 自己的 policy 會呼叫 is_owner() → is_owner() 又要查 staff
--    → 無限遞迴直接爆掉。解法＝兩個函式都用 security definer
--    （以函式擁有者身分執行、繞過 staff 的 RLS），遞迴就斷開了。
--    這樣不會有權限外洩：函式不收參數，只拿呼叫者自己的 JWT email 去比對。
--
-- 冪等：全部 if not exists / create or replace / drop if exists，可重複執行。
-- ============================================================

-- 1) 團隊名單表
create table if not exists staff (
  email    text primary key check (email = lower(email)),   -- 一律小寫，避免大小寫造成漏判
  role     text not null check (role in ('owner', 'mod')),
  added_at timestamptz default now(),
  added_by text                                             -- 誰加的（稽核用）
);

alter table staff enable row level security;

-- 2) 把現有的 owner 放進名單（原本寫死在 is_admin() 裡的那個 email）
insert into staff (email, role) values ('chiwen5288@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

-- 3) 改寫 is_admin()：從「比對寫死 email」→「查 staff 名單」
--    簽名不變 → 全站既有 policy 原封不動繼續生效
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from staff where email = lower(auth.jwt()->>'email')
  );
$$ language sql stable security definer set search_path = public;

-- 4) is_owner()：只有 owner 才能改權限名單
create or replace function is_owner() returns boolean as $$
  select exists (
    select 1 from staff where email = lower(auth.jwt()->>'email') and role = 'owner'
  );
$$ language sql stable security definer set search_path = public;

-- 5) 前端判斷身分用（回 'owner' / 'mod' / null）
create or replace function get_my_role() returns text as $$
  select role from staff where email = lower(auth.jwt()->>'email');
$$ language sql stable security definer set search_path = public;

-- 6) staff 表的權限：夥伴看得到名單（只讀），只有 owner 能增刪改
--    → 「夥伴不能更動別人權限」由資料庫保證，不是靠前端把按鈕藏起來
drop policy if exists staff_read   on staff;
drop policy if exists staff_insert on staff;
drop policy if exists staff_update on staff;
drop policy if exists staff_delete on staff;

create policy staff_read   on staff for select using (is_admin());
create policy staff_insert on staff for insert with check (is_owner() and role = 'mod');  -- 只能加夥伴，不能長出第二個 owner
create policy staff_update on staff for update using (is_owner() and role = 'mod') with check (role = 'mod');
create policy staff_delete on staff for delete using (is_owner() and role <> 'owner');    -- owner 那列刪不掉（防手滑把自己踢掉、鎖死後台）

-- ============================================================
-- 跑完自我檢查（在 SQL Editor 用 owner 帳號跑）：
--   select is_admin(), is_owner(), get_my_role();   -- 應回 true, true, owner
--   select * from staff;                            -- 應看得到自己那列
-- 若 select is_admin() 卡住或報 stack depth exceeded
--   ＝ security definer 沒生效，回頭檢查第 3、4 段有沒有漏掉
-- ============================================================
