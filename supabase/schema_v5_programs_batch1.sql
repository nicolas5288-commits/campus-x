-- Campus X — 新計畫第一批（Dcard 研究 + 官方頁爬取，2026-07-21）
-- 來源皆為公開官方頁/Dcard；狀態照實：多數為往年梯次已截止（recruiting=false），status=live 讓其顯示但標「已截止」。
-- 在 Supabase SQL Editor 貼上執行即可。重複執行安全（on conflict 更新）。

insert into programs (id, brand, emoji, category, title, summary, tasks, benefits, eligibility, term, paid, location, deadline, recruiting, recruit_note, source_url, apply_url, status) values

('104-2025','104 人力銀行','💼','媒體／職涯','104 校園大使（2025）',
 '遠距實習型校園大使，四大組別：社群影音、品牌公關、職涯課程、僑外職涯服務，把校園與職場接軌。',
 ARRAY['社群影音組：經營萬粉 IG、Podcast，共創爆款貼文與影音','品牌公關組：擔任校園講師、籌辦講座、支援品牌活動','職涯課程組：運營 TOP 專班職涯課程','僑外職涯服務組：提出方案解決僑外生留台求職痛點'],
 ARRAY['定額獎學金 3 萬元 + 每月 Uber 點數','遠距實習 + 實體活動交通補助','專業形象照拍攝','免費履歷健診與培訓課程','企業 Mentor 手把手指導','建立全台跨校人脈'],
 '認同 Be A Giver 精神；樂於分享、邏輯清晰、熱心積極；有活動/實習/社團/自媒體經驗加分',
 '約 2025 年（遠距實習）', true, '遠距', '2025-04-13', false,
 '2025 梯次已截止，104 每年約 3–4 月招募，可訂閱通知等下屆',
 'https://www.104.com.tw/jobs/search/?keyword=%E6%A0%A1%E5%9C%92%E5%A4%A7%E4%BD%BF',
 'https://www.104.com.tw/jobs/search/?keyword=%E6%A0%A1%E5%9C%92%E5%A4%A7%E4%BD%BF', 'live'),

('gacc-2026','中華文化總會 文總','🇹🇼','教育','文總校園大使（第五屆）',
 '號召全台大專學生推廣台灣文化，參與國家級文化活動、走讀與講座，並做企劃提案與社群分享。',
 ARRAY['參與文總文化活動、走讀與講座','協助企劃提案與專案執行（每 2–3 月一檔專案）','經營社群、分享台灣文化內容'],
 ARRAY['參與國家級文化活動','企劃與提案技巧培養','遠程交通補貼','新活水雜誌等品牌好禮','結業證書'],
 '台灣大專院校在校生（含研究生），不限國籍；有企劃/社群/攝影設計經驗加分',
 '約一年（密集準備時每週 3–5 小時，平時每週 0.5–1 小時）', false, '全台', '2026-06-21', false,
 '第五屆報名 5–6 月已截止，關注文總官方等下屆',
 'https://www.gacc.org.tw/TW/campus-ambassador',
 'https://www.gacc.org.tw/TW/campus-ambassador', 'live'),

('skyline-12','Skyline','✈️','媒體／職涯','Skyline 第十二屆校園大使',
 '國際機會平台校園大使，翻譯推廣海外機會、經營社群、支援國際活動，走進世界。',
 ARRAY['每月 1–2 篇國際機會翻譯、上架與推廣','Skyline 品牌與計畫活動宣傳','協助粉專與社群經營','線上/線下國際活動支援','校園國際活動回報'],
 ARRAY['補助參與海外活動一名','優先取得海外職缺/實習資訊','免費海外職涯分享講座','三次培訓課程','優秀者推薦函與實習機會','結業證書、履歷健檢、志工服務時數'],
 '國內公私立大專在校生；具基本英翻中能力（多益 650 以上）；活潑外向、積極',
 '2024/02 – 2024/08（第十二屆）', false, '全台／線上', '2024-01-19', false,
 '第十二屆已截止，最新梯次請見 Skyline 平台',
 'https://skyline.tw/activity/12thambassador',
 'https://skyline.tw/activity/12thambassador', 'live'),

('casetify-2025','CASETiFY','📱','時尚配件','CASETiFY 校園大使',
 '3C 時尚配件品牌校園大使，推廣品牌、經營社群、參與線下活動，換取公關品與任務獎金。',
 ARRAY['社群內容創作：IG/Threads/Dcard 撰寫分享文、美編拍照','品牌推廣與好友專屬折扣','完成品牌指定任務'],
 ARRAY['品牌公關品','任務獎金','線下活動拓展人脈','相關培訓課程','履歷加分'],
 '台灣大專院校在學學生；喜歡品牌、樂於分享',
 '依品牌公告', false, '全台', null, false,
 '招募時間見品牌官方 IG，Dcard 有學長姐心得可參考',
 'https://www.dcard.tw/f/job/p/257407012',
 'https://www.dcard.tw/f/job/p/257407012', 'live')

on conflict (id) do update set
  brand=excluded.brand, emoji=excluded.emoji, category=excluded.category, title=excluded.title,
  summary=excluded.summary, tasks=excluded.tasks, benefits=excluded.benefits, eligibility=excluded.eligibility,
  term=excluded.term, paid=excluded.paid, location=excluded.location, deadline=excluded.deadline,
  recruiting=excluded.recruiting, recruit_note=excluded.recruit_note, source_url=excluded.source_url,
  apply_url=excluded.apply_url, status=excluded.status;
