// Campus X 資料層（db.js）
// 「雙模式」大腦：config.js 填了 Supabase → 用雲端；沒填 → 用本機 data.js + localStorage。
// app.js / submit / admin 只呼叫這裡的函式，不用管背後是雲端還是本機。
window.DB = (function () {
  const cfg = window.CAMPUSX_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    cfg.SUPABASE_KEY &&
    cfg.SUPABASE_KEY !== "YOUR_SUPABASE_KEY";

  let sb = null;
  if (configured && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  }
  const MODE = sb ? "supabase" : "local";

  // ========== 本機儲存（localStorage 當假資料庫）==========
  const LS = {
    favs: "cai_favs",
    store: "cai_store", // { submitted:[program...], overrides:{id:{status,reject_reason}}, reviews:[review...] }
  };
  function loadStore() {
    const d = JSON.parse(localStorage.getItem(LS.store) || "{}");
    // 先 spread 保留所有 key（wishes/notes/programEdits…），再補預設，避免新加的 key 讀出來消失
    return {
      ...d,
      submitted: d.submitted || [], overrides: d.overrides || {}, reviews: d.reviews || [],
      profiles: d.profiles || [], profileOverrides: d.profileOverrides || {},
      events: d.events || [], eventOverrides: d.eventOverrides || {}, eventSignups: d.eventSignups || {},
    };
  }
  function saveStore(s) {
    localStorage.setItem(LS.store, JSON.stringify(s));
  }
  const localFavs = {
    get: () => JSON.parse(localStorage.getItem(LS.favs) || "[]"),
    toggle(id) {
      const f = localFavs.get();
      const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1);
      else f.push(id);
      localStorage.setItem(LS.favs, JSON.stringify(f));
      return f.includes(id);
    },
  };
  // 本機：合併 data.js base + 使用者投稿，套用 override 狀態
  function localAllPrograms() {
    const s = loadStore();
    const base = (window.PROGRAMS || []).map((p) => ({ ...p }));
    const all = base.concat(s.submitted.map((p) => ({ ...p })));
    return all.map((p) => {
      let out = { ...p };
      const ov = s.overrides[p.id];
      if (ov) out = { ...out, status: ov.status, reject_reason: ov.reject_reason };
      const ed = (s.programEdits || {})[p.id];   // 管理員本機編輯覆蓋
      if (ed) out = { ...out, ...ed };
      return out;
    });
  }
  function localSetStatus(id, status, reason) {
    const s = loadStore();
    const inSubmitted = s.submitted.find((p) => p.id === id);
    if (inSubmitted) {
      inSubmitted.status = status;
      inSubmitted.reject_reason = reason || null;
    } else {
      s.overrides[id] = { status, reject_reason: reason || null };
    }
    saveStore(s);
  }

  // ========== Auth ==========
  let currentUser = null;
  const authListeners = [];
  function onAuth(cb) { authListeners.push(cb); cb(currentUser); }
  function emitAuth() { authListeners.forEach((cb) => cb(currentUser)); }

  async function initAuth() {
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    currentUser = data.session?.user || null;
    emitAuth();
    sb.auth.onAuthStateChange((_e, session) => {
      currentUser = session?.user || null;
      emitAuth();
    });
  }
  async function signUp(email, password) {
    if (!sb) throw new Error("尚未設定 Supabase，無法註冊");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    if (!sb) throw new Error("尚未設定 Supabase，無法登入");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signInWithGoogle() {
    if (!sb) throw new Error("尚未設定 Supabase，無法登入");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.href.split("#")[0].split("?")[0] },
    });
    if (error) throw error;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); }
  function getUser() { return currentUser; }
  function isAdmin() {
    if (!sb) return true; // 本機模式：你就是管理員（方便 demo 後台）
    return !!currentUser && currentUser.email === cfg.ADMIN_EMAIL;
  }

  // 欄位對應：DB(snake_case) → 前台(camelCase)
  function normalizeRow(r) {
    return {
      id: r.id, brand: r.brand, emoji: r.emoji, category: r.category,
      title: r.title, summary: r.summary, tasks: r.tasks || [], benefits: r.benefits || [],
      eligibility: r.eligibility, term: r.term, paid: r.paid, location: r.location,
      deadline: r.deadline, applyUrl: r.apply_url, status: r.status, reject_reason: r.reject_reason,
      recruiting: r.recruiting, recruitNote: r.recruit_note, sourceUrl: r.source_url,
    };
  }

  // ========== Programs：讀取 ==========
  async function getPrograms() {
    if (!sb) return localAllPrograms().filter((p) => p.status === "live");
    const { data, error } = await sb.from("programs").select("*")
      .eq("status", "live").order("deadline", { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeRow);
  }
  async function getPendingPrograms() {
    if (!sb) return localAllPrograms().filter((p) => p.status === "pending");
    const { data, error } = await sb.from("programs").select("*")
      .eq("status", "pending").order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeRow);
  }

  // ========== Programs：廠商投稿（免登入，寫入 pending）==========
  async function submitProgram(form) {
    // form: {brand, emoji, category, title, summary, tasks[], benefits[], eligibility, term, paid, location, deadline, applyUrl}
    if (!sb) {
      const s = loadStore();
      const id = "u-" + Date.now();
      s.submitted.push({ ...form, id, applyUrl: form.applyUrl, status: "pending" });
      saveStore(s);
      return { id };
    }
    const row = {
      brand: form.brand, emoji: form.emoji || "📌", category: form.category,
      title: form.title, summary: form.summary, tasks: form.tasks || [], benefits: form.benefits || [],
      eligibility: form.eligibility, term: form.term, paid: !!form.paid, location: form.location,
      deadline: form.deadline || null, apply_url: form.applyUrl, status: "pending",
    };
    const { data, error } = await sb.from("programs").insert(row).select("id").single();
    if (error) throw error;
    return data;
  }

  // ========== Programs：審核 ==========
  async function approveProgram(id) {
    if (!sb) return localSetStatus(id, "live");
    const { error } = await sb.from("programs").update({ status: "live" }).eq("id", id);
    if (error) throw error;
  }
  async function rejectProgram(id, reason) {
    if (!sb) return localSetStatus(id, "rejected", reason);
    const { error } = await sb.from("programs").update({ status: "rejected", reject_reason: reason }).eq("id", id);
    if (error) throw error;
  }

  // ========== Programs：管理員編輯（RLS prog_admin_update 已存在）==========
  // ⚠️ camelCase 前台欄位 → snake_case 明確對應（別用自動轉換，profiles 踩過雷）
  async function updateProgram(id, f) {
    const fields = {
      brand: f.brand, emoji: f.emoji || "📌", category: f.category, title: f.title, summary: f.summary,
      tasks: f.tasks || [], benefits: f.benefits || [], eligibility: f.eligibility, term: f.term,
      paid: !!f.paid, location: f.location, deadline: f.deadline || null,
      recruiting: f.recruiting !== false, recruit_note: f.recruitNote || null,
      apply_url: f.applyUrl || null, source_url: f.sourceUrl || null,
    };
    if (!sb) {
      const s = loadStore();
      s.programEdits = s.programEdits || {};
      s.programEdits[id] = { ...(s.programEdits[id] || {}), ...f };
      saveStore(s);
      return { ok: true };
    }
    if (!isAdmin()) throw new Error("只有管理員能編輯計畫");
    const { error } = await sb.from("programs").update(fields).eq("id", id);
    if (error) throw error;
    return { ok: true };
  }
  // 快捷：切換招募狀態
  async function setRecruiting(id, recruiting) {
    if (!sb) {
      const s = loadStore();
      s.programEdits = s.programEdits || {};
      s.programEdits[id] = { ...(s.programEdits[id] || {}), recruiting };
      saveStore(s);
      return { ok: true };
    }
    if (!isAdmin()) throw new Error("只有管理員能操作");
    const { error } = await sb.from("programs").update({ recruiting }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  }

  // ========== 計畫補充/回報 program_notes ==========
  async function submitProgramNote(programId, type, content) {
    if (!sb) {
      const s = loadStore();
      s.notes = s.notes || [];
      s.notes.push({ id: "n-" + Date.now(), program_id: programId, user_id: "local", type, content, status: "pending", created_at: new Date(0).toISOString() });
      saveStore(s);
      return { ok: true };
    }
    if (!currentUser) throw new Error("請先登入再回報");
    const { error } = await sb.from("program_notes").insert({ program_id: programId, user_id: currentUser.id, type, content, status: "pending" });
    if (error) throw error;
    return { ok: true };
  }
  async function getPendingNotes() {
    if (!sb) {
      const s = loadStore();
      return (s.notes || []).filter((n) => n.status === "pending").map((n) => {
        const p = localAllPrograms().find((x) => x.id === n.program_id);
        return { ...n, programs: p ? { title: p.title, brand: p.brand } : null };
      });
    }
    const { data, error } = await sb.from("program_notes").select("*, programs(title, brand)")
      .eq("status", "pending").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function resolveNote(id, status) {
    if (!sb) {
      const s = loadStore();
      const n = (s.notes || []).find((x) => x.id === id);
      if (n) n.status = status;
      saveStore(s);
      return;
    }
    const { error } = await sb.from("program_notes").update({ status }).eq("id", id);
    if (error) throw error;
  }

  // ========== Favorites ==========
  async function getFavorites() {
    if (!sb || !currentUser) return localFavs.get();
    const { data, error } = await sb.from("favorites").select("program_id").eq("user_id", currentUser.id);
    if (error) throw error;
    return (data || []).map((x) => x.program_id);
  }
  async function toggleFavorite(programId) {
    if (!sb || !currentUser) return localFavs.toggle(programId);
    const current = await getFavorites();
    if (current.includes(programId)) {
      await sb.from("favorites").delete().eq("user_id", currentUser.id).eq("program_id", programId);
      return false;
    }
    await sb.from("favorites").insert({ user_id: currentUser.id, program_id: programId });
    return true;
  }

  // ========== Reviews 學長姐心得 ==========
  async function getReviews(programId) {
    if (!sb) return loadStore().reviews.filter((r) => r.program_id === programId && r.status === "live");
    const { data, error } = await sb.from("reviews").select("*")
      .eq("program_id", programId).eq("status", "live").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function getPendingReviews() {
    if (!sb) {
      const reviews = loadStore().reviews.filter((r) => r.status === "pending");
      return reviews.map(attachProgramTitle);
    }
    const { data, error } = await sb.from("reviews").select("*, programs(title, brand)")
      .eq("status", "pending").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  function attachProgramTitle(r) {
    const p = localAllPrograms().find((x) => x.id === r.program_id);
    return { ...r, programs: p ? { title: p.title, brand: p.brand } : null };
  }
  async function submitReview(form) {
    // form: {program_id, type, rating, anonymous, process,questions,tips,result, workload,gains,advice, extra}
    if (!sb) {
      const s = loadStore();
      const id = "r-" + Date.now();
      s.reviews.push({ ...form, id, user_id: "local", status: "pending", created_at: new Date().toISOString() });
      saveStore(s);
      return { id };
    }
    if (!currentUser) throw new Error("請先登入再分享經驗");
    const row = { ...form, user_id: currentUser.id, status: "pending" };
    const { data, error } = await sb.from("reviews").insert(row).select("id").single();
    if (error) throw error;
    return data;
  }
  async function approveReview(id) {
    if (!sb) {
      const s = loadStore();
      const r = s.reviews.find((x) => x.id === id);
      if (r) r.status = "live";
      saveStore(s);
      return;
    }
    const { error } = await sb.from("reviews").update({ status: "live" }).eq("id", id);
    if (error) throw error;
  }
  async function rejectReview(id, reason) {
    if (!sb) {
      const s = loadStore();
      const r = s.reviews.find((x) => x.id === id);
      if (r) { r.status = "rejected"; r.reject_reason = reason || null; }
      saveStore(s);
      return;
    }
    const { error } = await sb.from("reviews").update({ status: "rejected", reject_reason: reason }).eq("id", id);
    if (error) throw error;
  }
  // 精選心得（跨計畫，給「關於校園大使」頁做社會證明；只回 live，附品牌名）
  async function getFeaturedReviews(limit = 3) {
    if (!sb) {
      const progs = localAllPrograms();
      return loadStore().reviews
        .filter((r) => r.status === "live")
        .slice(0, limit)
        .map((r) => {
          const p = progs.find((x) => x.id === r.program_id);
          return { ...r, brand: p?.brand || "", title: p?.title || "" };
        });
    }
    const { data, error } = await sb.from("reviews").select("*, programs(title, brand)")
      .eq("status", "live").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((r) => ({ ...r, brand: r.programs?.brand || "", title: r.programs?.title || "" }));
  }

  // ========== 廠商查稿（用編號查投稿狀態）==========
  async function getProgramStatus(id) {
    const pid = String(id || "").trim();
    if (!pid) return { found: false };
    if (!sb) {
      const p = localAllPrograms().find((x) => x.id === pid);
      return p
        ? { found: true, title: p.title, brand: p.brand, status: p.status, reject_reason: p.reject_reason || null }
        : { found: false };
    }
    // 雲端：走 RPC（security definer，只回這一筆的狀態，不會外洩其他待審資料）
    const { data, error } = await sb.rpc("get_program_status", { pid });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? { found: true, ...row } : { found: false };
  }

  // ========== 名片牆 profiles ==========
  // 本機：合併 data.js 的 PROFILES + localStorage 使用者建立的，套用 override 狀態
  function localAllProfiles() {
    const s = loadStore();
    const base = (window.PROFILES || []).map((p) => ({ ...p }));
    const all = base.concat((s.profiles || []).map((p) => ({ ...p })));
    return all.map((p) => {
      const ov = (s.profileOverrides || {})[p.id];
      return ov ? { ...p, status: ov.status } : p;
    });
  }
  function localSetProfileStatus(id, status) {
    const s = loadStore();
    s.profileOverrides = s.profileOverrides || {};
    const own = (s.profiles || []).find((p) => p.id === id);
    if (own) own.status = status;
    else s.profileOverrides[id] = { status };
    saveStore(s);
  }
  // 大使名片 DB row(snake) → 前端(camel)：igUrl/contactOpen
  function normalizeProfile(r) {
    return { ...r, igUrl: r.ig_url, contactOpen: r.contact_open };
  }
  async function getProfiles() {
    if (!sb) return localAllProfiles().filter((p) => p.status === "live");
    const { data, error } = await sb.from("profiles").select("*").eq("status", "live").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeProfile);
  }
  async function getPendingProfiles() {
    if (!sb) return localAllProfiles().filter((p) => p.status === "pending");
    const { data, error } = await sb.from("profiles").select("*").eq("status", "pending");
    if (error) throw error;
    return (data || []).map(normalizeProfile);
  }
  // 目前使用者自己的名片（本機模式用 localStorage 的第一張自建）
  async function getMyProfile() {
    if (!sb) {
      const s = loadStore();
      return (s.profiles || [])[0] || null;
    }
    if (!currentUser) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    return data ? normalizeProfile(data) : null;
  }
  async function saveProfile(form) {
    // 建立/更新名片（送出後為 pending 待審）
    if (!sb) {
      const s = loadStore();
      s.profiles = s.profiles || [];
      const existing = s.profiles[0];
      if (existing) Object.assign(existing, form, { status: "pending" });
      else s.profiles.push({ ...form, id: "mp-" + Date.now(), badges: [], status: "pending" });
      saveStore(s);
      return { ok: true };
    }
    if (!currentUser) throw new Error("請先登入");
    // 前端 camelCase → 資料表 snake_case（欄位名要對得上）
    const row = {
      user_id: currentUser.id,
      nickname: form.nickname, avatar: form.avatar, avatar_url: form.avatar_url || null,
      school: form.school, grade: form.grade, headline: form.headline,
      skills: form.skills || [], experiences: form.experiences || [],
      ig_url: form.igUrl || null, contact_open: !!form.contactOpen,
      status: "pending",
    };
    const { error } = await sb.from("profiles").upsert(row, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  }
  // ========== 個人檔案 accounts（會員基本身分，跟大使名片分開）==========
  async function getMyAccount() {
    if (!sb) {
      const s = loadStore();
      return s.account || null;
    }
    if (!currentUser) return null;
    const { data, error } = await sb.from("accounts").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  async function saveAccount(form) {
    // form: { nickname, avatar_url }
    if (!sb) {
      const s = loadStore();
      s.account = { ...(s.account || {}), ...form };
      saveStore(s);
      return { ok: true };
    }
    if (!currentUser) throw new Error("請先登入");
    const row = { user_id: currentUser.id, ...form };
    const { error } = await sb.from("accounts").upsert(row, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  }
  // 一批 user_id → {user_id: {nickname, avatar_url}}（公開處顯示身分用）
  async function getAccountsMap(userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (!sb || !ids.length) return {};
    const { data, error } = await sb.from("accounts").select("user_id, nickname, avatar_url").in("user_id", ids);
    if (error) return {};
    const map = {};
    (data || []).forEach((a) => { map[a.user_id] = a; });
    return map;
  }

  // 上傳前壓縮：正方形置中裁切、縮到 size、JPEG（沿用購物趣做法）
  function compressImage(file, size = 400, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const out = Math.min(size, side);
        const canvas = document.createElement("canvas");
        canvas.width = out; canvas.height = out;
        canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, out, out);
        canvas.toBlob((b) => resolve(b || file), "image/jpeg", quality);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }
  // 頭貼上傳：壓縮 → 上傳 storage → 回 public URL；本機模式回 dataURL
  async function uploadAvatar(file) {
    const blob = await compressImage(file);
    if (!sb || !currentUser) {
      return await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blob);
      });
    }
    const path = `${currentUser.id}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
    return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function approveProfile(id) {
    if (!sb) return localSetProfileStatus(id, "live");
    const { error } = await sb.from("profiles").update({ status: "live" }).eq("id", id);
    if (error) throw error;
  }
  async function rejectProfile(id) {
    if (!sb) return localSetProfileStatus(id, "rejected");
    const { error } = await sb.from("profiles").update({ status: "rejected" }).eq("id", id);
    if (error) throw error;
  }

  // ========== 活動 events ==========
  function localAllEvents() {
    const s = loadStore();
    const base = (window.EVENTS || []).map((e) => ({ ...e }));
    const all = base.concat((s.events || []).map((e) => ({ ...e })));
    return all.map((e) => {
      const ov = (s.eventOverrides || {})[e.id];
      const signups = (s.eventSignups || {})[e.id];
      let out = e;
      if (ov) out = { ...out, status: ov.status };
      if (signups) out = { ...out, signupIds: Array.from(new Set([...(out.signupIds || []), ...signups])) };
      return out;
    });
  }
  function localSetEventStatus(id, status) {
    const s = loadStore();
    s.eventOverrides = s.eventOverrides || {};
    const own = (s.events || []).find((e) => e.id === id);
    if (own) own.status = status;
    else s.eventOverrides[id] = { status };
    saveStore(s);
  }
  // 雲端活動 row → 前端格式（跟本機假資料同 shape：hostId/signupIds）
  function normalizeEvent(e) {
    return {
      id: e.id, hostId: e.host_user_id, title: e.title, type: e.type,
      description: e.description, eventAt: e.event_at, locationType: e.location_type,
      location: e.location, capacity: e.capacity, status: e.status,
      signupIds: (e.event_signups || []).map((s) => s.user_id),
    };
  }
  async function getEvents() {
    if (!sb) return localAllEvents().filter((e) => e.status === "live");
    const { data, error } = await sb.from("events").select("*, event_signups(user_id)").eq("status", "live").order("event_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeEvent);
  }
  async function getPendingEvents() {
    if (!sb) return localAllEvents().filter((e) => e.status === "pending");
    const { data, error } = await sb.from("events").select("*, event_signups(user_id)").eq("status", "pending").order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(normalizeEvent);
    const map = await getAccountsMap(rows.map((r) => r.hostId));
    return rows.map((r) => ({ ...r, hostName: map[r.hostId]?.nickname || "會員" }));
  }
  async function createEvent(form) {
    if (!sb) {
      const s = loadStore();
      s.events = s.events || [];
      s.events.push({ ...form, id: "me-" + Date.now(), signupIds: [], status: "pending" });
      saveStore(s);
      return { ok: true };
    }
    if (!currentUser) throw new Error("請先登入");
    // 前端 camelCase → 資料表 snake_case
    const row = {
      host_user_id: currentUser.id,
      title: form.title, type: form.type, description: form.description,
      event_at: form.eventAt || null, location_type: form.locationType || "offline",
      location: form.location, capacity: form.capacity || null,
      status: "pending",
    };
    const { error } = await sb.from("events").insert(row);
    if (error) throw error;
    return { ok: true };
  }
  async function approveEvent(id) {
    if (!sb) return localSetEventStatus(id, "live");
    const { error } = await sb.from("events").update({ status: "live" }).eq("id", id);
    if (error) throw error;
  }
  async function rejectEvent(id) {
    if (!sb) return localSetEventStatus(id, "rejected");
    const { error } = await sb.from("events").update({ status: "rejected" }).eq("id", id);
    if (error) throw error;
  }
  // 報名（本機模式用固定 demo 身分 'me'）
  async function toggleSignup(eventId) {
    if (!sb) {
      const s = loadStore();
      s.eventSignups = s.eventSignups || {};
      const arr = s.eventSignups[eventId] || [];
      const me = "me";
      const i = arr.indexOf(me);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(me);
      s.eventSignups[eventId] = arr;
      saveStore(s);
      return arr.includes(me);
    }
    if (!currentUser) throw new Error("請先登入");
    const { data: existing } = await sb.from("event_signups").select("*").eq("event_id", eventId).eq("user_id", currentUser.id).maybeSingle();
    if (existing) {
      await sb.from("event_signups").delete().eq("event_id", eventId).eq("user_id", currentUser.id);
      return false;
    }
    await sb.from("event_signups").insert({ event_id: eventId, user_id: currentUser.id });
    return true;
  }
  // 本機模式：我報名了哪些活動
  function localMySignups() {
    const s = loadStore();
    const out = [];
    Object.entries(s.eventSignups || {}).forEach(([eid, arr]) => { if (arr.includes("me")) out.push(eid); });
    return out;
  }

  // ========== 許願池 wishes ==========
  async function submitWish(brandName, reason) {
    if (!sb) {
      const s = loadStore();
      s.wishes = s.wishes || [];
      s.wishes.push({ id: "w-" + Date.now(), brand_name: brandName, reason: reason || null, created_at: new Date(0).toISOString() });
      saveStore(s);
      return { ok: true };
    }
    if (!currentUser) throw new Error("請先登入再許願");
    const { error } = await sb.from("wishes").insert({ user_id: currentUser.id, brand_name: brandName, reason: reason || null });
    if (error) throw error;
    return { ok: true };
  }
  // 後台：依品牌彙總的許願清單
  async function getAdminWishes() {
    if (!sb) {
      const s = loadStore();
      const map = {};
      (s.wishes || []).forEach((w) => { map[w.brand_name] = (map[w.brand_name] || 0) + 1; });
      return Object.entries(map).map(([brand_name, votes]) => ({ brand_name, votes })).sort((a, b) => b.votes - a.votes);
    }
    const { data, error } = await sb.rpc("admin_wishes");
    if (error) throw error;
    return data || [];
  }
  // 後台：數據總覽
  async function getAdminStats() {
    if (!sb) {
      const s = loadStore();
      return {
        users: 0, favorites: localFavs.get().length,
        subscriptions: 0, wishes: (s.wishes || []).length,
        profiles_live: localAllProfiles().filter((p) => p.status === "live").length,
        programs_live: localAllPrograms().filter((p) => p.status === "live").length,
        pending_programs: localAllPrograms().filter((p) => p.status === "pending").length,
        pending_reviews: (s.reviews || []).filter((r) => r.status === "pending").length,
        pending_profiles: localAllProfiles().filter((p) => p.status === "pending").length,
        pending_events: localAllEvents().filter((e) => e.status === "pending").length,
        pending_notes: (s.notes || []).filter((n) => n.status === "pending").length,
      };
    }
    const { data, error } = await sb.rpc("admin_stats");
    if (error) throw error;
    return data || {};
  }


  return {
    MODE, configured: !!sb,
    initAuth, onAuth, signUp, signIn, signInWithGoogle, signOut, getUser, isAdmin,
    getPrograms, getPendingPrograms, submitProgram, approveProgram, rejectProgram, getProgramStatus,
    updateProgram, setRecruiting, submitProgramNote, getPendingNotes, resolveNote,
    getFavorites, toggleFavorite,
    getReviews, getPendingReviews, submitReview, approveReview, rejectReview, getFeaturedReviews,
    getProfiles, getPendingProfiles, getMyProfile, saveProfile, approveProfile, rejectProfile, uploadAvatar,
    getMyAccount, saveAccount, getAccountsMap,
    getEvents, getPendingEvents, createEvent, approveEvent, rejectEvent, toggleSignup, localMySignups,
    submitWish, getAdminWishes, getAdminStats,
    cfg,
    CATEGORIES: (window.CATEGORIES || []).filter((c) => c !== "全部"),
  };
})();
