/* Deshi Drop — backend client (Supabase). Loads live products / deals / site text / settings, and handles real
   signup, login, password reset, profile and orders. If js/backend-config.js is empty, window.DDB.enabled is false and
   the site keeps using its built-in data and local demo account, so nothing breaks while the backend is being set up. */
(function () {
  'use strict';
  const C = window.DD_BACKEND || {};
  const DDB = window.DDB = { enabled: !!(C.url && C.anonKey), user: null, profile: null, orders: [], client: null };
  if (!DDB.enabled) return;

  const SESS = 'dd_session', CACHE = 'dd_be_cache';
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  const SDK = 'js/vendor/supabase.js';   // supabase-js 2.45.4, hosted with the site (no third-party script)
  const here = () => location.origin + location.pathname;
  const emit = (event, extra) => document.dispatchEvent(new CustomEvent('ddauth', { detail: Object.assign({ event }, extra || {}) }));
  const fail = (e) => { throw e && e.message ? e : new Error('request failed'); };

  // old local-demo sessions must not survive once a real backend is switched on
  const old = ls.get(SESS); if (old && !old.backend) ls.set(SESS, null);

  const sdkReady = new Promise((ok, no) => {
    if (window.supabase && window.supabase.createClient) return ok();
    const s = document.createElement('script'); s.src = SDK; s.async = true; s.onload = ok; s.onerror = () => no(new Error('Could not load the Supabase library.'));
    document.head.appendChild(s);
  });

  const fresh = /[?&]code=/.test(location.search);   // returning from Google/Facebook sign-in or an email link

  async function loadProfile() {
    if (!DDB.user) { DDB.profile = null; return null; }
    const { data } = await DDB.client.from('profiles').select('*').eq('id', DDB.user.id).maybeSingle();
    DDB.profile = data || null; return DDB.profile;
  }
  async function applySession(session) {
    DDB.user = session && session.user || null;
    if (!DDB.user) { ls.set(SESS, null); DDB.profile = null; DDB.orders = []; return; }
    await loadProfile();
    const u = DDB.user, p = DDB.profile || {}, md = u.user_metadata || {};
    ls.set(SESS, {
      key: u.id, backend: true, name: p.full_name || md.full_name || md.name || (u.email || '').split('@')[0], email: u.email || '',
      provider: (u.app_metadata && u.app_metadata.provider) || 'email', picture: md.avatar_url || md.picture || '', demo: false,
      role: p.role || 'customer', phone: p.phone || '', address: p.address || ''
    });
  }

  DDB.ready = sdkReady.then(async () => {
    DDB.client = window.supabase.createClient(String(C.url).replace(/\/(rest|auth)\/v1.*$/,'').replace(/\/+$/,''), C.anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    DDB.client.auth.onAuthStateChange((event, session) => {
      // never await Supabase calls inside this callback (it can deadlock the client) — hand off to a timer
      setTimeout(async () => {
        await applySession(session);
        if (event === 'PASSWORD_RECOVERY') emit(event, { fresh: true });
        else emit(event, { fresh: fresh && event === 'SIGNED_IN' });
        if (fresh && event === 'SIGNED_IN') { try { history.replaceState(null, '', here() + location.hash); } catch (e) { /* ignore */ } }
      }, 0);
    });
    const { data } = await DDB.client.auth.getSession();
    await applySession(data && data.session);
    loadPublic();                                   // don't block the page on content
  }).catch((e) => { console.warn('[Deshi Drop] backend unavailable — using built-in content.', e); DDB.failed = true; });

  /* ---------------- public content: products, deals, site text, settings ---------------- */
  async function loadPublic() {
    try {
      const q = DDB.client;
      const [pr, de, co, se] = await Promise.all([
        q.from('products').select('*').eq('active', true).order('sort', { ascending: true }),
        q.from('deals').select('pct,active,starts_at,ends_at,sort,products(name)').order('sort', { ascending: true }),
        q.from('site_content').select('key,en,bn,ar'),
        q.from('settings').select('key,value')
      ]);
      const data = {};
      if (!pr.error && pr.data && pr.data.length) data.products = pr.data;
      if (!de.error && de.data) data.deals = de.data.filter((r) => r.products && r.products.name).map((r) => ({ name: r.products.name, pct: r.pct, active: r.active, from: r.starts_at, until: r.ends_at }));
      if (!co.error && co.data && co.data.length) {
        data.content = { en: {}, bn: {}, ar: {} };
        co.data.forEach((r) => ['en', 'bn', 'ar'].forEach((l) => { if (r[l]) data.content[l][r.key] = r[l]; }));
      }
      if (!se.error && se.data) { data.settings = {}; se.data.forEach((r) => { data.settings[r.key] = r.value; }); }
      if (window.__ddBackendData) window.__ddBackendData(data);
      DDB.loaded = true; emit('DATA', {});
    } catch (e) { console.warn('[Deshi Drop] could not load live content — using built-in content.', e); }
  }
  DDB.reload = loadPublic;

  /* ---------------- auth ---------------- */
  const need = async () => { await DDB.ready; if (!DDB.client) throw new Error('Backend is not reachable. Please try again.'); return DDB.client; };
  DDB.signUp = async (name, email, password, phone) => {
    const c = await need();
    const { data, error } = await c.auth.signUp({ email, password, options: { data: { full_name: name, phone: phone || '' }, emailRedirectTo: here() } });
    if (error) fail(error);
    if (data.session) { await applySession(data.session); return { needsConfirm: false }; }
    return { needsConfirm: true };
  };
  DDB.signIn = async (email, password) => {
    const c = await need();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) fail(error);
    await applySession(data.session);
  };
  DDB.signOut = async () => { const c = await need(); await c.auth.signOut(); await applySession(null); };
  DDB.resetPassword = async (email) => { const c = await need(); const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: here() }); if (error) fail(error); };
  DDB.updatePassword = async (pw) => { const c = await need(); const { error } = await c.auth.updateUser({ password: pw }); if (error) fail(error); };
  DDB.oauth = async (provider) => { const c = await need(); const { error } = await c.auth.signInWithOAuth({ provider, options: { redirectTo: here() } }); if (error) fail(error); };

  DDB.saveProfile = async (patch) => {
    const c = await need(); if (!DDB.user) return;
    const { error } = await c.from('profiles').update(patch).eq('id', DDB.user.id); if (error) fail(error);
    const s = ls.get(SESS); if (s) ls.set(SESS, Object.assign(s, { name: patch.full_name || s.name, phone: patch.phone || s.phone, address: patch.address || s.address }));
  };

  /* ---------------- orders ---------------- */
  DDB.placeOrder = async (o) => {
    const c = await need();
    const { data, error } = await c.rpc('place_order', { p_items: o.items, p_name: o.name, p_phone: o.phone, p_address: o.address, p_notes: o.notes || '', p_pay: o.pay || 'cod' });
    if (error) fail(error);
    DDB.orders = []; return data;
  };
  DDB.loadOrders = async () => {
    const c = await need(); if (!DDB.user) return [];
    const { data, error } = await c.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) fail(error);
    DDB.orders = (data || []).map((r) => ({
      id: r.code, ts: Date.parse(r.created_at), total: Math.round(Number(r.total) * 100), fee: Number(r.delivery_fee), status: r.status, address: r.address,
      items: (r.order_items || []).map((i) => ({ name: i.name, qty: Number(i.qty), unit: Math.round(Number(i.unit_price) * 100) }))
    }));
    return DDB.orders;
  };
})();
