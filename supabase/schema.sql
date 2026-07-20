-- ============================================================
-- Campus X 資料庫 schema（在 Supabase SQL Editor 貼上整段執行一次）
-- 4 張表：programs（計畫）/ favorites（收藏）/ reviews（學長姐心得）/ subscriptions（訂閱）
-- 安全靠 RLS（Row Level Security）權限規則，publishable key 設計來公開沒關係
-- 執行前：把最底下 SEED 區塊裡的 admin email 改成你的（審核權限用）
-- ============================================================

-- ---------- 1. programs 計畫 ----------
create table programs (
  id text primary key default gen_random_uuid()::text,
  brand text not null,
  emoji text default '📌',
  category text not null,
  title text not null,
  summary text,
  tasks text[] default '{}',
  benefits text[] default '{}',
  eligibility text,
  term text,
  paid boolean not null default false,
  location text,
  deadline date,
  apply_url text,
  status text not null default 'pending' check (status in ('pending','live','rejected','closed')),
  reject_reason text,
  submitted_by uuid references auth.users(id),   -- 廠商投稿免登入，這欄可為 null
  created_at timestamptz default now()
);

-- ---------- 2. favorites 收藏（綁學生帳號）----------
create table favorites (
  user_id uuid references auth.users(id) not null,
  program_id text references programs(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, program_id)
);

-- ---------- 3. reviews 學長姐心得（Phase 3 才做 UI，表先建好）----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  program_id text references programs(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('interview','experience')),
  anonymous boolean not null default false,
  rating int check (rating between 1 and 5),
  -- 面試經驗欄
  process text, questions text, tips text, result text,
  -- 參與心得欄
  workload text, gains text, advice text,
  -- 共用選填補充
  extra text,
  status text not null default 'pending' check (status in ('pending','live','rejected')),
  reject_reason text,
  created_at timestamptz default now()
);

-- ---------- 4. subscriptions 訂閱通知（免登入，留 email 即可）----------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  categories text[] default '{}',   -- 空陣列 = 訂閱全部
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (email)
);

-- ============================================================
-- RLS 權限規則
-- ============================================================
alter table programs enable row level security;
alter table favorites enable row level security;
alter table reviews enable row level security;
alter table subscriptions enable row level security;

-- 管理員判斷：用一個 helper function 讀 JWT email，之後換 admin 只改一個地方
create or replace function is_admin() returns boolean as $$
  select auth.jwt()->>'email' = 'CHANGE_ME@example.com';   -- ← 改成你的 email
$$ language sql stable;

-- programs：所有人看得到 live；管理員看得到全部
create policy prog_read_live on programs for select using (status = 'live' or is_admin());
-- 廠商投稿免登入，只能新增 status=pending 的資料
create policy prog_insert on programs for insert with check (status = 'pending');
-- 只有管理員能改（審核上架 / 退回）
create policy prog_admin_update on programs for update using (is_admin());

-- favorites：學生只能操作自己的收藏
create policy fav_all on favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reviews：所有人看 live；作者看得到自己的；管理員看全部
create policy rev_read on reviews for select
  using (status = 'live' or auth.uid() = user_id or is_admin());
-- 登入學生才能發，且只能發 pending、綁自己
create policy rev_insert on reviews for insert
  with check (auth.uid() = user_id and status = 'pending');
-- 管理員審核
create policy rev_admin_update on reviews for update using (is_admin());

-- subscriptions：任何人可訂閱（新增）；只有管理員能讀清單（防外洩名單）
create policy sub_insert on subscriptions for insert with check (true);
create policy sub_admin_read on subscriptions for select using (is_admin());

-- ============================================================
-- 廠商查稿 RPC：知道編號的人可查該筆狀態（security definer 繞過 RLS，
-- 但只回傳單筆的標題/狀態/退回原因，不會外洩其他待審資料）
-- ============================================================
create or replace function get_program_status(pid text)
returns table(title text, brand text, status text, reject_reason text) as $$
  select title, brand, status, reject_reason from programs where id = pid;
$$ language sql stable security definer;

-- ============================================================
-- SEED 範例資料（10 筆 live + 1 筆 pending）
-- ============================================================
insert into programs (id, brand, emoji, category, title, summary, tasks, benefits, eligibility, term, paid, location, deadline, apply_url, status) values
('jlab-01','JLab 校園大使','🎧','3C 科技','第 1 屆 JLab 校園大使招募','耳機品牌校園推廣，新品搶先體驗＋每月任務獎金。',
 ARRAY['在校園與個人社群分享 JLab 產品使用心得','完成每月指定推廣任務（貼文、限動、開箱）','回饋校園使用者真實反饋給品牌'],
 ARRAY['每月任務獎金','新品耳機搶先體驗','專業形象照拍攝','結業證明'],
 '全台大專院校在學學生','一學期（可續任）',true,'全台','2026-08-31','https://example.com/apply/jlab','live'),

