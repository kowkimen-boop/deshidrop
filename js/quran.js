/* Deshi Drop — Quran reader.
   Part of the one Deshi Drop site: #/ is the shop; Quran routes are #/quran (lists)  #/quran/surah/2/255  #/quran/saved/bookmarks|favorites  #/quran/search?q=
   Everything the reader remembers lives in localStorage under dd_quran_v1. */
(function () {
  'use strict';
  const M = window.QURAN_META, S = M.surahs;
  const app = document.getElementById('q-app');
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const K = (s, a) => s * 1000 + a;

  const I = (p, extra) => '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>';
  const ICON = {
    menu: I('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    back: I('<path d="M15 18l-6-6 6-6"/>'),
    close: I('<path d="M18 6 6 18M6 6l12 12"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    bolt: I('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>'),
    bm: I('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>'),
    heart: I('<path d="M12 21s-7-4.6-9.3-9.2C1 8.3 3 4.5 6.7 4.5c2 0 3.7 1.1 5.3 3 1.6-1.9 3.3-3 5.3-3 3.7 0 5.7 3.8 4 7.3C19 16.4 12 21 12 21z"/>'),
    copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
    share: I('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
    book: I('<path d="M12 6.5C10.3 5 8 4.5 4 4.5v13c4 0 6.3.5 8 2 1.7-1.5 4-2 8-2v-13c-4 0-6.3.5-8 2z"/><path d="M12 6.5v13"/>'),
    home: I('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    chev: I('<path d="M9 18l6-6-6-6"/>'),
    aa: I('<path d="M3 19 8 6l5 13M5 14h6M15 19l3.5-9 3.5 9M16.2 16.5h4.6"/>'),
  };

  /* ---------------- storage ---------------- */
  const KEY = 'dd_quran_v1';
  const defaults = () => ({ bookmarks: [], favorites: [], last: {}, recent: [], streak: { count: 0, day: '' }, settings: { ar: true, en: true, bn: true, arSize: 30, trSize: 16 } });
  let warned = false;
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o && typeof o === 'object') {
        const d = defaults();
        return Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}), streak: Object.assign(d.streak, o.streak || {}) });
      }
    } catch (e) { /* fall through */ }
    return defaults();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { if (!warned) { warned = true; toast('Browser storage is off — progress won’t be saved'); } }
  }
  const idxOf = (list, s, a) => list.findIndex((x) => x.s === s && x.a === a);
  function toggleSaved(name, s, a) {
    const L = state[name], i = idxOf(L, s, a);
    if (i >= 0) L.splice(i, 1); else L.unshift({ s, a, t: Date.now() });
    save(); return i < 0;
  }

  /* streak = consecutive days with reading activity (local time) */
  const dayStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
  function bumpStreak() {
    const t = dayStr(new Date()), st = state.streak;
    if (st.day === t) return;
    st.count = st.day === yesterday() ? st.count + 1 : 1; st.day = t;
  }
  const streakNow = () => (state.streak.day === dayStr(new Date()) || state.streak.day === yesterday()) ? state.streak.count : 0;

  /* ---------------- data ---------------- */
  let dataPromise = null;
  function loadData() {
    if (window.QURAN_DATA) return Promise.resolve(window.QURAN_DATA);
    if (!dataPromise) {
      dataPromise = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'js/quran-data.js';
        sc.onload = () => res(window.QURAN_DATA);
        sc.onerror = () => { dataPromise = null; rej(new Error('Could not load js/quran-data.js')); };
        document.head.appendChild(sc);
      });
    }
    return dataPromise;
  }
  // Tanzil prefixes the bismillah (4 words) to verse 1 of every surah except 1 and 9; the reader shows it as a header instead.
  const arText = (s, a) => { const t = window.QURAN_DATA.ar[s - 1][a - 1]; return (a === 1 && s !== 1 && s !== 9) ? t.split(' ').slice(4).join(' ') : t; };
  const enText = (s, a) => window.QURAN_DATA.en[s - 1][a - 1];
  const bnText = (s, a) => window.QURAN_DATA.bn[s - 1][a - 1];
  const PAGE_K = M.pages.map((p) => K(p[0], p[1])), JUZ_K = M.juz.map((p) => K(p[0], p[1]));
  function bucket(arr, k) { let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m] <= k) lo = m; else hi = m - 1; } return lo + 1; }
  const pageOf = (s, a) => bucket(PAGE_K, K(s, a)), juzOf = (s, a) => bucket(JUZ_K, K(s, a));
  const ref = (s, a) => S[s - 1].tr + ' ' + s + ':' + a;
  const hrefTo = (s, a) => '#/quran/surah/' + s + (a > 1 ? '/' + a : '');

  /* ---------------- ui helpers ---------------- */
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  const stateHTML = (title, msg, btn) => '<div class="q-state"><b>' + title + '</b>' + msg + (btn ? '<br>' + btn : '') + '</div>';
  const loadingHTML = '<div class="q-state"><div class="q-spin" aria-hidden="true"></div>Loading the Quran…</div>';

  function setBar(mode, title) {
    const left = $('bar-left'), home = mode === 'home';
    left.innerHTML = home ? ICON.menu : ICON.back;
    left.setAttribute('aria-label', home ? 'Open menu' : 'Back');
    left.dataset.mode = mode;
    $('bar-title').textContent = title || 'Al Quran';
    $('bar-streak').hidden = !home;
    $('bar-aa').hidden = mode !== 'reader';
    refreshStreak();
  }
  function refreshStreak() { const n = streakNow(), b = $('bar-streak'); b.innerHTML = ICON.bolt + '<span>' + n + '</span>'; b.setAttribute('aria-label', 'Reading streak: ' + n + (n === 1 ? ' day' : ' days')); }

  /* ---------------- routing ---------------- */
  let navDepth = 0, token = 0, curHash = null, homeTab = 'surah';
  const scrollMem = {};
  history.scrollRestoration = 'manual';
  function go(h) { if (location.hash === h) { route(); return; } navDepth++; location.hash = h; }
  function goBack() { if (navDepth > 0) { navDepth--; history.back(); } else { location.replace('#/quran'); } }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.mobile-tabbar a[data-tab]');
    if (t && !inQ && (t.dataset.tab === 'home' || t.dataset.tab === 'search')) {   // already on the shop: scroll up / focus its search box
      e.preventDefault(); jump(0);
      if (t.dataset.tab === 'search') { const i = document.querySelector('#view-home .search-box input'); if (i) i.focus({ preventScroll: true }); }
      return;
    }
    const a = e.target.closest('a[href^="#/quran"]'); if (!a) return;
    e.preventDefault(); closeDrawer(); go(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', route);

  /* One site, two views: the shop (default) and the Quran (any #/quran… URL). */
  const homeView = $('view-home'), quranView = $('view-quran'), tabs = document.querySelectorAll('.mobile-tabbar [data-tab]');
  let inQ = null, homeY = 0, siteLang = null;
  const jump = (y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  function setView(q) {
    if (q === inQ) return;
    const root = document.documentElement;
    if (q) {
      homeY = window.scrollY; siteLang = { lang: root.lang, dir: root.dir };
      root.lang = 'en'; root.dir = 'ltr';                       // Quran UI is always left-to-right
      const pop = $('welcome'); if (pop && !pop.hidden) { pop.hidden = true; document.body.classList.remove('modal-open'); }
    } else if (siteLang) { root.lang = siteLang.lang; root.dir = siteLang.dir; }
    const was = inQ; inQ = q;
    homeView.hidden = q; quranView.hidden = !q; document.body.classList.toggle('quran-page', q);
    if (!q && was === true) jump(homeY);
  }
  function markTabs(hash) {
    const onSearch = /^#\/quran\/search/.test(hash);
    tabs.forEach((t) => {
      const k = t.dataset.tab, on = k === 'home' ? !inQ : k === 'quran' ? inQ && !onSearch : k === 'search' ? inQ && onSearch : false;
      t.classList.toggle('active', on); if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  /* Home <-> Quran: crossfade + slide using the View Transitions API (tab bar stays put).
     Browsers without it get the same motion from a CSS enter animation on the incoming view. */
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function withTransition(toQuran, change) {
    const root = document.documentElement;
    if (reduceMotion()) { change(); return; }
    if (document.startViewTransition) {
      root.dataset.vt = toQuran ? 'fwd' : 'back';
      const t = document.startViewTransition(change), clear = () => { delete root.dataset.vt; };
      t.finished.then(clear, clear);
      return;
    }
    change();
    const v = toQuran ? quranView : homeView, cls = toQuran ? 'vt-in-fwd' : 'vt-in-back';
    v.classList.add(cls); setTimeout(() => v.classList.remove(cls), 450);
  }
  // Load the Quran text in the background once the Quran view is open (or the tab is about to be tapped),
  // so opening a surah or searching feels instant.
  function warmData() { (window.requestIdleCallback || ((f) => setTimeout(f, 500)))(() => { loadData().catch(() => {}); }); }
  const quranTab = document.querySelector('.mobile-tabbar [data-tab="quran"]');
  ['pointerenter', 'touchstart', 'focus'].forEach((ev) => { if (quranTab) quranTab.addEventListener(ev, warmData, { passive: true, once: true }); });
  const navQuran = document.querySelector('.nav-links a[href="#/quran"]');
  if (navQuran) ['pointerenter', 'touchstart'].forEach((ev) => navQuran.addEventListener(ev, warmData, { passive: true, once: true }));

  function route() {
    const hash = location.hash || '#/';
    if (inQ && curHash !== null) scrollMem[curHash] = window.scrollY;
    flushTracking(); closeDrawer(); closeSheet();
    const q = /^#\/quran(\/|\?|$)/.test(hash);
    if (inQ !== null && q !== inQ) withTransition(q, () => apply(q, hash)); else apply(q, hash);
  }
  function apply(q, hash) {
    setView(q); markTabs(hash);
    if (window.__ddApplyExtra) window.__ddApplyExtra(q, hash);   // js/shop.js: account page + tab highlight
    if (!q) { token++; curHash = hash; return; }
    const my = ++token;
    curHash = hash;
    const [path, query] = hash.replace(/^#\/quran\/?/, '').split('?');
    const p = path.split('/').filter(Boolean);
    if (p[0] === 'surah' && +p[1] >= 1 && +p[1] <= 114) showReader(+p[1], +p[2] || 0, my);
    else if (p[0] === 'saved') showSaved(p[1] === 'favorites' ? 'favorites' : 'bookmarks', my);
    else if (p[0] === 'search') showSearch(new URLSearchParams(query || '').get('q') || '', my);
    else showHome();
    if (!(p[0] === 'surah' && +p[2] > 1)) jump(scrollMem[hash] || 0);
    warmData();
  }

  /* ---------------- home ---------------- */
  const QUICK = [['Al-Kahf', 18, 0], ['Al-Mulk', 67, 0], ['Ayatul Kursi', 2, 255], ['Ya Sin', 36, 0], ['Ar-Rahman', 55, 0], ["Al-Waqi'ah", 56, 0], ['Al-Ikhlas', 112, 0]];
  const TABS = [['surah', 'Surah'], ['page', 'Page'], ['juz', 'Juz'], ['hizb', 'Hizb']];
  const row = (num, name, sub, s, a) => '<li><a class="q-row" href="' + hrefTo(s, a) + '"><span class="q-num">' + num + '</span><span class="q-names"><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><span class="q-arn" lang="ar" dir="rtl">' + S[s - 1].ar + '</span></a></li>';
  function listHTML(tab) {
    if (tab === 'surah') return S.map((s) => row(s.n, s.tr, s.en, s.n, 0)).join('');
    const src = tab === 'page' ? M.pages : tab === 'juz' ? M.juz : M.hizb, label = tab === 'page' ? 'Page ' : tab === 'juz' ? 'Juz ' : 'Hizb ';
    return src.map((x, i) => row(i + 1, label + (i + 1), 'Starts at ' + ref(x[0], x[1]), x[0], x[1])).join('');
  }
  function showHome() {
    setBar('home', 'Al Quran'); document.title = 'Al Quran — Deshi Drop';
    const rec = state.recent.slice(0, 4);
    const chips = rec.length ? rec.map((s) => '<a class="q-chip" href="' + hrefTo(s, (state.last[s] || {}).a || 0) + '">' + esc(S[s - 1].tr) + '</a>').join('')
      : '<span class="q-empty-chip">Open any surah and it will show up here</span>';
    let cont = '';
    if (rec.length) {
      const s = rec[0], a = (state.last[s] || {}).a || 1;
      cont = '<a class="q-continue" href="' + hrefTo(s, a) + '"><span class="q-c-ico">' + ICON.book + '</span><span><b>Continue Reading</b><small>' + esc(S[s - 1].tr) + ' · verse ' + a + '</small></span><span class="q-c-go">' + ICON.chev + '</span></a>';
    }
    app.innerHTML =
      '<div class="q-sec"><h2 class="q-label">Last Read</h2><div class="q-chips">' + chips + '</div>' + cont +
      '<h2 class="q-label">Quick Links</h2><div class="q-chips">' + QUICK.map((q) => '<a class="q-chip" href="' + hrefTo(q[1], q[2]) + '">' + q[0] + '</a>').join('') + '</div></div>' +
      '<div class="q-tabs" role="tablist" aria-label="Browse by">' + TABS.map((t) => '<button class="q-tab" role="tab" type="button" data-tab="' + t[0] + '" aria-selected="' + (t[0] === homeTab) + '">' + t[1] + '</button>').join('') + '</div>' +
      '<ol class="q-list" id="q-list">' + listHTML(homeTab) + '</ol>' +
      '<div class="q-foot">Arabic text from the <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> (Uthmani, Hafs) · English: Saheeh International · Bangla: Muhiuddin Khan · ' + M.totals.surahs + ' surahs, ' + M.totals.verses.toLocaleString('en-US') + ' verses</div>';
  }
  app.addEventListener('click', (e) => {
    const tab = e.target.closest('.q-tab[data-tab]');
    if (tab) {
      homeTab = tab.dataset.tab;
      app.querySelectorAll('.q-tab').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
      $('q-list').innerHTML = listHTML(homeTab);
    }
  });

  /* ---------------- reader ---------------- */
  let pending = null, trackT = null, scrollFn = null, curSurah = 0;
  function record(s, a) {
    state.last[s] = { a, t: Date.now() };
    state.recent = [s].concat(state.recent.filter((x) => x !== s)).slice(0, 12);
    bumpStreak(); save(); pending = null; refreshStreak();
  }
  function stopTracking() { clearTimeout(trackT); if (scrollFn) { window.removeEventListener('scroll', scrollFn); scrollFn = null; } }
  function flushTracking() { stopTracking(); if (pending) record(pending.s, pending.a); }
  function topAyah() {
    const lim = document.querySelector('.q-bar').getBoundingClientRect().bottom + 12;
    const list = app.querySelectorAll('.q-verse');
    for (const v of list) if (v.getBoundingClientRect().bottom > lim) return +v.dataset.a;
    return list.length ? +list[list.length - 1].dataset.a : 1;
  }
  function startTracking(s) {
    stopTracking();
    // Opening a surah moves it to the front of "Last Read" but keeps your saved verse until you actually scroll.
    trackT = setTimeout(() => record(s, (state.last[s] || {}).a || 1), 1500);
    scrollFn = () => { pending = { s, a: topAyah() }; clearTimeout(trackT); trackT = setTimeout(() => record(pending.s, pending.a), 800); };
    window.addEventListener('scroll', scrollFn, { passive: true });
  }

  function verseHTML(s, a, bm, fav, canShare) {
    return '<article class="q-verse" id="v' + a + '" data-a="' + a + '">' +
      '<div class="q-vtop"><span class="q-badge">' + a + '</span><span class="q-meta">Juz ' + juzOf(s, a) + ' · Page ' + pageOf(s, a) + '</span>' +
      '<button class="q-act bm" type="button" data-act="bm" aria-pressed="' + bm + '" aria-label="Bookmark verse ' + a + '">' + ICON.bm + '</button>' +
      '<button class="q-act fav" type="button" data-act="fav" aria-pressed="' + fav + '" aria-label="Favorite verse ' + a + '">' + ICON.heart + '</button>' +
      '<button class="q-act" type="button" data-act="copy" aria-label="Copy verse ' + a + '">' + ICON.copy + '</button>' +
      (canShare ? '<button class="q-act" type="button" data-act="share" aria-label="Share verse ' + a + '">' + ICON.share + '</button>' : '') + '</div>' +
      '<p class="q-ar" lang="ar" dir="rtl">' + esc(arText(s, a)) + '</p>' +
      '<p class="q-tr" lang="en">' + esc(enText(s, a)) + '</p>' +
      '<p class="q-tr" lang="bn">' + esc(bnText(s, a)) + '</p></article>';
  }
  function showReader(s, target, my) {
    const info = S[s - 1]; curSurah = s;
    setBar('reader', info.tr); document.title = info.tr + ' — Al Quran — Deshi Drop';
    app.innerHTML = loadingHTML;
    loadData().then(() => {
      if (my !== token) return;
      const bm = new Set(state.bookmarks.filter((x) => x.s === s).map((x) => x.a));
      const fv = new Set(state.favorites.filter((x) => x.s === s).map((x) => x.a));
      const canShare = !!navigator.share;
      let h = '<div class="q-head"><p class="q-head-ar" lang="ar" dir="rtl">' + info.ar + '</p><h1>' + esc(info.tr) + '</h1><p>' + esc(info.en) + ' · ' + info.v + ' verses · ' + (info.m ? 'Meccan' : 'Medinan') + '</p><p lang="bn">' + esc(info.bn) + '</p></div>';
      if (s !== 1 && s !== 9) h += '<p class="q-bis" lang="ar" dir="rtl">' + esc(M.bismillah) + '</p>';
      for (let a = 1; a <= info.v; a++) h += verseHTML(s, a, bm.has(a), fv.has(a), canShare);
      const prev = s > 1 ? S[s - 2] : null, next = s < 114 ? S[s] : null;
      h += '<div class="q-pn">' + (prev ? '<a href="#/quran/surah/' + prev.n + '"><small>Previous</small>' + esc(prev.tr) + '</a>' : '<span class="gap"></span>') +
        (next ? '<a class="next" href="#/quran/surah/' + next.n + '"><small>Next</small>' + esc(next.tr) + '</a>' : '<span class="gap"></span>') + '</div>';
      app.innerHTML = h;
      a11yFocus();
      if (target > 1) {
        const el = $('v' + Math.min(target, info.v));
        if (el) { requestAnimationFrame(() => { const y = el.getBoundingClientRect().top + window.scrollY - document.querySelector('.q-bar').getBoundingClientRect().bottom - 12; jump(Math.max(0, y)); el.classList.add('target'); setTimeout(() => el.classList.remove('target'), 2400); }); }
      }
      startTracking(s);
    }).catch(() => { if (my === token) app.innerHTML = stateHTML('Couldn’t load the Quran text', 'Check your connection and try again.', '<button type="button" data-retry>Try again</button>'); });
  }
  function a11yFocus() { try { app.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

  function verseText(s, a) { return arText(s, a) + '\n\n' + enText(s, a) + '\n' + bnText(s, a) + '\n\n— ' + S[s - 1].tr + ' (' + s + ':' + a + ')'; }
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise((res, rej) => { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } ta.remove(); });
  }
  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) { route(); return; }
    const btn = e.target.closest('.q-act[data-act]'); if (!btn) return;
    const v = btn.closest('.q-verse'), a = +v.dataset.a, s = curSurah, act = btn.dataset.act;
    if (act === 'bm' || act === 'fav') {
      const on = toggleSaved(act === 'bm' ? 'bookmarks' : 'favorites', s, a);
      btn.setAttribute('aria-pressed', String(on));
      toast((act === 'bm' ? (on ? 'Bookmarked ' : 'Bookmark removed ') : (on ? 'Added to favorites ' : 'Removed from favorites ')) + s + ':' + a);
    } else if (act === 'copy') {
      copyText(verseText(s, a)).then(() => toast('Copied ' + s + ':' + a), () => toast('Couldn’t copy'));
    } else if (act === 'share') {
      navigator.share({ text: verseText(s, a) }).catch(() => {});
    }
  });
  $('bar-aa').innerHTML = ICON.aa;

  /* ---------------- saved ---------------- */
  function showSaved(kind, my) {
    setBar('saved', 'Saved verses'); document.title = 'Saved — Al Quran — Deshi Drop';
    app.innerHTML = loadingHTML;
    loadData().then(() => {
      if (my !== token) return;
      const L = state[kind];
      const tabs = '<div class="q-tabs two" role="tablist"><button class="q-tab" role="tab" type="button" data-kind="bookmarks" aria-selected="' + (kind === 'bookmarks') + '">Bookmarks (' + state.bookmarks.length + ')</button><button class="q-tab" role="tab" type="button" data-kind="favorites" aria-selected="' + (kind === 'favorites') + '">Favorites (' + state.favorites.length + ')</button></div>';
      const items = L.map((x) => '<li class="q-item rm"><a href="' + hrefTo(x.s, x.a) + '"><span class="q-ref">' + esc(ref(x.s, x.a)) + '</span><p class="q-ar" lang="ar" dir="rtl">' + esc(arText(x.s, x.a)) + '</p><p class="q-tr" lang="en">' + esc(enText(x.s, x.a)) + '</p></a><button class="q-rm" type="button" data-rm="' + x.s + ':' + x.a + '" aria-label="Remove ' + x.s + ':' + x.a + '">' + ICON.close + '</button></li>').join('');
      app.innerHTML = tabs + (L.length ? '<ul class="q-items">' + items + '</ul>' :
        stateHTML(kind === 'bookmarks' ? 'No bookmarks yet' : 'No favorites yet', 'Tap the ' + (kind === 'bookmarks' ? 'bookmark' : 'heart') + ' on any verse to keep it here.', '<button type="button" data-open-home>Browse surahs</button>'));
    }).catch(() => { if (my === token) app.innerHTML = stateHTML('Couldn’t load the Quran text', 'Check your connection and try again.', '<button type="button" data-retry>Try again</button>'); });
  }
  app.addEventListener('click', (e) => {
    const k = e.target.closest('.q-tab[data-kind]');
    if (k) { history.replaceState(null, '', '#/quran/saved/' + k.dataset.kind); route(); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const [s, a] = rm.dataset.rm.split(':').map(Number), kind = location.hash.indexOf('favorites') > -1 ? 'favorites' : 'bookmarks';
      const i = idxOf(state[kind], s, a); if (i >= 0) state[kind].splice(i, 1); save(); toast('Removed ' + s + ':' + a); route(); return;
    }
    if (e.target.closest('[data-open-home]')) go('#/quran');
  });

  /* ---------------- search ---------------- */
  const AR_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u200A-\u200F]/g;
  const normAr = (t) => t.replace(AR_MARKS, '').replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/[\u0649\u06CC\u0626]/g, '\u064A').replace(/\u06A9/g, '\u0643').replace(/[\u0629\u06C1\u06D5]/g, '\u0647').replace(/\u0624/g, '\u0648').replace(/\s+/g, ' ').trim();
  const simple = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const SURAH_KEYS = S.map((x) => simple(x.tr + x.en));
  let IDX = null;
  function buildIndex() {
    if (IDX) return IDX;
    IDX = { refs: [], ar: [], en: [], bn: [] };
    for (let s = 1; s <= 114; s++) for (let a = 1; a <= S[s - 1].v; a++) {
      IDX.refs.push([s, a]); IDX.ar.push(normAr(arText(s, a))); IDX.en.push(enText(s, a).toLowerCase()); IDX.bn.push(bnText(s, a));
    }
    return IDX;
  }
  function runSearch(raw) {
    const q = raw.trim(), out = { surahs: [], goto: null, hits: [], tokens: [] };
    if (!q) return out;
    const hasAr = /[\u0600-\u06FF]/.test(q);
    let m = q.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
    if (m && +m[1] >= 1 && +m[1] <= 114 && +m[2] >= 1 && +m[2] <= S[+m[1] - 1].v) out.goto = { s: +m[1], a: +m[2] };
    else if (/^\d{1,3}$/.test(q) && +q >= 1 && +q <= 114) out.goto = { s: +q, a: 0 };
    const nk = simple(q), nar = hasAr ? normAr(q) : '';
    out.surahs = S.filter((x, i) => (nk.length >= 2 && SURAH_KEYS[i].includes(nk)) || (hasAr && normAr(x.ar).includes(nar)) || (/[\u0980-\u09FF]/.test(q) && x.bn.includes(q)));
    if (q.length < 2 || out.goto) return out;
    const ix = buildIndex();
    if (hasAr) {
      for (let i = 0; i < ix.ar.length; i++) if (ix.ar[i].includes(nar)) out.hits.push(i);
    } else {
      const low = q.toLowerCase(), toks = low.split(/\s+/).filter(Boolean); out.tokens = toks.length > 1 ? toks.concat([low]) : toks;
      const word = new RegExp('(^|[^a-z])' + reEsc(low) + '([^a-z]|$)'), g0 = [], g1 = [], g2 = [];
      for (let i = 0; i < ix.en.length; i++) {
        const e = ix.en[i], b = ix.bn[i];
        if (e.includes(low)) (word.test(e) ? g0 : g1).push(i);
        else if (b.includes(q)) g1.push(i);
        else if (toks.length > 1 && (toks.every((t) => e.includes(t)) || toks.every((t) => b.includes(t)))) g2.push(i);
      }
      out.hits = g0.concat(g1, g2);
      out.tokens = out.tokens.length ? out.tokens : [low];
    }
    return out;
  }
  const mark = (text, toks) => {
    const safe = esc(text); if (!toks.length) return safe;
    const re = new RegExp('(' + toks.slice().sort((a, b) => b.length - a.length).map((t) => reEsc(esc(t))).join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  };
  function hitHTML(i, toks) {
    const [s, a] = IDX.refs[i], st = state.settings;
    const enHit = toks.length && toks.some((t) => IDX.en[i].includes(t.toLowerCase()));
    const bnHit = toks.length && toks.some((t) => IDX.bn[i].includes(t));
    return '<li class="q-item"><a href="' + hrefTo(s, a) + '"><span class="q-ref">' + esc(ref(s, a)) + '</span><p class="q-ar" lang="ar" dir="rtl">' + esc(arText(s, a)) + '</p>' +
      (enHit || st.en ? '<p class="q-tr" lang="en">' + mark(enText(s, a), toks) + '</p>' : '') +
      (bnHit || st.bn ? '<p class="q-tr" lang="bn">' + mark(bnText(s, a), toks) + '</p>' : '') + '</a></li>';
  }
  function showSearch(q0, my) {
    setBar('search', 'Search'); document.title = 'Search — Al Quran — Deshi Drop';
    app.innerHTML = '<div class="q-searchbox"><label>' + ICON.search.replace('width="24" height="24"', 'width="20" height="20"') +
      '<input id="q-input" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search verses, surah names, or 2:255" aria-label="Search the Quran" value="' + esc(q0) + '">' +
      '<button type="button" id="q-clear" aria-label="Clear search" hidden>' + ICON.close.replace('width="24" height="24"', 'width="20" height="20"') + '</button></label></div><div id="q-results"></div>';
    const input = $('q-input'), res = $('q-results'), clear = $('q-clear');
    let shown = 0, cur = null, t;
    const paint = () => {
      const q = input.value; clear.hidden = !q;
      if (!q.trim()) { res.innerHTML = stateHTML('Search the whole Quran', 'Try “mercy”, “الرحمن”, “রহমত”, a surah name, or a reference like 2:255.'); return; }
      cur = runSearch(q); shown = 0;
      const parts = [];
      if (cur.goto) parts.push('<div class="q-goto"><a class="q-chip" href="' + hrefTo(cur.goto.s, cur.goto.a) + '">Go to ' + (cur.goto.a ? cur.goto.s + ':' + cur.goto.a + ' · ' : '') + esc(S[cur.goto.s - 1].tr) + '</a></div>');
      if (cur.surahs.length) parts.push('<ul class="q-items">' + cur.surahs.slice(0, 8).map((x) => '<li class="q-item"><a class="q-row" style="padding-right:16px" href="#/quran/surah/' + x.n + '"><span class="q-num">' + x.n + '</span><span class="q-names"><b>' + esc(x.tr) + '</b><small>' + esc(x.en) + '</small></span><span class="q-arn" lang="ar" dir="rtl">' + x.ar + '</span></a></li>').join('') + '</ul>');
      if (q.trim().length >= 2 && !cur.goto) parts.push('<div class="q-sum">' + (cur.hits.length ? cur.hits.length.toLocaleString('en-US') + (cur.hits.length === 1 ? ' verse found' : ' verses found') : 'No verses found') + '</div><ul class="q-items" id="q-hits"></ul><div id="q-more"></div>');
      else if (!cur.goto && !cur.surahs.length) parts.push('<div class="q-sum">Keep typing — at least 2 characters.</div>');
      res.innerHTML = parts.join(''); more();
    };
    const more = () => {
      const ul = $('q-hits'); if (!ul || !cur) return;
      ul.insertAdjacentHTML('beforeend', cur.hits.slice(shown, shown + 30).map((i) => hitHTML(i, cur.tokens)).join(''));
      shown = Math.min(cur.hits.length, shown + 30);
      $('q-more').innerHTML = shown < cur.hits.length ? '<button class="q-more" type="button" data-more>Show more (' + (cur.hits.length - shown) + ' left)</button>' : '';
    };
    res.addEventListener('click', (e) => { if (e.target.closest('[data-more]')) more(); });
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { paint(); history.replaceState(null, '', '#/quran/search' + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : '')); curHash = location.hash; }, 160); });
    clear.addEventListener('click', () => { input.value = ''; paint(); input.focus(); history.replaceState(null, '', '#/quran/search'); curHash = location.hash; });
    res.innerHTML = stateHTML('Loading search…', '');
    loadData().then(() => { if (my !== token) return; buildIndex(); paint(); if (!q0) input.focus(); })
      .catch(() => { if (my === token) res.innerHTML = stateHTML('Couldn’t load the Quran text', 'Check your connection and try again.', '<button type="button" data-retry>Try again</button>'); });
  }

  /* ---------------- drawer ---------------- */
  const scrimD = $('drawer-scrim'), drawer = $('drawer');
  function drawerNav() {
    const rec = state.recent[0], a = rec ? ((state.last[rec] || {}).a || 1) : 0;
    $('drawer-nav').innerHTML =
      '<a class="q-dn" href="#/">' + ICON.home + '<span>Home</span></a>' +
      '<a class="q-dn" href="#/quran">' + ICON.book + '<span>All surahs</span></a>' +
      (rec ? '<a class="q-dn" href="' + hrefTo(rec, a) + '">' + ICON.chev + '<span>Continue Reading<small>' + esc(S[rec - 1].tr) + ' · verse ' + a + '</small></span></a>' : '<span class="q-dn" style="opacity:.7">' + ICON.chev + '<span>Continue Reading<small>Nothing read yet</small></span></span>') +
      '<a class="q-dn" href="#/quran/saved/bookmarks">' + ICON.bm + '<span>Bookmarks</span><span class="q-count">' + state.bookmarks.length + '</span></a>' +
      '<a class="q-dn" href="#/quran/saved/favorites">' + ICON.heart + '<span>Favorites</span><span class="q-count">' + state.favorites.length + '</span></a>' +
      '<a class="q-dn" href="#/quran/search">' + ICON.search + '<span>Search</span></a>' +
      '<button class="q-dn" type="button" id="dn-settings">' + ICON.aa + '<span>Reading settings</span></button>';
    $('dn-settings').addEventListener('click', () => { closeDrawer(); openSheet(); });
  }
  let lastFocus = null;
  function openDrawer() { drawerNav(); lastFocus = document.activeElement; scrimD.hidden = false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('q-lock'); const f = drawer.querySelector('a,button'); if (f) f.focus(); }
  function closeDrawer() { if (!drawer.classList.contains('open')) return; scrimD.hidden = true; drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('q-lock'); if (lastFocus) try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  scrimD.addEventListener('click', closeDrawer); $('drawer-close').addEventListener('click', closeDrawer); $('drawer-close').innerHTML = ICON.close;

  /* ---------------- settings sheet ---------------- */
  const sheet = $('sheet'), scrimS = $('sheet-scrim');
  function applySettings() {
    const st = state.settings, b = document.body;
    b.classList.toggle('hide-ar', !st.ar); b.classList.toggle('hide-en', !st.en); b.classList.toggle('hide-bn', !st.bn);
    document.documentElement.style.setProperty('--q-ar-size', st.arSize + 'px'); document.documentElement.style.setProperty('--q-tr-size', st.trSize + 'px');
    $('set-ar').checked = st.ar; $('set-en').checked = st.en; $('set-bn').checked = st.bn; $('out-ar').textContent = st.arSize; $('out-tr').textContent = st.trSize;
  }
  function openSheet() { scrimS.hidden = false; sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); document.body.classList.add('q-lock'); $('sheet-close').focus(); }
  function closeSheet() { if (!sheet.classList.contains('open')) return; scrimS.hidden = true; sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); document.body.classList.remove('q-lock'); }
  ['ar', 'en', 'bn'].forEach((k) => $('set-' + k).addEventListener('change', (e) => {
    const st = state.settings; st[k] = e.target.checked;
    if (!st.ar && !st.en && !st.bn) { st[k] = true; toast('Keep at least one of the three on'); }
    save(); applySettings();
  }));
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('.q-step'); if (!b) return;
    const st = state.settings, d = +b.dataset.d;
    if (b.dataset.step === 'ar') st.arSize = Math.max(22, Math.min(52, st.arSize + d)); else st.trSize = Math.max(13, Math.min(24, st.trSize + d));
    save(); applySettings();
  });
  scrimS.addEventListener('click', closeSheet); $('sheet-close').addEventListener('click', closeSheet); $('sheet-close').innerHTML = ICON.close;
  $('bar-aa').addEventListener('click', openSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closeSheet(); } });

  /* ---------------- bar buttons + boot ---------------- */
  $('bar-left').addEventListener('click', () => { if ($('bar-left').dataset.mode === 'home') openDrawer(); else goBack(); });
  $('bar-search').innerHTML = ICON.search;
  $('bar-streak').addEventListener('click', () => { const n = streakNow(); toast(n ? n + '-day reading streak' : 'Read today to start a streak'); });
  window.addEventListener('pagehide', flushTracking);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { const p = pending; if (p) record(p.s, p.a); } });
  applySettings();
  route();
})();
