/* UniEmbassy 設定檔
 *
 * 👉 Supabase 設定好之前，維持原樣即可 —— 網站會自動用本機假資料（data.js）＋瀏覽器收藏。
 * 👉 建好 Supabase 專案後，把下面兩個值換成你的（Settings → API 頁面找得到）：
 *      SUPABASE_URL：像 https://xxxx.supabase.co
 *      SUPABASE_KEY：publishable/anon key（設計來公開，安全靠資料庫 RLS 規則）
 *    再把 ADMIN_EMAIL 改成你的（要跟 schema.sql 裡 is_admin() 的 email 一致）。
 */
window.CAMPUSX_CONFIG = {
  SUPABASE_URL: "https://xjoggvwngsvowjnwwrnc.supabase.co",
  SUPABASE_KEY: "sb_publishable_JQ0K7GNF7KbhzqNHQvHi-A_SWIaUwo4",
  // 主理人 email。v18 之後後台權限改看資料庫的 staff 名單（後台「👥 團隊」分頁管理），
  // 這裡只在 staff 相關的 SQL 還沒跑時當退路用，別刪。
  ADMIN_EMAIL: "chiwen5288@gmail.com",
  // 聯絡我們（可自由修改；留空的項目不顯示）
  CONTACT_IG: "https://www.instagram.com/uniembassy.tw/",
  CONTACT_EMAIL: "chiwen5288@gmail.com",
};
