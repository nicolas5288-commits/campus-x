// 校園大使計畫範例資料（Phase 1 假資料，Phase 2 改由 Supabase 提供）
// 依真實計畫改編：JLab、foodpanda、聯合利華、永豐銀行、Notion、ETUDE、ROBINMAY、104、敦煌書局、StarRoad
// status: pending(待審) / live(上架) / rejected(退回) / closed(已截止)

window.PROGRAMS = [
  {
    id: "jlab-01",
    brand: "JLab 校園大使",
    emoji: "🎧",
    category: "3C 科技",
    title: "第 1 屆 JLab 校園大使招募",
    summary: "耳機品牌校園推廣，新品搶先體驗＋每月任務獎金。",
    tasks: [
      "在校園與個人社群分享 JLab 產品使用心得",
      "完成每月指定推廣任務（貼文、限動、開箱）",
      "回饋校園使用者真實反饋給品牌"
    ],
    benefits: ["每月任務獎金", "新品耳機搶先體驗", "專業形象照拍攝", "結業證明"],
    eligibility: "全台大專院校在學學生",
    term: "一學期（可續任）",
    paid: true,
    location: "全台",
    deadline: "2026-08-31",
    applyUrl: "https://example.com/apply/jlab",
    status: "live"
  },
  {
    id: "foodpanda-01",
    brand: "foodpanda",
    emoji: "🐼",
    category: "餐飲外送",
    title: "foodpanda 校園大使",
    summary: "積極、勇於挑戰、有團隊精神者優先，萬元結業獎金。",
    tasks: [
      "校園內品牌推廣與活動擺攤",
      "協助校園行銷專案執行",
      "回報校園市場觀察"
    ],
    benefits: ["萬元結業獎金", "結業證書", "內部職缺優先面試", "主管推薦信", "履歷健檢"],
    eligibility: "全台大專院校在學學生",
    term: "一學年",
    paid: true,
    location: "全台",
    deadline: "2026-09-15",
    applyUrl: "https://example.com/apply/foodpanda",
    status: "live"
  },
  {
    id: "unilever-01",
    brand: "聯合利華 Unilever",
    emoji: "🧴",
    category: "消費品",
    title: "2026 聯合利華校園大使",
    summary: "作為品牌與校園人才的橋樑，參與雇主品牌推廣。",
    tasks: [
      "校園招募、雇主品牌推廣",
      "線上與線下校園活動規劃與執行",
      "用鏡頭與創意讓品牌走進學生"
    ],
    benefits: ["實習機會", "品牌活動參與", "職涯資源", "推薦函"],
    eligibility: "大學三年級以上（含研究所）",
    term: "一學年",
    paid: true,
    location: "北部為主",
    deadline: "2026-08-20",
    applyUrl: "https://example.com/apply/unilever",
    status: "live"
  },
  {
    id: "sinopac-01",
    brand: "永豐銀行",
    emoji: "🏦",
    category: "金融",
    title: "永豐銀行第三屆校園大使",
    summary: "經營人資官方 IG、策劃校園活動，擔任品牌與校方橋樑。",
    tasks: [
      "經營永豐人資官方 IG",
      "策劃與執行校園活動專案",
      "擔任品牌與校方間的溝通橋樑"
    ],
    benefits: ["大使專屬福利", "金融業實習機會", "職涯輔導", "結業證明"],
    eligibility: "全台大專院校在學學生",
    term: "一學年",
    paid: true,
    location: "全台",
    deadline: "2026-08-10",
    applyUrl: "https://example.com/apply/sinopac",
    status: "live"
  },
  {
    id: "notion-01",
    brand: "Notion Campus Leaders",
    emoji: "📝",
    category: "軟體工具",
    title: "Notion 校園領袖計畫",
    summary: "在校內推廣 Notion，舉辦工作坊，建立校園社群。",
    tasks: [
      "在校內推廣 Notion 使用",
      "舉辦 Notion 工作坊與教學",
      "建立並經營校園使用者社群"
    ],
    benefits: ["Notion 官方認證", "全球社群人脈", "獨家周邊", "履歷加分"],
    eligibility: "全台大專院校在學學生",
    term: "一學期",
    paid: false,
    location: "全台",
    deadline: "2026-07-31",
    applyUrl: "https://example.com/apply/notion",
    status: "live"
  },
  {
    id: "etude-01",
    brand: "ETUDE 伊蒂之屋",
    emoji: "💄",
    category: "美妝",
    title: "ETUDE 校園甜派員",
    summary: "美妝品牌校園推廣，新品體驗＋社群分享。",
    tasks: [
      "校園社群美妝內容分享",
      "新品體驗與心得回饋",
      "協助校園活動推廣"
    ],
    benefits: ["新品試用", "品牌贈品", "社群曝光", "結業證明"],
    eligibility: "全台大專院校在學學生",
    term: "一學期",
    paid: false,
    location: "全台",
    deadline: "2026-07-25",
    applyUrl: "https://example.com/apply/etude",
    status: "live"
  },
  {
    id: "robinmay-01",
    brand: "ROBINMAY",
    emoji: "👜",
    category: "時尚配件",
    title: "ROBINMAY 校園大使",
    summary: "包款品牌校園推廣，穿搭內容創作。",
    tasks: [
      "品牌包款穿搭內容創作",
      "校園社群推廣",
      "活動協助"
    ],
    benefits: ["產品贈送", "拍攝合作機會", "社群曝光"],
    eligibility: "全台大專院校在學學生",
    term: "一學期",
    paid: false,
    location: "全台",
    deadline: "2026-08-05",
    applyUrl: "https://example.com/apply/robinmay",
    status: "live"
  },
  {
    id: "104-01",
    brand: "104 人力銀行",
    emoji: "💼",
    category: "媒體／職涯",
    title: "104 校園大使（社群播客／品牌公關／職涯課程）",
    summary: "全遠距實習，提早累積職場經驗。分社群、公關、課程三組。",
    tasks: [
      "社群播客內容製作",
      "品牌公關專案協助",
      "職涯課程規劃支援"
    ],
    benefits: ["全遠距實習", "職場經驗", "實習證明", "職涯資源"],
    eligibility: "大學生、專科生及研究生",
    term: "一學年",
    paid: true,
    location: "遠距",
    deadline: "2026-09-30",
    applyUrl: "https://example.com/apply/104",
    status: "live"
  },
  {
    id: "starroad-01",
    brand: "StarRoad × Skyline",
    emoji: "✈️",
    category: "旅遊",
    title: "StarRoad 第四屆校園大使",
    summary: "參與品牌營運與社群經營，表現優異可獲實習與推薦函。",
    tasks: [
      "品牌營運參與",
      "社群經營",
      "校園推廣活動"
    ],
    benefits: ["品牌系統實習機會", "主品牌 Skyline 機會補助", "年度推薦函"],
    eligibility: "全台大專院校在學學生",
    term: "一學年",
    paid: false,
    location: "全台",
    deadline: "2026-08-18",
    applyUrl: "https://example.com/apply/starroad",
    status: "live"
  },
  {
    id: "dunhuang-01",
    brand: "敦煌書局",
    emoji: "📚",
    category: "教育",
    title: "2026 敦煌校園大使招募計畫",
    summary: "全台大專院校大一到大三學生皆可報名，任期學年制。",
    tasks: [
      "校園語言學習資源推廣",
      "社群內容經營",
      "校園活動協助"
    ],
    benefits: ["產品資源", "社群曝光", "結業證明"],
    eligibility: "全台大專院校大一到大三學生",
    term: "一學年",
    paid: false,
    location: "全台",
    deadline: "2026-07-22",
    applyUrl: "https://example.com/apply/dunhuang",
    status: "live"
  },
  // 一筆待審範例（給後台 Phase 3 用）
  {
    id: "demo-pending-01",
    brand: "範例新品牌",
    emoji: "🆕",
    category: "3C 科技",
    title: "（待審範例）某科技新創校園大使",
    summary: "這是一筆廠商剛投稿、還沒審核的計畫。",
    tasks: ["校園推廣", "社群經營"],
    benefits: ["獎金", "實習機會"],
    eligibility: "全台大專院校在學學生",
    term: "一學期",
    paid: true,
    location: "全台",
    deadline: "2026-10-01",
    applyUrl: "https://example.com/apply/demo",
    status: "pending"
  }
];

