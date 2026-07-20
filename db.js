// Campus X 資料層（db.js）
// 「雙模式」大腦：config.js 填了 Supabase → 用雲端；沒填 → 用本機 data.js + localStorage。
// app.js 只呼叫這裡的函式，不用管背後是雲端還是本機。
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
  const favKey = "cai_favs"; // 本機模式收藏

  // ---------- 本機 fallback 用的收藏 ----------
  const localFavs = {
    get: () => JSON.parse(localStorage.getItem(favKey) || "[]"),
    toggle(id) {
      const f = localFavs.get();
      const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1);
      else f.push(id);
      localStorage.setItem(favKey, JSON.stringify(f));
      return f.includes(id);
    },
  };

  // ---------- Auth ----------
  let currentUser = null;
  const authListeners = [];
  function onAuth(cb) {
    authListeners.push(cb);
    cb(currentUser);
  }
  function emitAuth() {
    authListeners.forEach((cb) => cb(currentUser));
  }

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
  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut();
  }
  function getUser() {
    return currentUser;
  }
  function isAdmin() {
    return !!currentUser && currentUser.email === cfg.ADMIN_EMAIL;
  }

  // ---------- Programs ----------
  async function getPrograms() {
    if (!sb) {
      return (window.PROGRAMS || [])
        .filter((p) => p.status === "live")
        .map(normalizeLocal);
    }
    const { data, error } = await sb
      .from("programs")
      .select("*")
      .eq("status", "live")
      .order("deadline", { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeRow);
  }

  // 把 DB 欄位（apply_url）對應成前台用的 camelCase（applyUrl）
  function normalizeRow(r) {
    return {
      id: r.id,
      brand: r.brand,
      emoji: r.emoji,
      category: r.category,
      title: r.title,
      summary: r.summary,
      tasks: r.tasks || [],
      benefits: r.benefits || [],
      eligibility: r.eligibility,
      term: r.term,
      paid: r.paid,
      location: r.location,
      deadline: r.deadline,
      applyUrl: r.apply_url,
      status: r.status,
    };
  }
  function normalizeLocal(p) {
    return p; // data.js 本來就是 camelCase
  }

  // ---------- Favorites ----------
  async function getFavorites() {
    if (!sb || !currentUser) return localFavs.get();
    const { data, error } = await sb
      .from("favorites")
      .select("program_id")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    return (data || []).map((x) => x.program_id);
  }
  // 回傳新的收藏狀態（true=已收藏）
  async function toggleFavorite(programId) {
    if (!sb || !currentUser) return localFavs.toggle(programId);
    const current = await getFavorites();
    if (current.includes(programId)) {
      await sb.from("favorites").delete().eq("user_id", currentUser.id).eq("program_id", programId);
      return false;
    } else {
      await sb.from("favorites").insert({ user_id: currentUser.id, program_id: programId });
      return true;
    }
  }

  // ---------- Subscriptions ----------
  async function subscribe(email, categories = []) {
    if (!sb) return { local: true }; // 本機模式只做前端提示
    const { error } = await sb
      .from("subscriptions")
      .upsert({ email, categories, user_id: currentUser?.id || null }, { onConflict: "email" });
    if (error) throw error;
    return { ok: true };
  }

  return {
    MODE,
    configured: !!sb,
    initAuth, onAuth, signUp, signIn, signOut, getUser, isAdmin,
    getPrograms, getFavorites, toggleFavorite, subscribe,
  };
})();
