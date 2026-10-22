/* Deshi Drop — admin dashboard. Talks to Supabase directly; every permission is enforced by the database (RLS),
   so hiding a button here is only for convenience — it is never the security. */
(() => {
'use strict';
const C = window.DD_BACKEND || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => { n = Number(n) || 0; return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const money0 = (n) => { n = Math.round(Number(n) || 0); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US'); };
const STATUS = { new: 'New', confirmed: 'Confirmed', packing: 'Packing', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const FLOW = ['new', 'confirmed', 'packing', 'out_for_delivery', 'delivered'];
const dayKey = (d) => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtDT = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtD = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const photo = (o) => safeUrl(o.image_url) || (o.photo_key && /^[a-z0-9_-]+$/i.test(o.photo_key) ? '../img/p/' + o.photo_key + '.jpg' : '../img/logo.jpg');
function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
function toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), bad ? 6000 : 3200); }
const S = { sb: null, me: null, role: null, view: null, range: 30, products: [], orders: [], newCount: 0, seen: new Set(), poll: null };
const isAdmin = () => S.role === 'admin', isStaff = () => S.role === 'admin' || S.role === 'staff';
const must = (r) => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };
const fail = (e) => toast(e.message || String(e), true);

/* ------------------------------------------------------------------ boot + auth */
async function boot() {
  if (!C.url || !C.anonKey) return void ($('#app').innerHTML = '<div class="boot">The backend is not connected yet. Fill in <b>js/backend-config.js</b> (Supabase URL + anon key) and reload.</div>');
  S.sb = window.supabase.createClient(String(C.url).replace(/\/(rest|auth)\/v1.*$/,'').replace(/\/+$/,''), C.anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true } });
  const { data } = await S.sb.auth.getSession();
  if (data.session) await enter(); else loginView();
  S.sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') loginView(); });
}
function loginView(msg) {
  clearInterval(S.poll);
  $('#app').innerHTML = `<div class="login"><form class="box" id="lf"><img src="../img/logo.jpg" alt=""><h1>Deshi Drop</h1><p>Team dashboard — sign in</p>
    <label for="em">Email</label><input id="em" type="email" autocomplete="username" required>
    <label for="pw" class="mt">Password</label><input id="pw" type="password" autocomplete="current-password" required>
    <button class="btn mt" style="width:100%" id="go">Sign in</button><div class="err" id="le">${esc(msg || '')}</div></form></div>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); $('#go').disabled = true; $('#le').textContent = '';
    const { error } = await S.sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
    if (error) { $('#le').textContent = error.message; $('#go').disabled = false; } else enter();
  };
}
async function enter() {
  try {
    const { data: u } = await S.sb.auth.getUser();
    if (!u.user) return loginView();
    const p = must(await S.sb.from('profiles').select('id,role,full_name,active').eq('id', u.user.id).maybeSingle());
    if (!p || !p.active || !['admin', 'staff', 'driver'].includes(p.role)) {
      await S.sb.auth.signOut(); return loginView('This account does not have dashboard access. Ask the owner to give you a role.');
    }
    S.me = { id: u.user.id, email: u.user.email, name: p.full_name || u.user.email }; S.role = p.role;
    S.products = must(await S.sb.from('products').select('*').order('sort').order('id'));
    shell();
    go(S.role === 'driver' ? 'deliveries' : 'overview');
    S.poll = setInterval(pollOrders, 30000);
  } catch (e) { loginView(e.message); }
}
const NAV = {
  admin: [['overview', '📊', 'Overview'], ['orders', '🧾', 'Orders'], ['neworder', '➕', 'New order'], ['products', '🥩', 'Products'], ['deals', '🏷️', 'Deals'], ['content', '✏️', 'Site text'], ['money', '💰', 'Money'], ['people', '👥', 'People'], ['settings', '⚙️', 'Settings'], ['activity', '🕘', 'Activity']],
  staff: [['overview', '📊', 'Overview'], ['orders', '🧾', 'Orders'], ['neworder', '➕', 'New order']],
  driver: [['deliveries', '🚚', 'My deliveries']]
};
function shell() {
  $('#app').innerHTML = `<div class="shell"><aside class="side" id="side"><div class="brand"><img src="../img/logo.jpg" alt="">Deshi Drop</div>
    <nav class="nav">${NAV[S.role].map(([k, i, l]) => `<button data-nav="${k}"><span class="ic">${i}</span>${l}${k === 'orders' ? '<span class="bd" id="nb" hidden></span>' : ''}</button>`).join('')}</nav>
    <div class="nav"><button data-open="site"><span class="ic">🌐</span>View website</button><button data-act="logout"><span class="ic">🚪</span>Sign out</button></div>
    <div class="me"><b>${esc(S.me.name)}</b>${esc(S.role)}</div></aside>
    <main class="main"><div class="top"><button class="btn ghost menu-btn" data-act="menu">☰</button><h2 id="vt"></h2><div id="va" class="row"></div></div><div id="view"></div></main></div>`;
}
document.addEventListener('click', (e) => {
  const n = e.target.closest('[data-nav]'); if (n) { $('#side')?.classList.remove('open'); return go(n.dataset.nav); }
  const a = e.target.closest('[data-act]'); if (!a) { if (e.target.closest('[data-open=site]')) location.href = '../'; return; }
  const f = ACT[a.dataset.act]; if (f) { Promise.resolve(f(a, e)).catch(fail); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOv(); });
const ACT = {
  menu: () => $('#side').classList.toggle('open'),
  logout: async () => { await S.sb.auth.signOut(); },
  close: () => closeOv()
};
function closeOv() { $$('.ov').forEach((o) => o.remove()); }
function overlay(html, cls) { closeOv(); const o = document.createElement('div'); o.className = 'ov ' + (cls || ''); o.innerHTML = html; o.addEventListener('mousedown', (e) => { if (e.target === o) closeOv(); }); document.body.appendChild(o); return o; }
function go(v) {
  S.view = v; $$('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === v));
  const T = { overview: 'Overview', orders: 'Orders', neworder: 'New order (phone / walk-in)', products: 'Products', deals: 'Deals', content: 'Site text', money: 'Money — expenses & investment', people: 'People', settings: 'Settings', activity: 'Activity log', deliveries: 'My deliveries' };
  $('#vt').textContent = T[v] || v; $('#va').innerHTML = ''; $('#view').innerHTML = '<div class="empty">Loading…</div>';
  (VIEWS[v] || (() => {}))().catch((e) => { $('#view').innerHTML = `<div class="empty">Something went wrong: ${esc(e.message)}</div>`; });
}
const VIEWS = {};
window.__DDA = { S, $, $$, esc, money, money0, STATUS, FLOW, dayKey, fmtDT, fmtD, photo, toast, must, fail, ACT, VIEWS, overlay, closeOv, go, isAdmin, isStaff, safeUrl };

/* ------------------------------------------------------------------ order polling (new order alert) */
async function pollOrders() {
  if (!S.me || S.role === 'driver') return;
  try {
    const rows = must(await S.sb.from('orders').select('id,code,status,customer_name,total,created_at').order('created_at', { ascending: false }).limit(30));
    if (!S.seen.size) { rows.forEach((r) => S.seen.add(r.id)); }
    const fresh = rows.filter((r) => !S.seen.has(r.id));
    fresh.forEach((r) => { S.seen.add(r.id); toast(`🔔 New order ${r.code} — ${r.customer_name} ${money(r.total)}`); });
    S.newCount = rows.filter((r) => r.status === 'new').length;
    const b = $('#nb'); if (b) { b.hidden = !S.newCount; b.textContent = S.newCount; }
    document.title = (S.newCount ? `(${S.newCount}) ` : '') + 'Deshi Drop — Dashboard';
    if (fresh.length && (S.view === 'orders' || S.view === 'overview')) go(S.view);
  } catch (e) { /* offline blip — try again next tick */ }
}
window.__DDA.pollOrders = pollOrders;
window.addEventListener("load", boot);
})();
