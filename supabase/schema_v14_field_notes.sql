-- ============================================================
-- schema_v14_field_notes.sql — 2026-07-26
-- 目的：把「補充/回報」升級成逐格建議制（Google 文件建議模式）。
--       使用者針對計畫的某一格（任務/福利/截止日…）提議新內容，
--       admin 在後台看「目前 → 建議」對照，按採用就直接寫進計畫本體。
-- 相容：field 為 null＝舊的自由文字回報，原有資料與流程完全不受影響。
-- 積分：一格存一筆 note，被採用（status='accepted'）即沿用 v10 排行榜的
--       每筆 +10，不需要改排行榜 SQL。
-- 冪等：全部 if not exists，可重複執行。
-- ============================================================

-- 1) 補兩個欄位：field＝格子代號（對應 window.NOTE_FIELDS 的 key）
--    suggest＝建議值，用 jsonb 才能同時裝字串/陣列/布林/日期字串
alter table program_notes add column if not exists field text;
alter table program_notes add column if not exists suggest jsonb;

-- 2) 防重複刷分：同一人對同一計畫的同一格，只能有一筆待審
--    （partial index：只管 pending 且 field 不為 null 的，
--      被採用/退回後可以再補一次，舊的自由文字回報不受限）
create unique index if not exists pnote_one_pending_per_field
  on program_notes (program_id, user_id, field)
  where status = 'pending' and field is not null;
