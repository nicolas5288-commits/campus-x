# Campus X — Google 登入設定教學

前端已做好「使用 Google 繼續」按鈕。要讓它能用，需要在 Google Cloud 和 Supabase 做設定（約 10 分鐘）。

## Part A：Google Cloud Console 拿金鑰
1. 開 https://console.cloud.google.com → 登入（用 chiwen5288 那個 Google 帳號）
2. 上方選單建立一個專案（Project name 打 `campus-x`）→ 建立、切換到它
3. 左側 **APIs & Services → OAuth consent screen**
   - User Type 選 **External** → 建立
   - App name：`Campus X`；User support email：選你的 email；Developer contact：填你的 email
   - 其他一路 Save and Continue，最後 **Back to Dashboard**
   - ⚠️ **重要**：在 OAuth consent screen 頁面，把狀態 **Publish App（發布到 Production）**。否則只有你手動加的測試帳號能登入，學生會登不了。
4. 左側 **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type：**Web application**
   - Name：`campus-x-web`
   - **Authorized redirect URIs → ADD URI**，貼上這一行（就是這個，不要改）：
     ```
     https://xjoggvwngsvowjnwwrnc.supabase.co/auth/v1/callback
     ```
   - 建立 → 會跳出 **Client ID** 和 **Client Secret**，兩個都複製起來

## Part B：Supabase 啟用 Google
1. 開 Supabase 專案 → 左側 **Authentication → Sign In / Providers**
2. 找到 **Google** → 點開 → 打開 **Enable**
3. 貼上剛剛的 **Client ID** 和 **Client Secret** → **Save**

## Part C：設定網址（很重要，不然登入後會導到 localhost 被拒）
1. Supabase → **Authentication → URL Configuration**
2. **Site URL** 填：
   ```
   https://nicolas5288-commits.github.io/campus-x/
   ```
3. **Redirect URLs → Add URL** 加這一行（結尾 `**` 是萬用字元，讓各子頁都能導回）：
   ```
   https://nicolas5288-commits.github.io/campus-x/**
   ```
   Save。

## 完成！測試
到 https://nicolas5288-commits.github.io/campus-x/ → 點「登入/註冊」→「使用 Google 繼續」→ 選 chiwen5288 帳號 → 應該就登入成功、右上出現你的頭像。

## 常見問題
- **redirect_uri_mismatch**：Part A 的 redirect URI 沒貼對，要一字不差是 `https://xjoggvwngsvowjnwwrnc.supabase.co/auth/v1/callback`
- **登入後回到 localhost 被拒**：Part C 的 Site URL / Redirect URLs 沒設對
- **只有我能登入、別人不行**：Part A step 3 的 consent screen 沒 Publish（還在 Testing）
