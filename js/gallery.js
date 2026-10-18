/* Deshi Drop — Gallery (#/gallery).
   Masonry/grid, category chips, favourites, newest/oldest, deep links (#/gallery/<id>), full-screen viewer with swipe,
   pinch / double-tap / wheel zoom, keyboard, thumbnails, slideshow, share, download, shared-element transition
   (View Transitions API with a fallback), and "Add photos" (stored on this device in IndexedDB, compressed in the browser).
   Photos for every visitor come from js/gallery-data.js. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const view = $('view-gallery');
  if (!view) return;
  const DATA = window.DD_GALLERY || { categories: [], items: [] };
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ------------------------------------------------------------ text (EN / BN / AR) */
  const T = {
    en: { back: 'Back to shop', eyebrow: 'Photo gallery', title: 'Gallery', sub: 'Fresh from our store — meat, produce and deliveries.', all: 'All', fav: 'Favorites', add: 'Add photos',
      newest: 'Newest', oldest: 'Oldest', masonry: 'Masonry', grid: 'Grid', n1: '{n} photo', n: '{n} photos', empty: 'No photos here yet.', empty_fav: 'No favorites yet — tap the heart on any photo.',
      add_title: 'Add photos', drop: 'Tap to choose photos, or drag them here', drop2: 'You can also paste an image · JPG, PNG, WebP', caption_ph: 'Caption (optional)',
      local_note: 'Photos you add here are saved on this device only. To show them to every visitor, put the files in the gallery/ folder and list them in js/gallery-data.js.',
      add_n: 'Add {n} photos', add_1: 'Add 1 photo', adding: 'Adding…', added: '{n} added to the gallery', local: 'On this device', del: 'Delete this photo?', deleted: 'Photo deleted', copied: 'Link copied',
      share: 'Share', download: 'Download', full: 'Full screen', play: 'Start slideshow', pause: 'Pause slideshow', close: 'Close', prev: 'Previous photo', next: 'Next photo', favl: 'Favorite', remove: 'Remove', del_l: 'Delete', of: 'of', err: 'Could not read that file.' },
    bn: { back: 'দোকানে ফিরুন', eyebrow: 'ফটো গ্যালারি', title: 'গ্যালারি', sub: 'আমাদের স্টোর থেকে — মাংস, সবজি ও ডেলিভারি।', all: 'সব', fav: 'পছন্দের', add: 'ছবি যোগ করুন',
      newest: 'নতুন আগে', oldest: 'পুরনো আগে', masonry: 'মেসনরি', grid: 'গ্রিড', n1: '{n}টি ছবি', n: '{n}টি ছবি', empty: 'এখানে এখনও কোনো ছবি নেই।', empty_fav: 'এখনও কোনো পছন্দের ছবি নেই — যেকোনো ছবিতে হার্টে চাপ দিন।',
      add_title: 'ছবি যোগ করুন', drop: 'ছবি বাছাই করতে চাপ দিন, অথবা এখানে টেনে আনুন', drop2: 'ছবি পেস্টও করতে পারেন · JPG, PNG, WebP', caption_ph: 'ক্যাপশন (ঐচ্ছিক)',
      local_note: 'এখানে যোগ করা ছবি শুধু এই ডিভাইসে সংরক্ষিত থাকে। সবাইকে দেখাতে ফাইলগুলো gallery/ ফোল্ডারে রেখে js/gallery-data.js-এ তালিকাভুক্ত করুন।',
      add_n: '{n}টি ছবি যোগ করুন', add_1: '১টি ছবি যোগ করুন', adding: 'যোগ হচ্ছে…', added: '{n}টি ছবি গ্যালারিতে যোগ হয়েছে', local: 'এই ডিভাইসে', del: 'এই ছবিটি মুছবেন?', deleted: 'ছবি মোছা হয়েছে', copied: 'লিংক কপি হয়েছে',
      share: 'শেয়ার', download: 'ডাউনলোড', full: 'ফুল স্ক্রিন', play: 'স্লাইডশো শুরু', pause: 'স্লাইডশো থামান', close: 'বন্ধ', prev: 'আগের ছবি', next: 'পরের ছবি', favl: 'পছন্দ', remove: 'বাদ দিন', del_l: 'মুছুন', of: '/', err: 'ফাইলটি পড়া যায়নি।' },
    ar: { back: 'العودة إلى المتجر', eyebrow: 'معرض الصور', title: 'المعرض', sub: 'من متجرنا — لحوم وخضار وتوصيل.', all: 'الكل', fav: 'المفضلة', add: 'إضافة صور',
      newest: 'الأحدث', oldest: 'الأقدم', masonry: 'متدرّج', grid: 'شبكة', n1: '{n} صورة', n: '{n} صورة', empty: 'لا توجد صور هنا بعد.', empty_fav: 'لا توجد مفضلة بعد — اضغط على القلب في أي صورة.',
      add_title: 'إضافة صور', drop: 'اضغط لاختيار الصور أو اسحبها هنا', drop2: 'يمكنك أيضًا لصق صورة · JPG وPNG وWebP', caption_ph: 'وصف (اختياري)',
      local_note: 'الصور التي تضيفها هنا تُحفظ على هذا الجهاز فقط. لعرضها لكل الزوار ضع الملفات في مجلد gallery/ وأضفها في js/gallery-data.js.',
      add_n: 'إضافة {n} صور', add_1: 'إضافة صورة', adding: 'جارٍ الإضافة…', added: 'تمت إضافة {n} إلى المعرض', local: 'على هذا الجهاز', del: 'حذف هذه الصورة؟', deleted: 'تم حذف الصورة', copied: 'تم نسخ الرابط',
      share: 'مشاركة', download: 'تنزيل', full: 'ملء الشاشة', play: 'بدء عرض الشرائح', pause: 'إيقاف العرض', close: 'إغلاق', prev: 'الصورة السابقة', next: 'الصورة التالية', favl: 'مفضلة', remove: 'إزالة', del_l: 'حذف', of: 'من', err: 'تعذّرت قراءة الملف.' }
  };
  let lang = document.documentElement.lang || 'en'; if (!T[lang]) lang = 'en';
  const t = (k, v) => { let s = (T[lang] && T[lang][k]) || T.en[k] || k; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
  const pick = (o) => (o && (o[lang] || o.en)) || '';
  const catName = (id) => { const c = DATA.categories.find((x) => x.id === id); return c ? pick(c) : ''; };

  /* ------------------------------------------------------------ items */
  const photos = () => window.__PRODUCT_PHOTOS__ || {};
  const srcOf = (it) => it.src && !it.photo ? it.src : (photos()[it.photo] ? 'data:image/jpeg;base64,' + photos()[it.photo] : (it.src || ''));
  let locals = [];                                     // photos added on this device
  const base = () => DATA.items.map((x) => Object.assign({ date: '2000-01-01' }, x)).concat(locals);
  const state = { cat: 'all', fav: false, sort: store.get('dd_gal_sort', 'new'), layout: store.get('dd_gal_layout', 'masonry'), favs: new Set(store.get('dd_gal_fav', [])) };
  let list = [];                                       // current filtered + sorted
  const byId = (id) => base().find((x) => x.id === id);

  /* ------------------------------------------------------------ IndexedDB (local uploads) */
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open('dd-gallery', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
        r.onsuccess = () => { this.db = r.result; res(r.result); };
        r.onerror = () => rej(r.error);
      });
    },
    tx(mode, fn) { return this.open().then((db) => new Promise((res, rej) => { const tx = db.transaction('photos', mode), rq = fn(tx.objectStore('photos')); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); })); },
    all() { return this.tx('readonly', (s) => s.getAll()); },
    put(rec) { return this.tx('readwrite', (s) => s.put(rec)); },
    del(id) { return this.tx('readwrite', (s) => s.delete(id)); }
  };
  function loadLocals() {
    return idb.all().then((rows) => {
      locals.forEach((l) => URL.revokeObjectURL(l.src));
      locals = (rows || []).map((r) => ({ id: r.id, src: URL.createObjectURL(r.blob), cat: r.cat, date: r.date, title: { en: r.title || '' }, caption: {}, local: true }));
    }).catch(() => { locals = []; });
  }

  /* ------------------------------------------------------------ toast */
  let tt = 0;
  function toast(msg) { const el = $('gal-toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2400); }

  /* ------------------------------------------------------------ rendering */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.800-8 11-8 11z"/></svg>';
  const grid = $('gal-grid');

  function applyFilter() {
    const all = base();
    list = all.filter((x) => (state.cat === 'all' || x.cat === state.cat) && (!state.fav || state.favs.has(x.id)));
    list.sort((a, b) => (state.sort === 'new' ? (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) : (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)));
  }
  function renderChips() {
    const all = base(), counts = {}; all.forEach((x) => { counts[x.cat] = (counts[x.cat] || 0) + 1; });
    const chips = [{ id: 'all', label: t('all'), n: all.length }].concat(DATA.categories.filter((c) => counts[c.id]).map((c) => ({ id: c.id, label: pick(c), n: counts[c.id] })));
    $('gal-chips').innerHTML = chips.map((c) => '<button type="button" class="gal-chip' + (state.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.label) + '<em>' + c.n + '</em></button>').join('');
  }
  function renderBar() {
    $('gal-favn').textContent = state.favs.size;
    const f = $('gal-fav'); f.setAttribute('aria-pressed', state.fav);
    $('gal-sort-l').textContent = state.sort === 'new' ? t('newest') : t('oldest');
    $('gal-layout-l').textContent = state.layout === 'masonry' ? t('masonry') : t('grid');
    $('gal-count').textContent = t(list.length === 1 ? 'n1' : 'n', { n: list.length });
    const e = $('gal-empty'); e.hidden = list.length > 0; $('gal-empty-t').textContent = state.fav ? t('empty_fav') : t('empty');
  }
  let io = null;
  function renderGrid() {
    grid.classList.toggle('is-grid', state.layout === 'grid');
    grid.innerHTML = list.map((it, i) => {
      const title = pick(it.title);
      return '<button type="button" class="gal-card pre" data-id="' + esc(it.id) + '" style="--d:' + Math.min(i, 12) * 45 + 'ms" aria-label="' + esc(title) + '">' +
        '<img alt="' + esc(title) + '" decoding="async" loading="lazy">' +
        (it.local ? '<span class="gc-badge">' + esc(t('local')) + '</span>' : '') +
        (it.video ? '<span class="gc-play"><i><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></i></span>' : '') +
        '<span class="gc-cap">' + esc(title) + '</span>' +
        '<span class="gc-fav" role="button" tabindex="0" data-fav="' + esc(it.id) + '" aria-label="' + esc(t('favl')) + '" aria-pressed="' + state.favs.has(it.id) + '">' + HEART + '</span></button>';
    }).join('');
    const cards = Array.from(grid.children);
    cards.forEach((c, i) => {
      const img = c.querySelector('img'), it = list[i];
      img.addEventListener('load', () => img.classList.add('ld'), { once: true });
      img.src = srcOf(it);
      if (img.complete) img.classList.add('ld');
    });
    if (io) io.disconnect();
    if ('IntersectionObserver' in window && !reduce()) {
      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
      cards.forEach((c) => io.observe(c));
    } else cards.forEach((c) => c.classList.remove('pre'));
  }
  function refresh(animate) {
    applyFilter(); renderChips(); renderBar();
    if (animate && !reduce()) { grid.classList.add('swap'); setTimeout(() => { renderGrid(); requestAnimationFrame(() => grid.classList.remove('swap')); }, 190); }
    else renderGrid();
  }
  function renderStatic() {
    view.querySelectorAll('[data-g]').forEach((el) => { el.textContent = t(el.dataset.g); });
    $('gl-close').setAttribute('aria-label', t('close')); $('gm-x').setAttribute('aria-label', t('close'));
    $('gl-prev').setAttribute('aria-label', t('prev')); $('gl-next').setAttribute('aria-label', t('next'));
    $('gl-share').setAttribute('aria-label', t('share')); $('gl-dl').setAttribute('aria-label', t('download')); $('gl-full').setAttribute('aria-label', t('full'));
    $('gl-fav').setAttribute('aria-label', t('favl')); $('gl-del').setAttribute('aria-label', t('del_l'));
    $('gl-play').setAttribute('aria-label', t(slide ? 'pause' : 'play'));
    $('gm-go').textContent = pending.length > 1 ? t('add_n', { n: pending.length }) : t('add_1');
    $('gal-root').setAttribute('lang', lang);
  }

  /* ------------------------------------------------------------ toolbar */
  document.addEventListener('click', (e) => {
    if (!view.contains(e.target)) return;
    const chip = e.target.closest('.gal-chip');
    if (chip) { state.cat = chip.dataset.cat; refresh(true); return; }
    const fv = e.target.closest('.gc-fav');
    if (fv) { e.stopPropagation(); toggleFav(fv.dataset.fav, fv); return; }
    const card = e.target.closest('.gal-card');
    if (card) { openLb(card.dataset.id, card.querySelector('img')); return; }
  });
  grid.addEventListener('keydown', (e) => { const f = e.target.closest && e.target.closest('.gc-fav'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); toggleFav(f.dataset.fav, f); } });
  $('gal-fav').addEventListener('click', () => { state.fav = !state.fav; refresh(true); });
  $('gal-sort').addEventListener('click', () => { state.sort = state.sort === 'new' ? 'old' : 'new'; store.set('dd_gal_sort', state.sort); refresh(true); });
  $('gal-layout').addEventListener('click', () => { state.layout = state.layout === 'masonry' ? 'grid' : 'masonry'; store.set('dd_gal_layout', state.layout); refresh(true); });
  function toggleFav(id, btn) {
    if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
    store.set('dd_gal_fav', Array.from(state.favs));
    const on = state.favs.has(id);
    view.querySelectorAll('[data-fav="' + CSS.escape(id) + '"]').forEach((b) => { b.setAttribute('aria-pressed', on); if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } });
    if (lb.id === id) setFavBtn();
    $('gal-favn').textContent = state.favs.size;
    if (state.fav && !on) { if (lbOpen()) { /* keep viewing */ } else refresh(true); }
  }

  /* ------------------------------------------------------------ viewer */
  const lbEl = $('gal-lb'), media = $('gl-media'), stage = $('gl-stage');
  const lb = { id: null, i: -1, s: 1, x: 0, y: 0, pushed: false };
  let slide = 0, lastFocus = null;
  const lbOpen = () => !lbEl.hidden;
  const curItem = () => list[lb.i];
  function setFavBtn() { const b = $('gl-fav'); const on = state.favs.has(lb.id); b.setAttribute('aria-pressed', on); }

  function openLb(id, thumb) {
    const i = list.findIndex((x) => x.id === id); if (i < 0) return;
    lastFocus = document.activeElement;
    const show = () => {
      lbEl.hidden = false; document.body.classList.add('gal-lock');
      buildThumbs(); showAt(i, null);
      if (thumb) { const im = media.querySelector('img'); if (im && document.startViewTransition && !reduce()) im.style.viewTransitionName = 'gimg'; }
      $('gl-close').focus({ preventScroll: true });
    };
    if (document.startViewTransition && !reduce() && thumb) {
      thumb.style.viewTransitionName = 'gimg';
      const vt = document.startViewTransition(() => { thumb.style.viewTransitionName = ''; show(); });
      const clr = () => { const im = media.querySelector('img'); if (im) im.style.viewTransitionName = ''; };
      vt.finished.then(clr, clr);
    } else show();
    if (!/^#\/gallery\/./.test(location.hash)) { history.pushState({ ddgal: 1 }, '', '#/gallery/' + encodeURIComponent(id)); lb.pushed = true; }
    else history.replaceState({ ddgal: 1 }, '', '#/gallery/' + encodeURIComponent(id));
  }
  function closeLb(fromPop) {
    if (!lbOpen()) return;
    stopSlide();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const done = () => { lbEl.hidden = true; document.body.classList.remove('gal-lock'); media.innerHTML = ''; };
    const back = () => {
      const card = grid.querySelector('[data-id="' + CSS.escape(lb.id || '') + '"] img');
      if (document.startViewTransition && !reduce() && card && !fromPop) {
        const im = media.querySelector('img'); if (im) im.style.viewTransitionName = 'gimg';
        const vt = document.startViewTransition(() => { if (im) im.style.viewTransitionName = ''; done(); card.style.viewTransitionName = 'gimg'; });
        vt.finished.then(() => { card.style.viewTransitionName = ''; }, () => { card.style.viewTransitionName = ''; });
      } else done();
    };
    back();
    if (!fromPop) { if (lb.pushed) { lb.pushed = false; history.back(); } else history.replaceState(null, '', '#/gallery'); }
    else lb.pushed = false;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function buildThumbs() {
    $('gl-thumbs').innerHTML = list.map((it, k) => '<button type="button" class="gl-th" role="tab" data-k="' + k + '" aria-label="' + esc(pick(it.title)) + '"><img alt="" loading="lazy" decoding="async" src="' + esc(srcOf(it)) + '"></button>').join('');
  }
  function showAt(i, dir) {
    if (!list.length) { closeLb(); return; }
    i = (i + list.length) % list.length;
    const it = list[i]; lb.i = i; lb.id = it.id; lb.s = 1; lb.x = 0; lb.y = 0;
    media.className = 'gl-media' + (dir ? ' from-' + dir : '');
    media.innerHTML = '';
    let el;
    if (it.video) { el = document.createElement('video'); el.src = it.video; el.poster = srcOf(it); el.controls = true; el.playsInline = true; el.preload = 'metadata'; }
    else { el = document.createElement('img'); el.src = srcOf(it); el.alt = pick(it.title); el.draggable = false; }
    media.appendChild(el);
    const title = pick(it.title), cap = pick(it.caption);
    $('gl-info').innerHTML = '<b>' + esc(title) + '</b>' + (cap ? '<span>' + esc(cap) + '</span>' : '') + '<small>' + esc(catName(it.cat) || '') + (it.local ? ' · ' + esc(t('local')) : '') + '</small>';
    $('gl-count').textContent = (i + 1) + ' ' + t('of') + ' ' + list.length;
    const dl = $('gl-dl'); dl.href = it.video || srcOf(it); dl.setAttribute('download', (it.id || 'photo') + '.jpg');
    $('gl-del').hidden = !it.local; $('gl-prev').hidden = $('gl-next').hidden = list.length < 2;
    setFavBtn();
    document.querySelectorAll('.gl-th').forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i); if (k === i) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); });
    if (lbOpen() && /^#\/gallery\//.test(location.hash)) history.replaceState({ ddgal: 1 }, '', '#/gallery/' + encodeURIComponent(it.id));
    if (slide) restartSlide();
    // preload neighbours
    [1, -1].forEach((d) => { const n = list[(i + d + list.length) % list.length]; if (n && !n.video) { const im = new Image(); im.src = srcOf(n); } });
  }
  const step = (d) => showAt(lb.i + d, d > 0 ? 'next' : 'prev');
  $('gl-prev').addEventListener('click', () => step(-1));
  $('gl-next').addEventListener('click', () => step(1));
  $('gl-close').addEventListener('click', () => closeLb(false));
  $('gl-thumbs').addEventListener('click', (e) => { const b = e.target.closest('.gl-th'); if (b) { const k = +b.dataset.k; showAt(k, k > lb.i ? 'next' : 'prev'); } });
  $('gl-fav').addEventListener('click', () => toggleFav(lb.id));
  $('gl-full').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (lbEl.requestFullscreen) lbEl.requestFullscreen().catch(() => {}); else toast(t('full')); });
  $('gl-share').addEventListener('click', async () => {
    const it = curItem(), url = location.origin + location.pathname + '#/gallery/' + encodeURIComponent(it.id);
    if (navigator.share) { try { await navigator.share({ title: pick(it.title) + ' — Deshi Drop', text: pick(it.caption) || pick(it.title), url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { toast(url); }
  });
  $('gl-del').addEventListener('click', async () => {
    const it = curItem(); if (!it || !it.local) return;
    if (!window.confirm(t('del'))) return;
    try { await idb.del(it.id); } catch (e) {}
    await loadLocals(); applyFilter(); renderChips(); renderBar(); renderGrid(); buildThumbs();
    toast(t('deleted'));
    if (!list.length) closeLb(false); else showAt(Math.min(lb.i, list.length - 1), null);
  });
  /* slideshow */
  function restartSlide() { const p = $('gl-progress'); p.classList.remove('run'); void p.offsetWidth; p.classList.add('run'); clearTimeout(slide.t); slide.t = setTimeout(() => step(1), 3800); }
  function startSlide() { slide = { t: 0 }; $('gl-play').classList.add('on'); $('gl-play').setAttribute('aria-label', t('pause')); $('gl-progress').hidden = false; restartSlide(); }
  function stopSlide() { if (!slide) return; clearTimeout(slide.t); slide = 0; $('gl-play').classList.remove('on'); $('gl-play').setAttribute('aria-label', t('play')); const p = $('gl-progress'); p.hidden = true; p.classList.remove('run'); }
  $('gl-play').addEventListener('click', () => { if (slide) stopSlide(); else { if (lb.s > 1) resetZoom(); startSlide(); } });

  /* zoom / pan / swipe */
  const pts = new Map(); let pinch0 = 0, s0 = 1, sw = null, lastTap = 0;
  const img = () => media.querySelector('img');
  function apply(anim) { const im = img(); if (!im) return; im.classList.toggle('dragging', !anim); im.style.transform = 'translate(' + lb.x + 'px,' + lb.y + 'px) scale(' + lb.s + ')'; im.classList.toggle('zoomed', lb.s > 1); }
  function clampPan() {
    const im = img(); if (!im) return; const r = stage.getBoundingClientRect(), w = im.offsetWidth * lb.s, h = im.offsetHeight * lb.s;
    const bx = Math.max(0, (w - r.width) / 2 + 0), by = Math.max(0, (h - r.height) / 2);
    // image is centred by the grid, so pan is relative to centre
    lb.x = Math.max(-bx, Math.min(bx, lb.x)); lb.y = Math.max(-by, Math.min(by, lb.y));
  }
  function resetZoom() { lb.s = 1; lb.x = 0; lb.y = 0; apply(true); }
  function zoomAt(ns, cx, cy) {
    const im = img(); if (!im) return; ns = Math.max(1, Math.min(5, ns));
    const r = im.getBoundingClientRect(); // current rect (scaled)
    const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2), k = ns / lb.s;
    lb.x -= ox * (k - 1); lb.y -= oy * (k - 1); lb.s = ns;
    if (lb.s === 1) { lb.x = 0; lb.y = 0; }
    clampPan(); apply(true);
  }
  // transform-origin is centre for zoom maths → set once
  const setOrigin = () => { const im = img(); if (im) im.style.transformOrigin = '50% 50%'; };
  new MutationObserver(setOrigin).observe(media, { childList: true });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.gl-nav') || e.target.tagName === 'VIDEO') return;
    stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = Array.from(pts.values()); pinch0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = lb.s; sw = null; if (slide) stopSlide(); }
    else sw = { x: e.clientX, y: e.clientY, px: lb.x, py: lb.y, t: Date.now(), moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = Array.from(pts.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(s0 * d / (pinch0 || 1), (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) sw.moved = true;
    if (lb.s > 1) { lb.x = sw.px + dx; lb.y = sw.py + dy; clampPan(); apply(false); }
    else { const im = img(); if (im) { im.classList.add('dragging'); im.style.transform = 'translate(' + dx + 'px,' + Math.max(0, dy) * .6 + 'px)'; im.style.opacity = String(Math.max(.35, 1 - Math.abs(dx) / 500 - Math.max(0, dy) / 400)); } }
  });
  const endPtr = (e) => {
    if (!pts.has(e.pointerId)) return; const was = pts.size; pts.delete(e.pointerId);
    if (was === 2) { sw = null; if (lb.s < 1.05) resetZoom(); return; }
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = Date.now() - sw.t, im = img(); const s = sw; sw = null;
    if (lb.s > 1) { apply(true); return; }
    if (im) { im.style.opacity = ''; }
    if (!s.moved) {                                     // tap: double-tap toggles zoom
      const now = Date.now(); if (now - lastTap < 320) { zoomAt(lb.s > 1 ? 1 : 2.6, e.clientX, e.clientY); lastTap = 0; } else lastTap = now; if (im) { im.classList.remove('dragging'); im.style.transform = ''; } return;
    }
    if (dy > 110 && Math.abs(dx) < 80) { closeLb(false); return; }
    if (Math.abs(dx) > 70 || (Math.abs(dx) > 30 && dt < 250)) { if (im) { im.classList.remove('dragging'); im.style.transform = ''; } step(dx < 0 ? 1 : -1); }
    else if (im) { im.classList.remove('dragging'); im.style.transform = ''; }
  };
  stage.addEventListener('pointerup', endPtr); stage.addEventListener('pointercancel', endPtr);
  stage.addEventListener('dblclick', (e) => { if (e.pointerType === 'touch') return; zoomAt(lb.s > 1 ? 1 : 2.6, e.clientX, e.clientY); });
  stage.addEventListener('wheel', (e) => { if (!lbOpen()) return; e.preventDefault(); zoomAt(lb.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); }, { passive: false });
  stage.addEventListener('click', (e) => { if (e.target === stage || e.target === media) { if (lb.s === 1 && !sw) { /* background tap closes on desktop */ if (e.pointerType === 'mouse' || e.detail) { if (e.target === stage || e.target === media) closeLb(false); } } } });

  /* keyboard + focus trap */
  document.addEventListener('keydown', (e) => {
    if (lbOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); closeLb(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === '+' || e.key === '=') zoomAt(lb.s * 1.3, innerWidth / 2, innerHeight / 2);
      else if (e.key === '-') zoomAt(lb.s / 1.3, innerWidth / 2, innerHeight / 2);
      else if (e.key === '0') resetZoom();
      else if (e.key === 'f' || e.key === 'F') $('gl-full').click();
      else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('gl-play').click(); }
      else if (e.key === 'Tab') {
        const f = Array.from(lbEl.querySelectorAll('button:not([hidden]), a[href]')).filter((n) => n.offsetParent !== null); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    } else if (!$('gal-modal').hidden && e.key === 'Escape') closeModal();
  });

  /* ------------------------------------------------------------ add photos */
  let pending = [];                                    // { file, url, title, cat }
  const modal = $('gal-modal');
  function openModal() {
    modal.hidden = false; document.body.classList.add('gal-lock'); renderPending(); $('gm-x').focus({ preventScroll: true });
  }
  function closeModal() { modal.hidden = true; if (!lbOpen()) document.body.classList.remove('gal-lock'); pending.forEach((p) => URL.revokeObjectURL(p.url)); pending = []; renderPending(); $('gal-add').focus({ preventScroll: true }); }
  function addFiles(files) {
    const imgs = Array.from(files || []).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(f.name));
    if (!imgs.length) { toast(t('err')); return; }
    imgs.slice(0, 20 - pending.length).forEach((f) => pending.push({ file: f, url: URL.createObjectURL(f), title: '', cat: state.cat !== 'all' ? state.cat : 'store' }));
    renderPending();
  }
  function renderPending() {
    $('gm-list').innerHTML = pending.map((p, k) => '<li class="gm-item"><img alt="" src="' + p.url + '"><div class="gm-fields"><input type="text" data-k="' + k + '" data-f="title" maxlength="80" placeholder="' + esc(t('caption_ph')) + '" value="' + esc(p.title) + '"><select data-k="' + k + '" data-f="cat" aria-label="' + esc(t('all')) + '">' +
      DATA.categories.map((c) => '<option value="' + c.id + '"' + (c.id === p.cat ? ' selected' : '') + '>' + esc(pick(c)) + '</option>').join('') + '</select></div><button type="button" class="gm-rm" data-rm="' + k + '" aria-label="' + esc(t('remove')) + '">&times;</button></li>').join('');
    const go = $('gm-go'); go.disabled = !pending.length; go.textContent = pending.length > 1 ? t('add_n', { n: pending.length }) : t('add_1');
  }
  $('gal-add').addEventListener('click', openModal);
  $('gm-x').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  $('gm-file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  $('gm-list').addEventListener('input', (e) => { const k = e.target.dataset.k; if (k != null) pending[+k][e.target.dataset.f] = e.target.value; });
  $('gm-list').addEventListener('click', (e) => { const r = e.target.closest('[data-rm]'); if (r) { const p = pending.splice(+r.dataset.rm, 1)[0]; URL.revokeObjectURL(p.url); renderPending(); } });
  const drop = $('gm-drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => addFiles(e.dataTransfer && e.dataTransfer.files));
  document.addEventListener('paste', (e) => { if (view.hidden || modal.hidden) return; const f = Array.from((e.clipboardData && e.clipboardData.files) || []); if (f.length) addFiles(f); });
  view.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) { e.preventDefault(); } });
  view.addEventListener('drop', (e) => { if (e.target.closest('#gm-drop') || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); openModal(); addFiles(e.dataTransfer.files); });

  async function compress(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, k = Math.min(1, 1600 / Math.max(w0, h0));
    const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', 0.82));
  }
  $('gm-go').addEventListener('click', async () => {
    const go = $('gm-go'); if (!pending.length) return; go.disabled = true; go.textContent = t('adding');
    let ok = 0; const today = new Date().toISOString().slice(0, 10);
    for (const p of pending) {
      try {
        const blob = await compress(p.file);
        await idb.put({ id: 'l-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), blob, cat: p.cat, title: p.title.trim(), date: today + 'T' + new Date().toISOString().slice(11, 19) });
        ok++;
      } catch (e) { /* skip unreadable file */ }
    }
    await loadLocals();
    const n = pending.length; pending.forEach((p) => URL.revokeObjectURL(p.url)); pending = [];
    modal.hidden = true; if (!lbOpen()) document.body.classList.remove('gal-lock');
    state.cat = 'all'; state.fav = false; state.sort = 'new'; refresh(false);
    toast(ok ? t('added', { n: ok }) : t('err')); window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
    renderPending(); void n;
  });

  /* ------------------------------------------------------------ routing into the page */
  let wasGal = false, prevY = 0, built = false;
  const prevHook = window.__ddApplyExtra;
  window.__ddApplyExtra = function (q, hash) {
    if (prevHook) prevHook(q, hash);
    const isGal = !q && /^#\/gallery(\/|\?|$)/.test(hash);
    if (isGal && !wasGal) prevY = window.scrollY;
    view.hidden = !isGal;
    document.body.classList.toggle('gal-open', isGal);
    if (isGal) {
      $('view-home').hidden = true;
      const pop = $('welcome'); if (pop && !pop.hidden) { pop.hidden = true; document.body.classList.remove('modal-open'); }
      if (!wasGal) {
        if (!built) { built = true; renderStatic(); refresh(false); loadLocals().then(() => { applyFilter(); renderChips(); renderBar(); renderGrid(); syncHash(); }); }
        else refresh(false);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); document.title = t('title') + ' — Deshi Drop';
      }
      syncHash();
    } else if (wasGal) {
      if (lbOpen()) { stopSlide(); lbEl.hidden = true; document.body.classList.remove('gal-lock'); media.innerHTML = ''; lb.pushed = false; }
      if (!modal.hidden) { modal.hidden = true; document.body.classList.remove('gal-lock'); }
      document.title = document.title.replace(/^.*? — Deshi Drop$/, 'Deshi Drop — From Store to Door');
      if (!q && !/^#\/account/.test(hash)) { $('view-home').hidden = false; window.scrollTo({ top: prevY, left: 0, behavior: 'instant' }); }
    }
    wasGal = isGal;
    document.querySelectorAll('.mobile-tabbar [data-tab]').forEach((tb) => {
      const on = isGal && tb.dataset.tab === 'gallery';
      if (tb.dataset.tab === 'gallery') tb.classList.toggle('active', on); else if (isGal) tb.classList.remove('active');
      if (on) tb.setAttribute('aria-current', 'page'); else if (isGal || tb.dataset.tab === 'gallery') tb.removeAttribute('aria-current');
    });
  };
  function syncHash() {                                // open / close the viewer to match #/gallery/<id>
    const m = /^#\/gallery\/(.+)$/.exec(location.hash), id = m && decodeURIComponent(m[1]);
    if (id) { if (!lbOpen() || lb.id !== id) { const i = list.findIndex((x) => x.id === id); if (i >= 0) { if (!lbOpen()) { lbEl.hidden = false; document.body.classList.add('gal-lock'); buildThumbs(); } showAt(i, null); } } }
    else if (lbOpen()) { lb.pushed = false; closeLb(true); }
  }
  window.addEventListener('popstate', () => { if (!view.hidden) syncHash(); });

  // gallery tab: already here → scroll to top; Home / Search tabs go back to the shop (runs before quran.js's handler)
  document.addEventListener('click', (e) => {
    const tb = e.target.closest('.mobile-tabbar a[data-tab]'); if (!tb || !wasGal) return;
    if (tb.dataset.tab === 'home' || tb.dataset.tab === 'search') {
      e.preventDefault(); e.stopImmediatePropagation(); location.hash = '#/';
      if (tb.dataset.tab === 'search') setTimeout(() => { const i = document.querySelector('#view-home .search-box input'); if (i) i.focus({ preventScroll: true }); }, 80);
    } else if (tb.dataset.tab === 'gallery') { e.preventDefault(); e.stopImmediatePropagation(); if (lbOpen()) closeLb(false); window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); }
  });

  document.addEventListener('ddlang', (e) => {
    lang = T[e.detail] ? e.detail : 'en';
    if (!built) return;
    renderStatic(); applyFilter(); renderChips(); renderBar(); renderGrid(); renderPending();
    if (lbOpen() && list[lb.i]) { buildThumbs(); showAt(lb.i, null); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && slide) stopSlide(); });
  // first load directly on #/gallery…: quran.js's route() already ran before this file hooked in → apply once now
  if (/^#\/gallery(\/|\?|$)/.test(location.hash)) setTimeout(() => window.__ddApplyExtra(false, location.hash), 0);
})();
