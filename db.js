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
    return { submitted: d.submitted || [], overrides: d.overrides || {}, reviews: d.reviews || [] };
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
      const ov = s.overrides[p.id];
      if (ov) return { ...p, status: ov.status, reject_reason: ov.reject_reason };
      return p;
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

  // ========== Subscriptions ==========
  async function subscribe(email, categories = []) {
    if (!sb) return { local: true };
    const { error } = await sb.from("subscriptions")
      .upsert({ email, categories, user_id: currentUser?.id || null }, { onConflict: "email" });
    if (error) throw error;
    return { ok: true };
  }

  return {
    MODE, configured: !!sb,
    initAuth, onAuth, signUp, signIn, signOut, getUser, isAdmin,
    getPrograms, getPendingPrograms, submitProgram, approveProgram, rejectProgram,
    getFavorites, toggleFavorite,
    getReviews, getPendingReviews, submitReview, approveReview, rejectReview,
    subscribe,
    CATEGORIES: (window.CATEGORIES || []).filter((c) => c !== "全部"),
  };
})();
