// 大使活動牆 — 雙模式
(function () {
  const DB = window.DB;
  const grid = document.getElementById("eventGrid");
  const empty = document.getElementById("evEmpty");
  const typeSel = document.getElementById("typeSel");
  const evCount = document.getElementById("evCount");

  let events = [];
  let profileMap = {}; // id -> profile（拿發起人/報名者名片）
  let mySignups = []; // 本機模式我報名的活動
  let activeType = "全部";

  document.getElementById("modeBadge").textContent = DB.MODE === "supabase" ? "☁️ 雲端資料庫" : "🖥️ 本機展示模式";
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  // 類型選單
  ["全部"].concat(window.EVENT_TYPES || []).forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t === "全部" ? "全部類型" : t; typeSel.appendChild(o); });
  typeSel.onchange = () => { activeType = typeSel.value; render(); };
  // 發起表單類型
  (window.EVENT_TYPES || []).forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t; document.getElementById("ceType").appendChild(o); });

  let accountMap = {};
  function prof(id) { return accountMap[id] || profileMap[id] || { nickname: "大使", avatar: "👤" }; }
  function av(p) { return p && p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : (p && p.avatar || "👤"); }
  function signupsOf(e) {
    // 本機模式：signupIds 內可能含 'me'
    return (e.signupIds || []).map((sid) => sid === "me" ? { nickname: "你", avatar: "🙂" } : prof(sid));
  }

  function cardHTML(e) {
    const host = prof(e.hostId);
    const signups = signupsOf(e);
    const cap = e.capacity || 0;
    const full = cap && signups.length >= cap;
    const stack = signups.slice(0, 5).map(s => `<span class="mini" style="overflow:hidden;">${av(s)}</span>`).join("");
    return `<div class="event-card" data-id="${e.id}">
      <span class="ev-type">${esc(e.type)}</span>
      <div class="ev-title">${esc(e.title)}</div>
      <div class="ev-meta">
        <div class="row">🗓️ ${esc(e.eventAt || "時間待定")}</div>
        <div class="row">${e.locationType === "online" ? "💻" : "📍"} ${esc(e.location || "地點待定")}</div>
        <div class="row">🙋 發起人：${esc(host.nickname)}</div>
      </div>
      <div class="ev-foot">
        <div class="ev-hosts">
          <div class="signup-stack">${stack || '<span class="mini">＋</span>'}</div>
          <span class="signup-count">${signups.length} 人報名</span>
        </div>
        <span class="ev-cap ${full ? "full" : ""}">${full ? "已額滿" : cap ? `${signups.length}/${cap}` : ""}</span>
      </div>
    </div>`;
  }

  function getFiltered() {
    return events.filter((e) => activeType === "全部" || e.type === activeType);
  }
  function render() {
    const list = getFiltered();
    evCount.textContent = `共 ${list.length} 場活動`;
    if (!list.length) {
      grid.innerHTML = "";
      if (events.length === 0) {
        empty.innerHTML = `<div class="founding-state">
          <div class="fs-badge">🎪</div>
          <h3>發起第一場活動</h3>
          <p>還沒有人揪活動——認證大使可以發起面試分享會、同梯小聚、校際交流。<br>當第一個帶大家見面的人吧。</p>
          <button class="btn" id="foundingEvCta">＋ 發起活動</button>
        </div>`;
        const cta = document.getElementById("foundingEvCta");
        if (cta) cta.onclick = () => document.getElementById("createEventBtn").click();
      } else {
        empty.innerHTML = "目前沒有這類活動，發起一場吧 🎉";
      }
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll(".event-card").forEach((el) => el.onclick = () => openEvent(el.dataset.id));
  }

  function openEvent(id) {
    const e = events.find((x) => x.id === id);
    if (!e) return;
    const host = prof(e.hostId);
    const signups = signupsOf(e);
    const cap = e.capacity || 0;
    const full = cap && signups.length >= cap;
    const joined = mySignups.includes(e.id);
    const attendees = signups.length
      ? signups.map(s => `<div class="attendee"><span class="a-av" style="overflow:hidden;">${av(s)}</span>${esc(s.nickname)}</div>`).join("")
      : '<div class="rev-empty">還沒有人報名，當第一個吧！</div>';
    const btn = joined
      ? `<button class="btn ghost" id="signBtn" style="width:100%;justify-content:center;">✓ 已報名（點此取消）</button>`
      : full
        ? `<button class="btn" disabled style="width:100%;justify-content:center;opacity:.5;">已額滿</button>`
        : `<button class="btn" id="signBtn" style="width:100%;justify-content:center;">我要報名</button>`;
    document.getElementById("emBody").innerHTML = `
      <button class="modal-close" id="emClose">✕</button>
      <span class="ev-type">${esc(e.type)}</span>
      <h2 style="margin-top:12px;">${esc(e.title)}</h2>
      <div class="ev-host-card">
        <div class="pc-avatar" style="width:44px;height:44px;font-size:22px;overflow:hidden;">${av(host)}</div>
        <div><div style="font-weight:600;">${esc(host.nickname)}</div><div class="pc-school">發起人${host.school ? " · " + esc(host.school) : ""}</div></div>
      </div>
      <div class="meta-grid">
        <div class="m"><span>時間</span><b>${esc(e.eventAt || "待定")}</b></div>
        <div class="m"><span>形式</span><b>${e.locationType === "online" ? "線上" : "線下實體"}</b></div>
        <div class="m"><span>地點</span><b>${esc(e.location || "待定")}</b></div>
        <div class="m"><span>名額</span><b>${signups.length}${cap ? " / " + cap : ""}</b></div>
      </div>
      <h4>活動說明</h4>
      <p style="font-size:15px;color:var(--ink-soft);">${esc(e.description || "")}</p>
      <h4>誰會去（${signups.length}）</h4>
      <div class="attendee-grid">${attendees}</div>
      <div class="safety-tip">🛡️ 第一次見面建議約公共場所、結伴同行。覺得不對勁可截圖回報 Campus X。</div>
      <div style="margin-top:16px;">${btn}</div>`;
    document.getElementById("emMask").classList.add("open");
    document.getElementById("emClose").onclick = () => document.getElementById("emMask").classList.remove("open");
    const sb = document.getElementById("signBtn");
    if (sb) sb.onclick = async () => {
      if (DB.configured && !DB.getUser()) { toast("請先登入再報名 🔑"); return; }
      try {
        const on = await DB.toggleSignup(e.id);
        toast(on ? "報名成功！記得準時參加 🙌" : "已取消報名");
        await reload();
        openEvent(e.id); // 重新渲染詳情
      } catch (err) { toast(err.message || "操作失敗"); }
    };
  }
  document.getElementById("emMask").onclick = (e) => { if (e.target.id === "emMask") e.currentTarget.classList.remove("open"); };

  // ---------- 發起活動 ----------
  document.getElementById("createEventBtn").onclick = () => {
    if (DB.configured && !DB.getUser()) { toast("請先登入再發起活動 🔑"); return; }
    document.getElementById("ceErr").textContent = "";
    document.getElementById("ceMask").classList.add("open");
  };
  document.getElementById("ceClose").onclick = () => document.getElementById("ceMask").classList.remove("open");
  document.getElementById("ceMask").onclick = (e) => { if (e.target.id === "ceMask") e.currentTarget.classList.remove("open"); };
  document.getElementById("eventForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const errEl = document.getElementById("ceErr");
    const btn = document.getElementById("ceSubmit");
    errEl.textContent = "";
    const form = {
      hostId: "me", title: f.title.value.trim(), type: f.type.value,
      description: f.description.value.trim(), eventAt: f.eventAt.value.trim(),
      locationType: f.locationType.value, location: f.location.value.trim(),
      capacity: parseInt(f.capacity.value) || null,
    };
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await DB.createEvent(form);
      document.getElementById("ceMask").classList.remove("open");
      toast("活動已送出審核！通過後會出現在活動牆 🎉");
      f.reset();
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出審核"; }
  };

  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  async function reload() {
    try {
      events = await DB.getEvents();
      const profs = await DB.getProfiles();
      profileMap = {};
      profs.forEach((p) => { profileMap[p.id] = p; });
      // 個人檔案身分（雲端）：發起人＋報名者
      const ids = [];
      events.forEach((e) => { ids.push(e.hostId); (e.signupIds || []).forEach((s) => ids.push(s)); });
      try { accountMap = await DB.getAccountsMap(ids); } catch { accountMap = {}; }
      // 我的報名
      if (DB.MODE === "local") { mySignups = DB.localMySignups(); }
      else {
        const uid = DB.getUser()?.id;
        mySignups = uid ? events.filter((e) => (e.signupIds || []).includes(uid)).map((e) => e.id) : [];
      }
    } catch (err) { console.error(err); events = []; }
  }
  async function boot() {
    await reload();
    render();
    if (DB.initAuth) { DB.onAuth(() => {}); await DB.initAuth(); }
  }
  boot();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal-mask.open").forEach(m => m.classList.remove("open")); });
})();
