// 許願池 2.0 — 廠商許願公開牆（投票）＋ 功能許願（私密）。雙模式。
(function () {
  const DB = window.DB;

  // 頁尾聯絡圖示
  const cfg = (DB && DB.cfg) || {};
  const fIg = document.getElementById("footIg"), fMail = document.getElementById("footMail");
  if (fIg) { if (cfg.CONTACT_IG) fIg.href = cfg.CONTACT_IG; else fIg.style.display = "none"; }
  if (fMail) { if (cfg.CONTACT_EMAIL) fMail.href = "mailto:" + cfg.CONTACT_EMAIL + "?subject=UniEmbassy%20聯絡"; else fMail.style.display = "none"; }

  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function needLogin() { return DB.configured && !DB.getUser(); }

  let wishes = [];

  // ---------- 品牌牆 ----------
  function cardHTML(w) {
    const by = w.anonymous ? "匿名許願" : (w.byName || "會員");
    const reason = w.reason ? `<div class="wc-reason">${esc(w.reason)}</div>` : "";
    return `<div class="wish-card" data-id="${esc(w.id)}">
      <div class="wc-main">
        <div class="wc-brand">${esc(w.brand_name)}</div>
        ${reason}
        <div class="wc-by">— ${esc(by)}</div>
      </div>
      <button type="button" class="wc-vote ${w.mine ? "voted" : ""}" data-vote="${esc(w.id)}" aria-label="投票">
        <span class="wc-arrow">▲</span>
        <span class="wc-count">${w.votes}</span>
      </button>
    </div>`;
  }

  function renderWall() {
    const list = document.getElementById("brandList");
    const empty = document.getElementById("brandEmpty");
    const count = document.getElementById("brandCount");
    count.textContent = wishes.length ? `共 ${wishes.length} 個品牌被許願` : "";
    if (!wishes.length) {
      list.innerHTML = "";
      empty.style.display = "block";
      empty.innerHTML = `還沒有人許願——<b>當第一個許願的人</b>，把你想要的品牌喊出來 🪄`;
      return;
    }
    empty.style.display = "none";
    list.innerHTML = wishes.map(cardHTML).join("");
    list.querySelectorAll("[data-vote]").forEach((b) => b.onclick = () => vote(b.dataset.vote));
  }

  async function vote(id) {
    if (needLogin()) { toast("登入後就能投票囉 🔑"); return; }
    const w = wishes.find((x) => x.id === id);
    if (!w) return;
    // 樂觀更新
    const prevMine = w.mine, prevVotes = w.votes;
    w.mine = !w.mine;
    w.votes += w.mine ? 1 : -1;
    renderWall();
    try {
      await DB.toggleWishVote(id);
    } catch (err) {
      w.mine = prevMine; w.votes = prevVotes; // 回滾
      renderWall();
      toast(err.message || "投票失敗，請再試一次");
    }
  }

  async function loadWall() {
    const list = document.getElementById("brandList");
    list.innerHTML = '<div class="admin-empty">載入中…</div>';
    try {
      wishes = await DB.getBrandWishes();
    } catch (err) { wishes = []; console.error(err); }
    // 票數降冪（樂觀更新後也保持排序穩定，這裡不重排避免投票時卡片跳動）
    renderWall();
  }

  // ---------- 我要許願 modal ----------
  const wishMask = document.getElementById("wishMask");
  document.getElementById("newWishBtn").onclick = () => {
    if (needLogin()) { toast("登入後就能許願囉 🔑"); return; }
    document.getElementById("wishErr").textContent = "";
    document.getElementById("wishForm").reset();
    wishMask.classList.add("open");
  };
  document.getElementById("wishClose").onclick = () => wishMask.classList.remove("open");
  wishMask.onclick = (e) => { if (e.target.id === "wishMask") wishMask.classList.remove("open"); };

  document.getElementById("wishForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const brand = f.brand.value.trim();
    const errEl = document.getElementById("wishErr");
    const btn = document.getElementById("wishSubmit");
    errEl.textContent = "";
    if (!brand) return;
    // 防重複：同名品牌已在牆上 → 引導直接投票
    const dup = wishes.find((w) => w.brand_name.trim().toLowerCase() === brand.toLowerCase());
    if (dup) {
      wishMask.classList.remove("open");
      toast(`「${dup.brand_name}」已經有人許願了，幫它投一票吧！`);
      const el = document.querySelector(`.wish-card[data-id="${CSS.escape(dup.id)}"]`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("wc-flash"); setTimeout(() => el.classList.remove("wc-flash"), 1600); }
      return;
    }
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await DB.submitBrandWish(brand, f.reason.value.trim(), f.anonymous.checked);
      wishMask.classList.remove("open");
      toast("許願成功！謝謝你 🪄");
      await loadWall();
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出許願"; }
  };

  // ---------- 功能許願（私密）----------
  document.getElementById("featureForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (needLogin()) { toast("登入後就能許願囉 🔑"); return; }
    const errEl = document.getElementById("featureErr");
    const btn = document.getElementById("featureSubmit");
    errEl.textContent = "";
    const content = f.content.value.trim();
    if (!content) return;
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await DB.submitFeatureWish(content);
      f.reset();
      toast("收到了，謝謝你的建議 💡");
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出"; }
  };

  // ---------- Tabs ----------
  document.querySelectorAll("#wishTabs .admin-tab").forEach((t) => t.onclick = () => {
    document.querySelectorAll("#wishTabs .admin-tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const brand = t.dataset.tab === "brand";
    document.getElementById("brandView").style.display = brand ? "block" : "none";
    document.getElementById("featureView").style.display = brand ? "none" : "block";
  });

  // 登入按鈕（Google）
  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  // Escape 關 modal
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") wishMask.classList.remove("open"); });

  // 啟動
  async function boot() {
    await loadWall();
    if (DB.initAuth) { await DB.initAuth(); }
  }
  boot();
})();
