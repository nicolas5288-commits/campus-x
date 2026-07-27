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
