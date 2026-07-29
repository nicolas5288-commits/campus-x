# 廠商上架通知信 — 設定教學（一次設定，之後全自動）

做完這份設定後：你在後台按「✓ 通過上架」→ 廠商的信箱自動收到上架通知＋專屬招募連結，你完全不用動手。

程式都寫好了，你只要做 4 步設定（約 20 分鐘，其中 DNS 生效要等）。

---

## 第 1 步：跑 SQL（2 分鐘）

到 [Supabase 後台](https://supabase.com/dashboard) → 你的專案 → SQL Editor，依序貼上執行：

1. `schema_v15_program_slug.sql`（如果還沒跑）
2. `schema_v16_vendor_email.sql`

跑完後投稿表單的「聯絡 Email」就會真的存進資料庫（存在只有管理員讀得到的獨立表，不會公開）。

## 第 2 步：註冊 Resend ＋ 驗證網域（10 分鐘＋等 DNS 生效）

Resend 是寄信服務，免費額度每月 3,000 封、每天 100 封，我們用量遠遠夠。

1. 到 [resend.com](https://resend.com) 用 Google 帳號註冊
2. 左側 **Domains** → **Add Domain** → 輸入 `uniembassy.tw`（**已完成**：2026-07-27 加在 `viralarccreator` 帳號、Region＝**Tokyo `ap-northeast-1`**）
3. Resend 會給你 3 筆 DNS 紀錄（1 筆 MX＋2 筆 TXT，用途是證明「這網域授權我寄信」）
4. 到 Gandi DNS 管理頁把這 3 筆照抄加上去（**逐步見下方「Gandi 加 DNS 記錄」**）
5. 回 Resend 按 **Verify**——通常幾分鐘到幾小時內會變綠色 ✅
6. 左側 **API Keys** → **Create API Key**（權限選 Sending access 就好）→ 複製起來，下一步要用

> ⚠️ 沒驗證網域前，Resend 只能寄信到你自己的信箱（測試用），寄不了給廠商。所以這步跑不掉。

### Gandi 加 DNS 記錄（uniembassy.tw 的 DNS 託管在 Gandi）

進 [admin.gandi.net](https://admin.gandi.net) → **網域** → `uniembassy.tw` → **DNS 記錄**（DNS Records）分頁 → 用「新增記錄」表單加下面 3 筆。

Resend 給的三筆長這樣（**DKIM 那筆的值每個帳號都不同，一定要從 Resend 畫面按複製鈕拿整段，畫面上顯示的 `p=MIGfMA0GCSqG[…]BEtbQIQIDAQAB` 中間是省略號、照抄會壞**）：

| # | 類型 | 名稱（Gandi 的 Name 欄） | 值 |
|---|---|---|---|
| 1 | MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com.`（優先權 10） |
| 2 | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| 3 | TXT | `resend._domainkey` | `p=MIGfMA0GCSq...`（超長那串，從 Resend 複製整段） |

> ⚠️ **`ap-northeast-1` 是因為這個網域的 Region 選了 Tokyo**。Resend 頁面上實際顯示什麼就照抄什麼——region 不同 MX 主機名就不同，抄錯會驗不過。

**Gandi 三個坑：**
1. **名稱只填前綴**，不要填完整網域。填 `send`，**不是** `send.uniembassy.tw`（Gandi 會自動接後面，填全的話會變成 `send.uniembassy.tw.uniembassy.tw`）
2. **MX 的優先權要寫在值裡面**：Gandi 的 MX 值欄位格式是 `10 feedback-smtp.us-east-1.amazonses.com.`（數字＋空格＋主機名，**結尾那個點不能省**）
3. **TXT 值如果 Gandi 沒自動加引號**，手動包成 `"v=spf1 include:amazonses.com ~all"`；DKIM 那串太長被切成多段也沒關係，Gandi 會自己處理

**不用擔心撞到現有信箱**：Resend 用的是 `send.` 子網域，跟你根網域現有的 Gandi 信箱 MX（`spool.mail.gandi.net`）＋ SPF 完全不衝突，**兩筆都不要動、不要刪**。

**自己驗證有沒有生效**（終端機貼這行，三行都有東西回來就成功了）：

```bash
dig +short MX send.uniembassy.tw && dig +short TXT send.uniembassy.tw && dig +short TXT resend._domainkey.uniembassy.tw
```

## 第 3 步：部署雲端函式（5 分鐘，不用裝任何工具）

1. Supabase 後台 → 左側 **Edge Functions** → **Deploy a new function** → 選 **Via Editor**
2. 函式名稱填：`notify-approved`
3. 把 `supabase/functions/notify-approved/index.ts` 整份內容貼進編輯器
4. 按 **Deploy**

## 第 4 步：設 4 個 Secrets（3 分鐘）

Edge Functions 頁 → **Secrets**（或 Manage secrets）→ 逐筆新增：

| 名稱 | 值 | 說明 |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxx...` | 第 2 步拿到的 API Key。⚠️ **必須在 `viralarccreator` 帳號建**——uniembassy.tw 驗證在這個帳號底下，用另一個 Resend 帳號（chiwen5288）的 key 會寄不出去 |
| `ADMIN_EMAIL` | `chiwen5288@gmail.com` | 跟後台管理員同一個，驗證「只有你能觸發寄信」 |
| `FROM_EMAIL` | `UniEmbassy 校園大使館 <notify@uniembassy.tw>` | 寄件人顯示名稱（notify@ 不用真的建立信箱，驗過網域就能寄） |
| `REPLY_TO` | `chiwen5288@gmail.com` | 廠商按「回覆」時信會進你這裡 |

---

## 測試方式

1. 自己到投稿頁投一筆測試計畫，「聯絡 Email」填你自己的信箱
2. 後台按「✓ 通過上架」
3. 應該看到 toast：「📧 上架通知信已寄給 …」，然後你的信箱收到信
4. 測完把測試計畫用「🗑️ 永久刪除」清掉

## 防呆設計（已內建，不用另外設）

- **沒留 Email 的投稿**（學生提報、舊資料）：自動略過，toast 會提示改用複製訊息通知
- **重複按通過**：寄過就蓋章（notified_at），不會重寄轟炸廠商
- **寄信失敗**：只跳提示不擋上架流程，你隨時可用原本的「複製通知訊息」手動補
- **非管理員呼叫**：函式會驗證身分直接拒絕
