-- ============================================================
-- Campus X 增量 schema v4：會員個人檔案 accounts
-- （Supabase SQL Editor 貼上整段執行一次）
-- 「個人檔案」= 每個會員的基本身分（暱稱＋頭貼），自己設、即時、不審核。
-- 跟「大使名片」(profiles，公開展示要審核) 是分開的兩件事。
-- ============================================================
create table if not exists accounts (
  user_id uuid primary key references auth.users(id),
  nickname text,
  avatar_url text,               -- 上傳的頭貼（存 avatars bucket）
  updated_at timestamptz default now()
);

alter table accounts enable row level security;
-- 公開可讀（心得作者、活動報名名單要顯示暱稱+頭貼）；只有本人能寫自己的
create policy acc_read on accounts for select using (true);
create policy acc_insert on accounts for insert with check (auth.uid() = user_id);
create policy acc_update on accounts for update using (auth.uid() = user_id);
