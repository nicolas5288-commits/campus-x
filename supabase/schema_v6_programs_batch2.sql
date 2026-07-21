-- Campus X — 新計畫第二批（Dcard + 官方頁研究，2026-07-21）
-- 英業達、臺灣企銀 Hokii 為現正招募中（recruiting=true）；KKBOX/敦煌/傳說對決 照實標狀態。
-- 在 Supabase SQL Editor 貼上執行即可。重複執行安全（on conflict 更新）。

insert into programs (id, brand, emoji, category, title, summary, tasks, benefits, eligibility, term, paid, location, deadline, recruiting, recruit_note, source_url, apply_url, status) values

('inventec-2025','英業達 Inventec','💻','3C 科技','英業達 第四屆校園大使',
 '科技業校園大使，深入了解 AI、5G 等產業趨勢，累積行銷實戰經驗，完成任期可獲萬元獎金。',
 ARRAY['推廣英業達雇主品牌與科技產業趨勢','社群經營與行銷實戰','參與校園活動與指定任務'],
 ARRAY['完成任期任務可獲獎金 1 萬元','免費專業形象照拍攝','履歷健診、職涯諮詢','推薦函','交通補助','參與公司大型活動（如運動家庭日）'],
 '大專院校在學學生；對科技業、AI/5G 有興趣，想累積行銷實戰經驗',
 '依屆別公告', true, '全台', '2026-08-07', true,
 '第四屆招募中，履歷先到先審，2026/8/7 截止',
 'https://cpc.mcu.edu.tw/2026/06/10/%E3%80%90%E8%BD%89%E7%9F%A5%E3%80%91%E8%8B%B1%E6%A5%AD%E9%81%94%E7%AC%AC%E5%9B%9B%E5%B1%86%E6%A0%A1%E5%9C%92%E5%A4%A7%E4%BD%BF%E6%8B%9B%E5%8B%9F%E4%B8%AD/',
 'https://cpc.mcu.edu.tw/2026/06/10/%E3%80%90%E8%BD%89%E7%9F%A5%E3%80%91%E8%8B%B1%E6%A5%AD%E9%81%94%E7%AC%AC%E5%9B%9B%E5%B1%86%E6%A0%A1%E5%9C%92%E5%A4%A7%E4%BD%BF%E6%8B%9B%E5%8B%9F%E4%B8%AD/', 'live'),

('twbank-hokii-115','臺灣企銀 Hokii','🏦','金融','臺灣企銀 Hokii 校園大使（115 年）',
 '金融品牌實戰型校園大使，數位金融與社群行銷培訓、Hokii Reels 創意徵選，有機會獨得 2–4 萬獎金。',
 ARRAY['打造黃金履歷代表作','業界導師實戰培訓：數位金融與社群行銷','解鎖大使專屬任務','Hokii Reels 創意影片徵選','兩天實體課程培訓 + 任務執行期'],
 ARRAY['校園大使獎學金','表現優異可獨得 2–4 萬獎金（金獎 4 萬/銀獎 3 萬/銅獎 2 萬）','業界導師親授培訓','與全台菁英建立跨校人脈'],
 '台灣公私立大專 18 歲在校生（大一至碩二），不限國籍；IG 追蹤 500+ 或 FB 好友 300+',
 '培訓 2026/11，任務期 2026/11–2027/1', true, '全台', '2026-09-30', true,
 '115 年招募中，報名至 2026/9/30，擇優錄取 12 名',
 'https://bhuntr.com/tw/competitions/mg4lcrp3d1lug9ycph',
 'https://bhuntr.com/tw/competitions/mg4lcrp3d1lug9ycph', 'live'),

('kkbox-11','KKBOX','🎵','媒體／職涯','KKBOX 校園大使（第 11 屆）',
 '音樂串流品牌校園大使，推廣音樂與品牌活動、經營社群，享免費聽與獎勵金。',
 ARRAY['發揮個人影響力推廣 KKBOX 與音樂活動','社群內容創作與校園推廣','參與品牌指定任務'],
 ARRAY['免費聽 KKBOX','滿滿獎勵金','免費參加音樂活動','與歌手合作機會','豐富培訓課程'],
 '台灣公私立大專院校在學學生；熱愛音樂、樂於分享',
 '依屆別公告', true, '全台', null, false,
 '第 11 屆招募資訊以 KKBOX 官方頁為準',
 'https://campus.kkbox.com/tw/talentselect',
 'https://campus.kkbox.com/tw/talentselect', 'live'),

('caves-2026','敦煌書局 Caves','📚','教育','敦煌校園大使（2026）',
 '成為敦煌書局與大專院校的橋樑，強化品牌印象、發揮個人社群影響力，並接觸不同產業品牌合作。',
 ARRAY['成為敦煌書局與校園的橋樑，強化品牌印象','發揮個人社群影響力推廣','接觸不同產業品牌合作、累積校園實作經驗'],
 ARRAY['多元品牌合作實戰經驗','履歷加分','校園行銷與社群推廣歷練'],
 '全台大專院校學生（2026 年 9 月起就讀大一至大四之本國籍在學學生）；任期學年制',
 '學年制', false, '全台', '2026-06-30', false,
 '2026 梯次報名已於 6/30 截止，關注官方等下屆',
 'https://www.cavescampus.com/campusambassador2026',
 'https://www.cavescampus.com/campusambassador2026', 'live'),

('garena-aov-2025','傳說對決 Garena','🎮','軟體工具','傳說對決 校園大使',
 '遊戲品牌校園大使，參與官方活動企劃、接收最新遊戲資訊，獲得長期合作機會。',
 ARRAY['參與傳說對決官方活動企劃','校園推廣與社群經營','接收並分享最新遊戲資訊'],
 ARRAY['參與官方活動企劃','最新遊戲資訊','長期合作機會','大使專屬福利'],
 '對遊戲有熱情的大專院校學生',
 '依屆別公告', false, '全台', null, false,
 '招募資訊見官方（LINE 社群「傳說對決校園大使」），Dcard 有心得可參考',
 'https://vs.cga.gg/feed/161013',
 'https://vs.cga.gg/feed/161013', 'live')

on conflict (id) do update set
  brand=excluded.brand, emoji=excluded.emoji, category=excluded.category, title=excluded.title,
  summary=excluded.summary, tasks=excluded.tasks, benefits=excluded.benefits, eligibility=excluded.eligibility,
  term=excluded.term, paid=excluded.paid, location=excluded.location, deadline=excluded.deadline,
  recruiting=excluded.recruiting, recruit_note=excluded.recruit_note, source_url=excluded.source_url,
  apply_url=excluded.apply_url, status=excluded.status;
