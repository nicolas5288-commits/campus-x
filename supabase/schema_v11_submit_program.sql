-- ============================================================
-- v11：提報/投稿改走 RPC（修 RLS 提報爆掉的坑）— 2026-07-22
-- 問題：db.js 原本 insert 後接 .select('id') 要回編號，
--      Postgres 規定「寫完要讀回」得通過 select 權限，
--      但 pending 只有 admin 看得到 → 一般用戶/廠商提報整筆被退，
--      跳「new row violates row-level security policy for table "programs"」
--      （admin 自己測不會中，所以之前沒發現）
-- 修法：security definer 函式代為寫入並回傳編號；
--      status 強制 pending、submitted_by 強制取 auth.uid()，前端傳不進來
-- ============================================================
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
  return new_id;
end;
$$ language plpgsql security definer;
