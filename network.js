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

  function avatarInner(p) {
    return p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : (p.avatar || "👤");
  }
  function cardHTML(p) {
    return `<div class="profile-card" data-id="${p.id}">
      <div class="pc-top">
        <div class="pc-avatar" style="overflow:hidden;">${avatarInner(p)}</div>
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
    if (!list.length) {
      grid.innerHTML = "";
      if (profiles.length === 0) {
        // 整個牆是空的 → 創始大使招募（不塞假資料，把空城變稀缺感）
        empty.innerHTML = `<div class="founding-state">
          <div class="fs-badge">🏆</div>
          <h3>成為第 1 位創始大使</h3>
          <p>人脈網剛啟動——前 20 位建立名片的大使，會獲得專屬「創始大使」徽章。<br>你可以是第一個。</p>
          <button class="btn" id="foundingCta">＋ 建立我的名片</button>
        </div>`;
        const cta = document.getElementById("foundingCta");
        if (cta) cta.onclick = openEdit;
      } else {
        empty.innerHTML = "找不到符合的大使，換個條件試試 🔍";
      }
      empty.style.display = "block";
      return;
    }
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
        <div class="pm-avatar" style="overflow:hidden;">${avatarInner(p)}</div>
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
      <div style="margin-top:22px;">${contact}</div>
      <div style="margin-top:16px;text-align:center;">
        <button type="button" class="report-link" data-report="${p.id}">🚩 檢舉這張名片</button>
      </div>`;
    document.getElementById("pmMask").classList.add("open");
    document.getElementById("pmClose").onclick = () => document.getElementById("pmMask").classList.remove("open");
    const rb = document.querySelector("[data-report]");
    if (rb) rb.onclick = () => openReport(rb.dataset.report);
  }

  // ---------- 檢舉名片 ----------
  let reportTargetId = null;
  function openReport(id) {
    if (DB.configured && !DB.getUser()) { toast("請先登入再檢舉 🔑"); return; }
    reportTargetId = id;
    document.getElementById("reportErr").textContent = "";
    document.getElementById("reportForm").reset();
    document.getElementById("pmMask").classList.remove("open");
    document.getElementById("reportMask").classList.add("open");
  }
  const reportMask = document.getElementById("reportMask");
  if (reportMask) {
    document.getElementById("reportClose").onclick = () => reportMask.classList.remove("open");
    reportMask.onclick = (e) => { if (e.target.id === "reportMask") reportMask.classList.remove("open"); };
    document.getElementById("reportForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const errEl = document.getElementById("reportErr");
      const btn = document.getElementById("reportSubmit");
      errEl.textContent = "";
      btn.disabled = true; btn.textContent = "送出中…";
      try {
        await DB.reportProfile(reportTargetId, f.reason.value, f.content.value.trim());
        reportMask.classList.remove("open");
        toast("已收到你的檢舉，我們會盡快處理 🙏");
      } catch (err) { errEl.textContent = err.message || "送出失敗"; }
      finally { btn.disabled = false; btn.textContent = "送出檢舉"; }
    };
  }
  document.getElementById("pmMask").onclick = (e) => { if (e.target.id === "pmMask") e.currentTarget.classList.remove("open"); };

  // ---------- 建立名片 ----------
  const AVATARS = ["🦊", "🐻", "🐰", "🐺", "🐱", "🦁", "🐨", "🐯", "🐼", "🐸", "🦄", "🐙"];
  let pickedAvatar = "🦊";
  let pickedFile = null;        // 使用者選的照片 File（送出時才上傳）
  let previewUrl = null;        // 壓縮後預覽 dataURL
  const ap = document.getElementById("avatarPicker");
  const preview = document.getElementById("avatarPreview");
  const clearBtn = document.getElementById("avatarClear");
  function showEmojiPreview() { preview.innerHTML = pickedAvatar; }
  AVATARS.forEach((e, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "emoji-opt" + (i === 0 ? " sel" : ""); b.textContent = e;
    b.onclick = () => {
      pickedAvatar = e;
      ap.querySelectorAll(".emoji-opt").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel");
      if (!pickedFile) showEmojiPreview();
    };
    ap.appendChild(b);
  });
  showEmojiPreview();

  // 選照片 → 壓縮預覽（實際上傳延到送出）
  document.getElementById("avatarFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    pickedFile = f;
    previewUrl = await toPreview(f);
    preview.innerHTML = previewUrl ? `<img src="${previewUrl}" alt="" />` : pickedAvatar;
    clearBtn.style.display = "";
  };
  clearBtn.onclick = () => {
    pickedFile = null; previewUrl = null;
    document.getElementById("avatarFile").value = "";
    clearBtn.style.display = "none";
    showEmojiPreview();
  };
  // 壓縮出 dataURL 供預覽（同 db 壓縮參數）
  function toPreview(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const out = Math.min(400, side);
        const c = document.createElement("canvas");
        c.width = out; c.height = out;
        c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, out, out);
        resolve(c.toDataURL("image/jpeg", 0.85));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // 學校建議清單（datalist；仍可自由輸入）
  (function fillSchoolList() {
    const dl = document.getElementById("schoolList");
    if (!dl) return;
    (window.SCHOOLS_FULL || []).forEach((s) => { const o = document.createElement("option"); o.value = s; dl.appendChild(o); });
  })();

  // ---------- 專長多選標籤（＋其他自填）----------
  const selectedSkills = new Set();
  const skillBox = document.getElementById("skillChips");
  function renderSkillChips() {
    const preset = window.SKILL_TAGS || [];
    // 選中但不在預設清單的（自訂）也要顯示
    const custom = [...selectedSkills].filter((s) => !preset.includes(s));
    const all = [...preset, ...custom];
    skillBox.innerHTML = all.map((s) =>
      `<button type="button" class="chip ${selectedSkills.has(s) ? "active" : ""}" data-skill="${s.replace(/"/g, "")}">${s}</button>`
    ).join("") + `<button type="button" class="chip chip-add" id="skillOther">＋ 其他</button>`;
    skillBox.querySelectorAll("[data-skill]").forEach((b) => b.onclick = () => {
      const s = b.dataset.skill;
      if (selectedSkills.has(s)) selectedSkills.delete(s); else selectedSkills.add(s);
      renderSkillChips();
    });
    document.getElementById("skillOther").onclick = () => {
      const v = prompt("輸入你的專長（例：談判、企劃）：");
      if (v && v.trim()) { selectedSkills.add(v.trim()); renderSkillChips(); }
    };
  }
  renderSkillChips();

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
      skills: [...selectedSkills],
      experiences, igUrl: f.igUrl.value.trim(), contactOpen: f.contactOpen.checked,
    };
    btn.disabled = true; btn.textContent = "送出中…";
    try {
      if (pickedFile) {
        btn.textContent = "上傳照片中…";
        form.avatar_url = await DB.uploadAvatar(pickedFile);
      }
      btn.textContent = "送出中…";
      await DB.saveProfile(form);
      document.getElementById("editMask").classList.remove("open");
      toast("名片已送出審核！通過後會出現在人脈網 🙌");
      f.reset();
      selectedSkills.clear();
      renderSkillChips();
    } catch (err) { errEl.textContent = err.message || "送出失敗"; }
    finally { btn.disabled = false; btn.textContent = "送出審核"; }
  };

  // 登入按鈕（Google 登入）
  document.getElementById("loginBtn").onclick = async (e) => {
    e.preventDefault();
    if (!DB.configured) { toast("會員系統需先設定 Supabase"); return; }
    try { await DB.signInWithGoogle(); } catch (err) { toast(err.message || "登入失敗"); }
  };

  // ---------- 貢獻排行榜 ----------
  const MEDALS = ["🥇", "🥈", "🥉"];
  function lbAv(row) {
    return row.avatar_url
      ? `<img src="${esc(row.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<span>${esc((row.nickname || "?")[0])}</span>`;
  }
  function lbRowHTML(row, i) {
    const lv = (window.levelOf ? window.levelOf(row.score) : { emoji: "", name: "" });
    const rank = i < 3 ? `<span class="lb-rank medal">${MEDALS[i]}</span>` : `<span class="lb-rank">${i + 1}</span>`;
    const hasCard = !!row.profile_id;
    const sub = hasCard
      ? `${lv.emoji} ${esc(lv.name)}${row.school ? " · " + esc(row.school) : ""}`
      : `${lv.emoji} ${esc(lv.name)} · <span class="lb-nocard">建名片後可被點開</span>`;
    return `<div class="lb-row ${hasCard ? "clickable" : "no-card"}" ${hasCard ? `data-pid="${esc(row.profile_id)}"` : "data-nocard=\"1\""}>
      ${rank}
      <span class="lb-av">${lbAv(row)}</span>
      <div class="lb-info">
        <div class="lb-name">${esc(row.nickname)} ${badgeHTML(row.badges)}</div>
        <div class="lb-lv">${sub}</div>
      </div>
      <span class="lb-score"><b>${row.score}</b> 分</span>
    </div>`;
  }
  async function loadLeaderboard() {
    const wrap = document.getElementById("lbList");
    if (!wrap) return;
    let rows = [];
    try { rows = await DB.getLeaderboard(10); } catch (err) { console.error(err); }
    if (!rows.length) {
      wrap.innerHTML = `<div class="lb-empty">排行榜虛位以待——<b>分享第一篇心得或建一張名片</b>就能上榜 👀</div>`;
      return;
    }
    wrap.innerHTML = rows.map(lbRowHTML).join("");
    wrap.querySelectorAll(".lb-row.clickable").forEach((el) => el.onclick = () => openProfile(el.dataset.pid));
    wrap.querySelectorAll(".lb-row.no-card").forEach((el) => el.onclick = () => {
      toast("建一張名片，上榜時就能被大家點開 🪪");
      openEdit();
    });
  }
  // 積分說明 modal
  (function () {
    const mask = document.getElementById("lbHelpMask");
    const help = document.getElementById("lbHelp");
    if (!mask || !help) return;
    help.onclick = () => mask.classList.add("open");
    document.getElementById("lbHelpClose").onclick = () => mask.classList.remove("open");
    mask.onclick = (e) => { if (e.target.id === "lbHelpMask") mask.classList.remove("open"); };
  })();

  // 啟動
  async function boot() {
    try { profiles = await DB.getProfiles(); } catch (err) { console.error(err); profiles = []; }
    render();
    loadLeaderboard();
    if (DB.initAuth) { DB.onAuth(() => {}); await DB.initAuth(); }
  }
  boot();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal-mask.open").forEach(m => m.classList.remove("open")); });
})();
