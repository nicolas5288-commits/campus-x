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