('foodpanda-01','foodpanda','🐼','餐飲外送','foodpanda 校園大使','積極、勇於挑戰、有團隊精神者優先，萬元結業獎金。',
 ARRAY['校園內品牌推廣與活動擺攤','協助校園行銷專案執行','回報校園市場觀察'],
 ARRAY['萬元結業獎金','結業證書','內部職缺優先面試','主管推薦信','履歷健檢'],
 '全台大專院校在學學生','一學年',true,'全台','2026-09-15','https://example.com/apply/foodpanda','live'),

('unilever-01','聯合利華 Unilever','🧴','消費品','2026 聯合利華校園大使','作為品牌與校園人才的橋樑，參與雇主品牌推廣。',
 ARRAY['校園招募、雇主品牌推廣','線上與線下校園活動規劃與執行','用鏡頭與創意讓品牌走進學生'],
 ARRAY['實習機會','品牌活動參與','職涯資源','推薦函'],
 '大學三年級以上（含研究所）','一學年',true,'北部為主','2026-08-20','https://example.com/apply/unilever','live'),

('sinopac-01','永豐銀行','🏦','金融','永豐銀行第三屆校園大使','經營人資官方 IG、策劃校園活動，擔任品牌與校方橋樑。',
 ARRAY['經營永豐人資官方 IG','策劃與執行校園活動專案','擔任品牌與校方間的溝通橋樑'],
 ARRAY['大使專屬福利','金融業實習機會','職涯輔導','結業證明'],
 '全台大專院校在學學生','一學年',true,'全台','2026-08-10','https://example.com/apply/sinopac','live'),

('notion-01','Notion Campus Leaders','📝','軟體工具','Notion 校園領袖計畫','在校內推廣 Notion，舉辦工作坊，建立校園社群。',
 ARRAY['在校內推廣 Notion 使用','舉辦 Notion 工作坊與教學','建立並經營校園使用者社群'],
 ARRAY['Notion 官方認證','全球社群人脈','獨家周邊','履歷加分'],
 '全台大專院校在學學生','一學期',false,'全台','2026-07-31','https://example.com/apply/notion','live'),

('etude-01','ETUDE 伊蒂之屋','💄','美妝','ETUDE 校園甜派員','美妝品牌校園推廣，新品體驗＋社群分享。',
 ARRAY['校園社群美妝內容分享','新品體驗與心得回饋','協助校園活動推廣'],
 ARRAY['新品試用','品牌贈品','社群曝光','結業證明'],
 '全台大專院校在學學生','一學期',false,'全台','2026-07-25','https://example.com/apply/etude','live'),

('robinmay-01','ROBINMAY','👜','時尚配件','ROBINMAY 校園大使','包款品牌校園推廣，穿搭內容創作。',
 ARRAY['品牌包款穿搭內容創作','校園社群推廣','活動協助'],
 ARRAY['產品贈送','拍攝合作機會','社群曝光'],
 '全台大專院校在學學生','一學期',false,'全台','2026-08-05','https://example.com/apply/robinmay','live'),

('104-01','104 人力銀行','💼','媒體／職涯','104 校園大使（社群播客／品牌公關／職涯課程）','全遠距實習，提早累積職場經驗。分社群、公關、課程三組。',
 ARRAY['社群播客內容製作','品牌公關專案協助','職涯課程規劃支援'],
 ARRAY['全遠距實習','職場經驗','實習證明','職涯資源'],
 '大學生、專科生及研究生','一學年',true,'遠距','2026-09-30','https://example.com/apply/104','live'),

('starroad-01','StarRoad × Skyline','✈️','旅遊','StarRoad 第四屆校園大使','參與品牌營運與社群經營，表現優異可獲實習與推薦函。',
 ARRAY['品牌營運參與','社群經營','校園推廣活動'],
 ARRAY['品牌系統實習機會','主品牌 Skyline 機會補助','年度推薦函'],
 '全台大專院校在學學生','一學年',false,'全台','2026-08-18','https://example.com/apply/starroad','live'),

('dunhuang-01','敦煌書局','📚','教育','2026 敦煌校園大使招募計畫','全台大專院校大一到大三學生皆可報名，任期學年制。',
 ARRAY['校園語言學習資源推廣','社群內容經營','校園活動協助'],
 ARRAY['產品資源','社群曝光','結業證明'],
 '全台大專院校大一到大三學生','一學年',false,'全台','2026-07-22','https://example.com/apply/dunhuang','live'),

('demo-pending-01','範例新品牌','🆕','3C 科技','（待審範例）某科技新創校園大使','這是一筆廠商剛投稿、還沒審核的計畫。',
 ARRAY['校園推廣','社群經營'],
 ARRAY['獎金','實習機會'],
 '全台大專院校在學學生','一學期',true,'全台','2026-10-01','https://example.com/apply/demo','pending');
