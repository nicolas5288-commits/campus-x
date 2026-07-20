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
  recruiting boolean not null default true,   -- true=現正招募 / false=本梯已截止或時間未定
  recruit_note text,                          -- 招募狀態說明（如「隨到隨審」「本梯已截止」）
  source_url text,                            -- 資料來源官方頁
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
-- 大使人脈網：profiles 名片 / events 活動 / event_signups 報名
-- ============================================================
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique not null,
  nickname text not null,
  avatar text default '👤',
  school text, grade text,
  headline text,
  skills text[] default '{}',
  experiences jsonb default '[]',   -- [{programName, cohort, year}]
  ig_url text,
  contact_open boolean not null default false,
  badges text[] default '{}',       -- 'verified' / 'founding'（由管理員授予）
  status text not null default 'pending' check (status in ('pending','live','rejected')),
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid references auth.users(id) not null,
  title text not null,
  type text not null,
  description text,
  event_at timestamptz,
  location_type text default 'offline' check (location_type in ('online','offline')),
  location text,
  capacity int,
  status text not null default 'pending' check (status in ('pending','live','rejected','done')),
  created_at timestamptz default now()
);

create table event_signups (
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

alter table profiles enable row level security;
alter table events enable row level security;
alter table event_signups enable row level security;

-- profiles：大家看 live；本人看自己的；管理員看全部
create policy prof_read on profiles for select using (status = 'live' or auth.uid() = user_id or is_admin());
create policy prof_upsert on profiles for insert with check (auth.uid() = user_id and status = 'pending');
create policy prof_update_own on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy prof_admin on profiles for update using (is_admin());

-- events：大家看 live；本人看自己的；管理員看全部
create policy ev_read on events for select using (status = 'live' or auth.uid() = host_user_id or is_admin());
-- 發起需為「認證大使」（badges 含 verified 的 live 名片）
create policy ev_insert on events for insert with check (
  status = 'pending' and auth.uid() = host_user_id and exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.status = 'live' and 'verified' = any(p.badges)
  )
);
create policy ev_admin on events for update using (is_admin());

-- event_signups：報名需有 live 名片；只能操作自己的；報名者名單所有登入者可讀（看誰會去）
create policy sign_read on event_signups for select using (true);
create policy sign_insert on event_signups for insert with check (
  auth.uid() = user_id and exists (select 1 from profiles p where p.user_id = auth.uid() and p.status = 'live')
);
create policy sign_delete on event_signups for delete using (auth.uid() = user_id);

-- ============================================================
-- 廠商查稿 RPC：知道編號的人可查該筆狀態（security definer 繞過 RLS，
-- 但只回傳單筆的標題/狀態/退回原因，不會外洩其他待審資料）
-- ============================================================
create or replace function get_program_status(pid text)
returns table(title text, brand text, status text, reject_reason text) as $$
  select title, brand, status, reject_reason from programs where id = pid;
$$ language sql stable security definer;

-- ============================================================
-- SEED 真實計畫資料（10 筆 live + 1 筆 pending）
-- 由公開官方頁面查證，附 source_url；查證日 2026-07-20
-- recruiting=true 現正招募 / false 本梯已截止或時間未定
-- ============================================================
insert into programs (id, brand, emoji, category, title, summary, tasks, benefits, eligibility, term, paid, location, deadline, recruiting, recruit_note, source_url, apply_url, status) values
('itri-2026','工業技術研究院 ITRI','🔬','3C 科技','工研院 第四屆校園大使','把科技研發轉譯成大眾易懂內容，經營社群、串聯校園與工研院資源。',
 ARRAY['研發體驗推廣：參與工研院各單位活動，將科技研發轉化為學生易懂資訊','社群經營與內容創作：經營 LINE@、Instagram，短影音製作','校園連接器：參與線上與實體活動，串聯校園與工研院資源'],
 ARRAY['時薪 220 元','遠距工作（每月至少 4 小時）','走進科技研發場域','個人影響力經營'],
 '大專院校在校生（不限科系，跨領域尤佳）；影音剪輯/社群/文案/社團幹部經驗加分','2026/7 – 2027/7',true,'遠距',null,true,'隨到隨審，建議儘早投遞','https://indigenous-osa.ntunhs.edu.tw/p/406-1049-82569,r2156.php?Lang=zh-tw','https://forms.gle/XhFj2sX8i1zbfLee9','live'),

('advantech-2026','研華科技 Advantech','💡','3C 科技','研華科技 第三屆校園大使','推廣研華雇主品牌、擔任研華與校園橋樑，跨校專案含影片拍攝剪輯。',
 ARRAY['發揮個人社群影響力，推廣研華雇主品牌','擔任研華與校園間的橋樑，舉辦實體校園或企業活動','跨校專案規劃與執行：創意企劃、活動規劃、影片拍攝剪輯'],
 ARRAY['萬元以上獎學金（總獎金最多約 4 萬元）','與實習生共同課程（企業參訪、職涯講座）','履歷健檢、模擬面試','大使證書＋研華獨家好禮','高階主管餐敘、建立人脈'],
 '2027/4/30 前有在學學籍（含研究所），不限學校科系','2026/6 – 2027/4',true,'全台','2026-04-26',false,'本梯報名已截止（每年約 3 月開放，可追官方 IG）','https://mse.site.nthu.edu.tw/p/405-1298-306712,c16775.php?Lang=zh-tw','https://forms.gle/AtyqpNehJsYkqoSs6','live'),

