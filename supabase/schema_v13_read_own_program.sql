-- ============================================================
-- schema_v13_read_own_program.sql — 2026-07-22
-- 目的：讓提報人能讀「自己提報的」計畫的所有狀態（含 pending / rejected）。
-- 背景：原本 prog_read_live 只允許看 status='live'（或 admin）→ 學生提報後
--       在會員頁完全看不到自己那筆的審核進度，只能猜（提報上架分享卡需要這個）。
-- 安全：只開放讀「submitted_by = 自己」的列，看不到別人的待審資料。
--       未登入者 auth.uid() 為 null，條件不成立，讀不到任何 pending，安全。
-- 冪等：先 drop 再 create，可重複執行。
-- ============================================================
drop policy if exists prog_read_own on programs;
create policy prog_read_own on programs for select using (auth.uid() = submitted_by);