// 產業分類清單（篩選用）
window.CATEGORIES = [
  "全部", "3C 科技", "軟體工具", "美妝", "消費品", "時尚配件",
  "餐飲外送", "金融", "旅遊", "教育", "媒體／職涯"
];

// ===== 大使人脈網：名片假資料 =====
// status: pending / live / rejected；badges 可含 'verified'（認證）'founding'（創始）
window.PROFILES = [
  {
    id: "p-anna", nickname: "Anna 劉", avatar: "🦊", school: "國立政治大學", grade: "大三",
    headline: "做過 3 個計畫的斜槓大使，最愛跟人聊社群經營",
    skills: ["社群經營", "短影音", "活動企劃"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [
      { programName: "JLab 校園大使", cohort: "第 1 屆", year: "2025" },
      { programName: "foodpanda 校園大使", cohort: "第 3 屆", year: "2024" }
    ],
    badges: ["verified", "founding"], status: "live"
  },
  {
    id: "p-kevin", nickname: "Kevin", avatar: "🐻", school: "國立台灣大學", grade: "大四",
    headline: "金融業實習中，歡迎問我銀行系校園大使的面試",
    skills: ["簡報", "數據分析", "公關"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [{ programName: "永豐銀行校園大使", cohort: "第 3 屆", year: "2025" }],
    badges: ["verified"], status: "live"
  },
  {
    id: "p-mia", nickname: "Mia 陳", avatar: "🐰", school: "國立成功大學", grade: "大二",
    headline: "美妝控，ETUDE 甜派員，喜歡辦南部的大使聚會",
    skills: ["美妝內容", "攝影", "文案"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [{ programName: "ETUDE 校園甜派員", cohort: "第 2 屆", year: "2025" }],
    badges: ["verified", "founding"], status: "live"
  },
  {
    id: "p-leo", nickname: "Leo", avatar: "🐺", school: "國立清華大學", grade: "碩一",
    headline: "工具控，Notion 校園領袖，可以教你把履歷做得很好看",
    skills: ["Notion", "生產力工具", "工作坊帶領"],
    igUrl: "https://instagram.com/", contactOpen: false,
    experiences: [{ programName: "Notion 校園領袖", cohort: "第 1 屆", year: "2025" }],
    badges: ["verified"], status: "live"
  },
  {
    id: "p-sana", nickname: "Sana", avatar: "🐱", school: "輔仁大學", grade: "大三",
    headline: "時尚配件品牌大使，穿搭與拍攝合作找我聊",
    skills: ["穿搭", "拍攝", "選品"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [{ programName: "ROBINMAY 校園大使", cohort: "第 2 屆", year: "2025" }],
    badges: ["founding"], status: "live"
  },
  {
    id: "p-jay", nickname: "Jay 林", avatar: "🦁", school: "國立政治大學", grade: "大四",
    headline: "104 遠距實習組，職涯內容製作，樂意分享求職心得",
    skills: ["Podcast", "職涯諮詢", "剪輯"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [{ programName: "104 校園大使", cohort: "社群播客組", year: "2025" }],
    badges: ["verified"], status: "live"
  },
  {
    id: "p-wei", nickname: "Wei", avatar: "🐨", school: "國立台灣大學", grade: "大二",
    headline: "旅遊魂，StarRoad 大使，想揪跨校的大使一起出遊",
    skills: ["旅遊企劃", "社群", "外語"],
    igUrl: "https://instagram.com/", contactOpen: true,
    experiences: [{ programName: "StarRoad 校園大使", cohort: "第 4 屆", year: "2025" }],
    badges: [], status: "live"
  },
  {
    id: "p-demo-pending", nickname: "（待審名片範例）", avatar: "🆕", school: "某大學", grade: "大一",
    headline: "這是一張剛建立、還沒審核的名片。",
    skills: ["範例"], igUrl: "", contactOpen: false,
    experiences: [{ programName: "某計畫", cohort: "第 1 屆", year: "2026" }],
    badges: [], status: "pending"
  }
];

// ===== 活動假資料 =====
// type 見 EVENT_TYPES；status: pending / live / rejected / done
window.EVENTS = [
  {
    id: "e-01", hostId: "p-anna", title: "校園大使面試攻略分享會（線上）",
    type: "面試攻略分享會",
    description: "找了幾個不同品牌的大使，一起聊面試都被問什麼、履歷怎麼寫。歡迎正在申請的學弟妹來。",
    eventAt: "2026-08-05 19:30", locationType: "online", location: "Google Meet（報名後寄連結）",
    capacity: 30, signupIds: ["p-kevin", "p-mia", "p-jay", "p-wei"], status: "live"
  },
  {
    id: "e-02", hostId: "p-mia", title: "南部大使小聚・台南美食場",
    type: "純吃飯哈拉",
    description: "南部的大使們出來吃個飯認識一下！這次選台南國華街，白天場，吃完可以順便逛。",
    eventAt: "2026-08-10 12:00", locationType: "offline", location: "台南・國華街（報名後公布集合點）",
    capacity: 8, signupIds: ["p-sana"], status: "live"
  },
  {
    id: "e-03", hostId: "p-anna", title: "JLab 第 1 屆同梯聚：一年後我們都在幹嘛",
    type: "同計畫同梯聚",
    description: "JLab 第一屆的夥伴們，一年沒見了！來更新一下近況，順便交換各自的實習/工作情報。",
    eventAt: "2026-08-18 18:30", locationType: "offline", location: "台北・信義區（餐廳待訂）",
    capacity: 15, signupIds: ["p-kevin"], status: "live"
  },
  {
    id: "e-04", hostId: "p-jay", title: "校際交流・履歷健檢工作坊",
    type: "校際交流",
    description: "帶大家用 Notion 做出好看的履歷，現場互相健檢。跨校參加，認識不同學校的大使。",
    eventAt: "2026-08-25 14:00", locationType: "offline", location: "台北・政大公企中心",
    capacity: 20, signupIds: ["p-leo", "p-wei", "p-mia"], status: "live"
  },
  {
    id: "e-demo-pending", hostId: "p-kevin", title: "（待審活動範例）某聚會",
    type: "純吃飯哈拉",
    description: "這是一筆剛發起、還沒審核的活動。",
    eventAt: "2026-09-01 19:00", locationType: "offline", location: "待定",
    capacity: 10, signupIds: [], status: "pending"
  }
];

// 篩選/表單用清單
window.SCHOOLS = ["全部", "國立政治大學", "國立台灣大學", "國立成功大學", "國立清華大學", "輔仁大學"];
window.SKILL_TAGS = ["社群經營", "短影音", "活動企劃", "簡報", "數據分析", "公關", "美妝內容", "攝影", "文案", "Notion", "生產力工具", "穿搭", "拍攝", "選品", "Podcast", "職涯諮詢", "剪輯", "旅遊企劃", "外語"];
window.EVENT_TYPES = ["面試攻略分享會", "同計畫同梯聚", "校際交流", "廠商見面會", "純吃飯哈拉"];
