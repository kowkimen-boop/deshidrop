/* Deshi Drop — deals carousel.
   Native scroll-snap slider (smooth touch swiping), arrows, dots with an autoplay progress fill, pause button,
   keyboard arrows. Autoplay pauses on hover / keyboard focus / touch / hidden tab / off-screen (including while the
   Quran view is open) and never runs when the visitor prefers reduced motion. */
(function () {
  'use strict';
  const root = document.getElementById('cs');
  if (!root) return;
  const track = document.getElementById('cs-track');
  const dotBox = document.getElementById('cs-dots');
  let slides = [], dots = [];
  const prev = document.getElementById('cs-prev'), next = document.getElementById('cs-next'), pp = document.getElementById('cs-pp');
  let N = 0; const INTERVAL = 6500;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let idx = 0, timer = 0, settle = 0, resume = 0;
  const hold = { user: mq.matches, hover: false, touch: false, focus: false, off: false, hidden: false };

  /* The slides come from a list: the saved copy from the dashboard, or the built-in list in js/slides-default.js */
  let list = window.__SLIDES_DEFAULT || [];
  function mount(newList) {
    if (Array.isArray(newList)) list = newList;
    const lang = document.documentElement.lang || 'en';
    const els = window.__ddBuildSlides(list, lang);
    track.innerHTML = ''; els.forEach((e) => track.appendChild(e));
    window.__ddSlideText(track, lang);
    slides = els; N = els.length;
    dotBox.innerHTML = els.map((_, k) => '<button class="cs-dot' + (k === 0 ? ' on' : '') + '" type="button" aria-label="Go to slide ' + (k + 1) + '" aria-current="' + (k === 0 ? 'true' : 'false') + '"><span class="cs-pip"></span></button>').join('');
    dots = Array.from(dotBox.querySelectorAll('.cs-dot'));
    root.hidden = N === 0; const sec = document.getElementById('deals'); if (sec) sec.hidden = N === 0;
    idx = 0; track.scrollLeft = 0; if (N) { paint(0); schedule(); }
  }
  window.__ddSlidesSet = mount;
  document.addEventListener('ddlang', (e) => window.__ddSlideText(track, (e.detail || document.documentElement.lang || 'en')));
  root.style.setProperty('--cs-iv', INTERVAL + 'ms');
  if (mq.matches) root.classList.add('no-auto');

  const slideW = () => track.clientWidth || 1;
  const running = () => N > 1 && !mq.matches && !hold.user && !hold.hover && !hold.touch && !hold.focus && !hold.off && !hold.hidden;

  function paint(i) {
    idx = i;
    slides.forEach((s, k) => {
      const on = k === i;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      s.querySelectorAll('a').forEach((a) => { a.tabIndex = on ? 0 : -1; });
    });
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }

  function schedule() {
    clearTimeout(timer);
    root.classList.remove('run');
    if (!running()) return;
    void root.offsetWidth;                       // restart the progress fill on the active dot
    root.classList.add('run');
    timer = setTimeout(() => go(idx + 1), INTERVAL);
  }

  function go(i) {
    if (N < 2) return;
    const wrap = i < 0 || i >= N, t = (i + N) % N;
    if (wrap) {                                  // loop around with a quick fade instead of sweeping back through every slide
      root.classList.add('swap');
      setTimeout(() => {
        track.scrollTo({ left: t * slideW(), behavior: 'auto' });
        paint(t); schedule();
        requestAnimationFrame(() => root.classList.remove('swap'));
      }, mq.matches ? 0 : 190);
      return;
    }
    paint(t);
    track.scrollTo({ left: t * slideW(), behavior: mq.matches ? 'auto' : 'smooth' });
    schedule();
  }

  // Swipes (and any other scroll) → keep dots / active slide in sync once the scroll settles.
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const i = Math.max(0, Math.min(N - 1, Math.round(track.scrollLeft / slideW())));
      if (i !== idx) { paint(i); schedule(); }
    }, 90);
  }, { passive: true });

  root.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.cs-cta'); if (!a) return;
    if (a.dataset.url) return;   // normal https link: let the browser open it
    e.preventDefault();
    if (a.dataset.wa) { window.open('https://wa.me/19473764749?text=' + encodeURIComponent('Hi Deshi Drop, I would like to ask about catering orders.'), '_blank', 'noopener'); return; }
    if (!a.dataset.go || !window.__goCat) return;
    const pl = a.dataset.goLabel && a.closest('.cs-slide').querySelector('.cs-price .pl');
    if (window.__ddAnim && a.dataset.anim) window.__ddAnim(a.dataset.anim);
    window.__goCat(a.dataset.go, pl ? pl.textContent : '');
  });
  prev.addEventListener('click', () => go(idx - 1));
  next.addEventListener('click', () => go(idx + 1));
  dotBox.addEventListener('click', (e) => { const d = e.target.closest('.cs-dot'); if (d) go(dots.indexOf(d)); });
  pp.addEventListener('click', () => {
    hold.user = !hold.user;
    pp.classList.toggle('is-paused', hold.user);
    pp.setAttribute('aria-label', hold.user ? 'Play slideshow' : 'Pause slideshow');
    schedule();
  });

  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hold.hover = true; schedule(); } });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hold.hover = false; schedule(); } });
  root.addEventListener('touchstart', () => { hold.touch = true; clearTimeout(resume); schedule(); }, { passive: true });
  const endTouch = () => { clearTimeout(resume); resume = setTimeout(() => { hold.touch = false; schedule(); }, 1800); };
  root.addEventListener('touchend', endTouch, { passive: true });
  root.addEventListener('touchcancel', endTouch, { passive: true });
  root.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches(':focus-visible')) { hold.focus = true; schedule(); } });
  root.addEventListener('focusout', () => { hold.focus = false; schedule(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  document.addEventListener('visibilitychange', () => { hold.hidden = document.hidden; schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { hold.off = !es[0].isIntersecting; schedule(); }, { threshold: 0.35 }).observe(root);
  }
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => track.scrollTo({ left: idx * slideW(), behavior: 'auto' }), 120); });
  if (mq.addEventListener) mq.addEventListener('change', () => { hold.user = mq.matches; root.classList.toggle('no-auto', mq.matches); schedule(); });

  mount();
})();
