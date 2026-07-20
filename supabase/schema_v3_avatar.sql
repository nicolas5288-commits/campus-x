-- ============================================================
-- Campus X 增量 schema v3：名片頭貼照片上傳
-- （Supabase SQL Editor 貼上整段執行一次）
-- ============================================================

-- profiles 加照片欄位（與 emoji avatar 並存，顯示優先用照片）
alter table profiles add column if not exists avatar_url text;

-- 建 avatars storage bucket（公開讀取）
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage 權限：任何人可讀、登入者可上傳/覆蓋自己的
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_auth_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_auth_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
