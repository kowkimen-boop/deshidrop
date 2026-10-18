/* Deshi Drop — category menu: filters the product grid smoothly; sections not stocked yet show a "Coming soon" panel. */
(function () {
  'use strict';
  const menu = document.getElementById('cat-menu'), grid = document.getElementById('product-grid'), panel = document.getElementById('soon-panel');
  if (!menu || !grid || !panel) return;
  const pills = Array.from(menu.querySelectorAll('.cat-pill'));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tools = document.getElementById('meat-tools'), chips = Array.from(document.querySelectorAll('#sub-menu .sub-chip'));
  let sub = 'all';
  const FILTERS = { all: null, meat: (p) => p.cat === 'Meat' && (sub === 'all' || p.sub === sub) };
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
        window.__catFilter = FILTERS[key] || null;
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
    const run = () => { window.__catFilter = FILTERS.meat; window.__renderProductsForLang(window.__currentProductLang || 'en'); requestAnimationFrame(() => grid.classList.remove('swapping')); };
    if (reduce) return run();
    grid.classList.add('swapping'); busy = setTimeout(run, 200);
  }));
  pills.forEach((b) => b.addEventListener('click', () => { if (!b.classList.contains('active')) apply(b.dataset.cat, b); }));
  // keep the panel's category name in step when the language changes
  const origLang = window.__onLangChange;
  document.querySelectorAll('[data-lang]').forEach((el) => el.addEventListener('click', () => setTimeout(() => {
    const a = menu.querySelector('.cat-pill.active.soon'); if (a) panel.querySelector('.soon-cat').textContent = a.querySelector('.cp-t').textContent;
  }, 50)));
})();
