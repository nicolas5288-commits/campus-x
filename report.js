// 學生提報計畫 — 輕量表單，寫入 programs(pending)＋記 submitted_by（上架後 +30 積分）
(function () {
  const DB = window.DB;
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); }

  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  document.getElementById("againBtn").onclick = () => {
    document.getElementById("successWrap").style.display = "none";
    document.getElementById("formWrap").style.display = "block";
    document.getElementById("reportForm").reset();
  };

  document.getElementById("reportForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const errEl = document.getElementById("reportErr");
    const btn = document.getElementById("reportSubmit");
    errEl.textContent = "";
    // 要登入才記得住是誰提報（才有 +30 分）
    if (DB.configured && !DB.getUser()) {
      toast("登入後提報，上架就 +30 積分 🔑");
      try { await DB.signInWithGoogle(); } catch (err) { errEl.textContent = err.message || "登入失敗"; }
      return;
    }
    const brand = f.brand.value.trim();
    const title = f.title.value.trim() || brand;
    const note = f.note.value.trim();
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await DB.submitProgram({
        brand, title, emoji: "📌", category: "其他",
        summary: note || "學生提報，資料待補完。",
        tasks: [], benefits: [], eligibility: "", term: "", paid: false, location: "",
        deadline: null, applyUrl: f.sourceUrl.value.trim(), sourceUrl: f.sourceUrl.value.trim(),
      });
      document.getElementById("formWrap").style.display = "none";
      document.getElementById("successWrap").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出提報"; }
  };

  if (DB.initAuth) DB.initAuth();
})();