('wits-2026','緯創軟體 WITS','💻','軟體工具','2026 WITS 校園大使計畫','軟體公司校園大使，分雇主品牌、校園經營、國際人才三組別。',
 ARRAY['雇主品牌組：規劃品牌內容活動，推廣 WITS 雇主品牌形象','校園經營組：擔任 WITS 與校園社群橋樑，推廣招募與實習','國際人才組：規劃 WITS 國際人才計畫，連結國際人才社群'],
 ARRAY['完成任務累積點數兌換獎勵金','跨校夥伴企劃合作','相見歡與結業典禮'],
 '國內公私立大專院校在學學生，不限科系與國籍','2026/2 – 2026/5',true,'全台','2026-01-02',false,'本梯報名已截止','https://oga.site.nthu.edu.tw/p/406-1524-301109,r9308.php?Lang=zh-tw','https://forms.gle/doRcQtdP8x6Mkvi87','live'),

('roots-2026','Roots','🦫','時尚配件','Roots 2026 校園穿搭大使','服飾品牌校園穿搭大使，每月萬元商品額度、搶先穿新系列。',
 ARRAY['分享 Roots 穿搭內容（OOTD）','在社群推廣品牌'],
 ARRAY['每月 $5,000 商品額度','搶先穿到品牌最新系列','照片有機會在官方 IG/FB 曝光'],
 '穿搭控學生（詳細條件見官方）','',false,'全台',null,false,'近期招募，報名時間以官方 FB 公告為準','https://www.facebook.com/RootsTaiwan','https://www.facebook.com/RootsTaiwan','live'),

('sstandc-2026','SST&C','👗','時尚配件','SST&C 校園大使','時尚品牌校園大使，透過社群傳遞品牌與穿搭風格。',
 ARRAY['透過社群傳遞 SST&C 品牌理念與穿搭風格','參與內部會議，與跨校夥伴進行企劃發想與執行'],
 ARRAY['報名即贈 500 購物金','最高享 2 萬元好禮','跨校合作培養行銷力'],
 '熱愛時尚、喜愛分享的學生','',false,'全台',null,false,'開放時間以官方頁為準','https://shop.sstandc.com/page/campus','https://shop.sstandc.com/page/campus','live'),

('adecco-2026','藝珂 Adecco','💼','媒體／職涯','2026 第三屆藝珂校園大使計畫','人力資源品牌校園大使，職場探索、雇主品牌調查、業界導師交流。',
 ARRAY['參與雇主品牌調查專案','社群經營','校園活動企劃與執行'],
 ARRAY['專屬培訓','業界導師交流','職場實戰經驗'],
 '全台大專院校學生','',false,'全台',null,false,'報名時間以官方頁為準','https://www.adecco.com/zh-tw/campus-ambassador-2026','https://www.adecco.com/zh-tw/campus-ambassador-2026','live'),

('semi-2026','SEMI Taiwan','🔧','3C 科技','2026 SEMI 校園大使','半導體展會（SEMICON）校園大使，展前培訓＋展會導覽執行，遴選 10 名。',
 ARRAY['參與展前培訓','SEMICON 展會期間學生導覽與現場執行'],
 ARRAY['培養溝通表達能力','產業理解','半導體業界連結'],
 '學生（2026 年預計遴選 10 名）','',false,'全台',null,false,'報名時間以官方頁為準','https://semicontaiwan.org/zh/Campus_Ambassador_Program_2026','https://semicontaiwan.org/zh/Campus_Ambassador_Program_2026','live'),

('glo-2026','GLO','🌍','教育','GLO 第六屆校園大使計畫','國際領導組織校園大使，累積國際人脈與作品集、強化履歷。',
 ARRAY['參與並推廣 GLO 活動與內容'],
 ARRAY['一對一 Mentorship','免費 GLO 活動門票','行銷培訓','官方結業證書'],
 '全國高中生和大學生，須年滿 18 歲，不需經驗','2026/2 – 2026/7',false,'全台','2026-01-25',false,'本梯報名已截止（每年招募）','https://www.gloleadership.org/zh/student-ambassador','https://www.gloleadership.org/zh/student-ambassador','live'),

('frusirnana-2026','美膚娜娜 FRUSIRNANA','💄','美妝','2026 美膚娜娜 第四屆校園大使','美妝保養品牌大使，搶先試用新品、參與品牌行銷過程。',
 ARRAY['試用新品並回饋','參與品牌行銷過程'],
 ARRAY['搶先試用新品','參與美妝品牌行銷'],
 '對美妝保養產業有興趣的學生','',false,'全台',null,false,'報名時間以官方頁為準','https://frusirnana.co/post/1738/','https://frusirnana.co/activities','live'),

('unilever-2026','聯合利華 Unilever','🧴','消費品','2026 聯合利華校園大使','作為聯合利華與校園人才的橋樑，參與雇主品牌推廣與校園活動。',
 ARRAY['校園招募、雇主品牌推廣','線上與線下校園活動規劃與執行'],
 ARRAY[]::text[],
 '大專院校在學學生','',false,'全台','2026-07-13',false,'本梯報名已截止（每年招募，可追官方 IG）','https://www.instagram.com/p/DZZu6UsmnEh/','https://www.instagram.com/p/DZZu6UsmnEh/','live'),

('demo-pending-01','範例新品牌','🆕','3C 科技','（待審範例）某科技新創校園大使','這是一筆廠商剛投稿、還沒審核的計畫。',
 ARRAY['校園推廣','社群經營'],
 ARRAY['獎金','實習機會'],
 '全台大專院校在學學生','一學期',true,'全台','2026-10-01',true,null,null,'https://example.com/apply/demo','pending');
