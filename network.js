// 大使人脈網（名片牆）— 雙模式
(function () {
  const DB = window.DB;
  const grid = document.getElementById("profileGrid");
  const empty = document.getElementById("netEmpty");
  const schoolSel = document.getElementById("schoolSel");
  const skillSel = document.getElementById("skillSel");
  const netSearch = document.getElementById("netSearch");
  const netCount = document.getElementById("netCount");

  let profiles = [];
  let activeSchool = "全部";
  let activeSkill = "全部專長";

  document.getElementById("modeBadge").textContent = DB.MODE === "supabase" ? "☁️ 雲端資料庫" : "🖥️ 本機展示模式";
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  // 篩選選單
  (window.SCHOOLS || ["全部"]).forEach((s) => { const o = document.createElement("option"); o.value = s; o.textContent = s === "全部" ? "全部學校" : s; schoolSel.appendChild(o); });
  const skillOpts = ["全部專長"].concat(window.SKILL_TAGS || []);
  skillOpts.forEach((s) => { const o = document.createElement("option"); o.value = s; o.textContent = s; skillSel.appendChild(o); });
  schoolSel.onchange = () => { activeSchool = schoolSel.value; render(); };
  skillSel.onchange = () => { activeSkill = skillSel.value; render(); };
  netSearch.oninput = render;

  function badgeHTML(badges) {
    let h = "";
    if ((badges || []).includes("verified")) h += '<span class="badge-v">✅ 認證大使</span>';
    if ((badges || []).includes("founding")) h += '<span class="badge-f">🏆 創始大使</span>';
    return h;
  }

  function cardHTML(p) {
    return `<div class="profile-card" data-id="${p.id}">
      <div class="pc-top">
        <div class="pc-avatar">${p.avatar || "👤"}</div>
        <div>
          <div class="pc-name">${esc(p.nickname)} ${badgeHTML(p.badges)}</div>
          <div class="pc-school">${esc(p.school || "")} ${esc(p.grade || "")}</div>
        </div>
      </div>
      <div class="pc-headline">${esc(p.headline || "")}</div>
      <div class="pc-skills">${(p.skills || []).slice(0, 4).map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
      <div class="pc-exp">🎓 ${(p.experiences || []).map(e => esc(e.programName)).join("、") || "—"}</div>
    </div>`;
  }

  function getFiltered() {
    const q = netSearch.value.trim().toLowerCase();
    return profiles.filter((p) => {
      if (activeSchool !== "全部" && p.school !== activeSchool) return false;
      if (activeSkill !== "全部專長" && !(p.skills || []).includes(activeSkill)) return false;
      if (q) {
        const hay = (p.nickname + (p.school || "") + (p.headline || "") + (p.skills || []).join("") + (p.experiences || []).map(e => e.programName).join("")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const list = getFiltered();
    netCount.textContent = `共 ${list.length} 位大使`;
    if (!list.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll(".profile-card").forEach((el) => el.onclick = () => openProfile(el.dataset.id));
  }

  function openProfile(id) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    const contact = p.contactOpen && p.igUrl
      ? `<a href="${esc(p.igUrl)}" target="_blank" rel="noopener" class="btn" style="width:100%;justify-content:center;">💬 找 ${esc(p.nickname)} 聊聊（IG）</a>`
      : `<div class="contact-locked">這位大使目前未開放聯繫</div>`;
    document.getElementById("pmBody").innerHTML = `
      <button class="modal-close" id="pmClose">✕</button>
      <div class="pm-head">
        <div class="pm-avatar">${p.avatar || "👤"}</div>
        <div>
          <div class="pc-name" style="font-size:21px;">${esc(p.nickname)}</div>
          <div class="pc-school">${esc(p.school || "")} ${esc(p.grade || "")}</div>
          <div style="margin-top:6px;">${badgeHTML(p.badges)}</div>
        </div>
      </div>
      <p style="color:var(--ink-soft);font-size:15px;margin:14px 0;">${esc(p.headline || "")}</p>
      <h4>專長</h4>
      <div class="pc-skills">${(p.skills || []).map(s => `<span class="tag">${esc(s)}</span>`).join("") || "—"}</div>
      <h4>大使經歷</h4>
      ${(p.experiences || []).map(e => `<div class="pm-exp-item">🎓 <b>${esc(e.programName)}</b> · ${esc(e.cohort || "")} · ${esc(e.year || "")}</div>`).join("") || "—"}
      <div style="margin-top:22px;">${contact}</div>`;
    document.getElementById("pmMask").classList.add("open");
    document.getElementById("pmClose").onclick = () => document.getElementById("pmMask").classList.remove("open");
  }
  document.getElementById("pmMask").onclick = (e) => { if (e.target.id === "pmMask") e.currentTarget.classList.remove("open"); };

  // ---------- 建立名片 ----------
  const AVATARS = ["🦊", "🐻", "🐰", "🐺", "🐱", "🦁", "🐨", "🐯", "🐼", "🐸", "🦄", "🐙"];
  let pickedAvatar = "🦊";
  const ap = document.getElementById("avatarPicker");
  AVATARS.forEach((e, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "emoji-opt" + (i === 0 ? " sel" : ""); b.textContent = e; b.onclick = () => { pickedAvatar = e; ap.querySelectorAll(".emoji-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); }; ap.appendChild(b); });

  function openEdit() {
    if (DB.configured && !DB.getUser()) { toast("請先登入再建立名片 🔑"); return; }
    document.getElementById("editErr").textContent = "";
    document.getElementById("editMask").classList.add("open");
  }
  document.getElementById("createProfileBtn").onclick = openEdit;
  document.getElementById("editClose").onclick = () => document.getElementById("editMask").classList.remove("open");
  document.getElementById("editMask").onclick = (e) => { if (e.target.id === "editMask") e.currentTarget.classList.remove("open"); };

  document.getElementById("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const errEl = document.getElementById("editErr");
    const btn = document.getElementById("editSubmit");
    errEl.textContent = "";
    const experiences = f.experiences.value.split("\n").map(s => s.trim()).filter(Boolean).map((line) => {
      const [programName, cohort, year] = line.split("/").map(x => (x || "").trim());
      return { programName: programName || line, cohort: cohort || "", year: year || "" };
    });
    const form = {
      nickname: f.nickname.value.trim(), avatar: pickedAvatar,
      school: f.school.value.trim(), grade: f.grade.value.trim(),
      headline: f.headline.value.trim(),
      skills: f.skills.value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      experiences, igUrl: f.igUrl.value.trim(), contactOpen: f.contactOpen.checked,
    };
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      await DB.saveProfile(form);
      document.getElementById("editMask").classList.remove("open");
      toast("名片已送出審核！通過後會出現在人脈網 🙌");
      f.reset();
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出審核"; }
  };

  // 登入按鈕（Google 登入）
  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  // 啟動
  async function boot() {
    try { profiles = await DB.getProfiles(); } catch (err) { console.error(err); profiles = []; }
    render();
    if (DB.initAuth) { DB.onAuth(() => {}); await DB.initAuth(); }
  }
  boot();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal-mask.open").forEach(m => m.classList.remove("open")); });
})();
