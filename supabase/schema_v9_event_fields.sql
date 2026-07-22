-- ============================================================
-- UniEmbassy 增量 schema v9：活動加「報名連結」＋「費用」兩欄（2026-07-22）
-- 在 Supabase SQL Editor 貼上整段執行一次（前面 schema 跑過後才跑這個）。
-- 兩欄都可為 null（選填）；fee 用 text 以支援「免費 / NT$100 / 酌收場地費」等彈性寫法。
-- ============================================================

alter table events add column if not exists signup_url text;
alter table events add column if not exists fee text;
