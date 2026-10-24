/* Deshi Drop — category menu: filters the product grid smoothly; sections not stocked yet show a "Coming soon" panel. */
(function () {
  'use strict';
  const menu = document.getElementById('cat-menu'), grid = document.getElementById('product-grid'), panel = document.getElementById('soon-panel');
  if (!menu || !grid || !panel) return;
  const pills = Array.from(menu.querySelectorAll('.cat-pill'));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tools = document.getElementById('meat-tools'), chips = Array.from(document.querySelectorAll('#sub-menu .sub-chip'));
  let sub = 'all';
  const FILTERS = { all: null, fish: (p) => p.cat === 'Fish', meat: (p) => p.cat === 'Meat' && (sub === 'all' || p.sub === sub) };
  let busy = 0;
  function apply(key, pill) {
    const soon = pill.classList.contains('soon');
    if (key !== 'meat') { sub = 'all'; chips.forEach((x) => { const on = x.dataset.sub === 'all'; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    pills.forEach((b) => { const on = b === pill; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    clearTimeout(busy);
    const run = () => {
      if (soon) {
        panel.querySelector('.soon-cat').textContent = pill.querySelector('.cp-t').textContent;
        panel.hidden = false; grid.hidden = true; if (tools) tools.hidden = true;
      } else {
        panel.hidden = true; grid.hidden = false;
        window.__catFilter = FILTERS[key] || null; if (window.__resetProdPage) window.__resetProdPage();
        if (tools) tools.hidden = key !== 'meat';
        if (window.__renderProductsForLang) window.__renderProductsForLang(window.__currentProductLang || 'en');
      }
      requestAnimationFrame(() => grid.classList.remove('swapping'));
    };
    if (reduce) return run();
    grid.classList.add('swapping');
    busy = setTimeout(run, 200);
  }
  chips.forEach((c) => c.addEventListener('click', () => {
    if (c.classList.contains('active')) return;
    sub = c.dataset.sub;
    chips.forEach((x) => { const on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    clearTimeout(busy);
    const run = () => { window.__catFilter = FILTERS.meat; if (window.__resetProdPage) window.__resetProdPage(); window.__renderProductsForLang(window.__currentProductLang || 'en'); requestAnimationFrame(() => grid.classList.remove('swapping')); };
    if (reduce) return run();
    grid.classList.add('swapping'); busy = setTimeout(run, 200);
  }));
  pills.forEach((b) => b.addEventListener('click', () => { if (!b.classList.contains('active')) apply(b.dataset.cat, b); }));
  // carousel buttons: jump to a category (meat shows the meat section only), then scroll to the menu
  window.__goCat = function (key, label) {
    const pill = pills.find((b) => b.dataset.cat === key) || pills[0];
    if (pill.dataset.cat === 'meat' && sub !== 'all') { sub = 'all'; chips.forEach((x) => { const on = x.dataset.sub === 'all'; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); if (pill.classList.contains('active')) { window.__catFilter = FILTERS.meat; window.__renderProductsForLang(window.__currentProductLang || 'en'); } }
    if (!pill.classList.contains('active')) apply(pill.dataset.cat, pill);
    const sec = document.getElementById('categories'); if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (pill.classList.contains('soon')) setTimeout(() => { panel.querySelector('.soon-cat').textContent = label || pill.querySelector('.cp-t').textContent; }, reduce ? 0 : 260);
  };
  // keep the panel's category name in step when the language changes
  const origLang = window.__onLangChange;
  document.querySelectorAll('[data-lang]').forEach((el) => el.addEventListener('click', () => setTimeout(() => {
    const a = menu.querySelector('.cat-pill.active.soon'); if (a) panel.querySelector('.soon-cat').textContent = a.querySelector('.cp-t').textContent;
  }, 50)));

  /* pin the menu only while the customer is inside the product area */
  (function sticky() {
    const bar = document.getElementById('categories'), sent = document.getElementById('cat-sentinel'), zone = document.getElementById('shop-zone');
    if (!bar || !sent || !zone || !('IntersectionObserver' in window)) return;
    let full = 0, compact = 0, stuck = false, raf = 0;
    const measure = () => {   // keep the page from jumping when the menu shrinks: the gap below it stays the same size
      if (stuck) return; full = bar.offsetHeight;
      bar.classList.add('is-stuck'); compact = bar.offsetHeight; bar.classList.remove('is-stuck');
      bar.style.setProperty('--cat-gap', Math.max(0, full - compact) + 'px');
    };
    const set = (on) => { if (on === stuck) return; if (on) measure(); stuck = on; bar.classList.toggle('is-stuck', on); };
    const hdrH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 0;
    const check = () => { raf = 0;
      if (document.body.classList.contains('no-sticky')) return set(false);
      const s = sent.getBoundingClientRect().top, z = zone.getBoundingClientRect().bottom;
      set(s < hdrH() - 1 && z > hdrH() + (compact || 60) + 20); };
    const tick = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', tick, { passive: true }); window.addEventListener('resize', () => { if (!stuck) measure(); tick(); });
    document.addEventListener('click', () => setTimeout(() => { if (!stuck) measure(); }, 400));
    setTimeout(() => { measure(); tick(); }, 600); tick();
  })();
})();
