-- ============================================================
-- schema_v12_admin_delete.sql
-- 目的：讓 admin 能「永久刪除」待審佇列裡的垃圾資料（不可逆硬刪）
-- 背景：現有「退回」只是把 status 改成 'rejected'，資料仍留在表裡累積。
--       這四張表原本沒有 DELETE policy → RLS 會靜默擋掉 admin 的 delete。
--       （許願池 brand_wishes/feature_wishes 早在 v8 就有同款 admin delete policy）
-- 安全：所有子表外鍵都是 on delete cascade（reviews/favorites/program_notes→programs、
--       reports→profiles、event_signups→events），刪父列會自動清子列，不會被 FK 卡住。
--       ⚠️ 正因會 cascade，前端只把按鈕放在「待審佇列」（待審項目還沒有真實子資料）。
-- 冪等：先 drop 再 create，可重複執行。
-- ============================================================

-- 計畫投稿（廠商投稿 / 學生提報）
drop policy if exists prog_admin_delete on programs;
create policy prog_admin_delete on programs for delete using (is_admin());

-- 學生心得
drop policy if exists rev_admin_delete on reviews;
create policy rev_admin_delete on reviews for delete using (is_admin());

-- 大使名片
drop policy if exists prof_admin_delete on profiles;
create policy prof_admin_delete on profiles for delete using (is_admin());

-- 活動
drop policy if exists ev_admin_delete on events;
create policy ev_admin_delete on events for delete using (is_admin());
