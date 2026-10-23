/* Deshi Drop — product search with live suggestions (photo, name, price).
   Desktop: a dropdown under the header search box. Phone: tapping the box opens a full-screen search with the keyboard up. */
(function () {
  'use strict';
  const D = () => window.__DD, esc = (s) => window.__ddEsc(s);
  const box = document.querySelector('#top .search-box'); if (!box) return;
  const hdrInput = box.querySelector('input');
  const mq = window.matchMedia ? window.matchMedia('(max-width: 760px)') : { matches: false };
  const lang = () => window.__currentProductLang || document.documentElement.lang || 'en';
  const TXT = {
    en: { ph: 'Search meat, fish, groceries…', none: 'No products found for', hint: 'Start typing to search', close: 'Close search', clear: 'Clear', add: 'Add to cart', pop: 'Popular right now' },
    bn: { ph: 'মাংস, মাছ, মুদি খুঁজুন…', none: 'কোনো পণ্য পাওয়া যায়নি:', hint: 'খুঁজতে লিখুন', close: 'সার্চ বন্ধ করুন', clear: 'মুছুন', add: 'কার্টে যোগ করুন', pop: 'এখন জনপ্রিয়' },
    ar: { ph: 'ابحث عن اللحوم والسمك والبقالة…', none: 'لا توجد منتجات لـ', hint: 'ابدأ الكتابة للبحث', close: 'إغلاق البحث', clear: 'مسح', add: 'أضف إلى السلة', pop: 'الأكثر طلبًا الآن' }
  };
  const T = (k) => (TXT[lang()] || TXT.en)[k];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  function thumb(p) {
    const photos = window.__PRODUCT_PHOTOS__ || {};
    if (p.image_url && window.__ddSafeImg(p.image_url)) return '<img alt="" src="' + window.__ddSafeImg(p.image_url) + '">';
    if (p.photo && photos[p.photo]) return '<img alt="" src="' + esc(photos[p.photo]) + '">';
    return (D().icons[p.icon] || D().fallbackIcon).replace('<svg ', '<svg width="34" height="34" ');
  }
  function find(q) {
    const words = norm(q).split(' ').filter(Boolean); if (!words.length) return [];
    const out = [];
    D().products.forEach((p, i) => {
      if (p.in_stock === false && false) return;
      const hay = norm([p.name, p.name_bn, p.name_ar || '', p.cat, p.sub || '', D().pName(p, 'ar'), D().pCat(p, lang())].join(' '));
      if (!words.every((w) => hay.indexOf(w) > -1)) return;
      const nm = norm(D().pName(p, lang())), score = (nm.indexOf(words[0]) === 0 ? 0 : 1) + (p.tag === 'Popular' ? -0.5 : 0);
      out.push({ i, p, score });
    });
    out.sort((a, b) => a.score - b.score || a.i - b.i);
    return out.slice(0, 8);
  }
  function rows(list) {
    return list.map(({ i, p }) => {
      const price = p.deal ? '<s>' + esc(p.price) + '</s> <b>' + esc(p.salePrice) + '</b>' : '<b>' + esc(p.price) + '</b>';
      return '<li class="sg-row"><div class="sg-img">' + thumb(p) + '</div><div class="sg-txt"><span class="sg-name">' + esc(D().pName(p, lang())) +
        '</span><span class="sg-cat">' + esc(D().pCat(p, lang())) + '</span></div><span class="sg-price">' + price + '</span>' +
        (p.in_stock === false ? '' : '<button class="add-btn sg-add" type="button" data-pid="' + i + '" aria-label="' + esc(T('add')) + '">+</button>') + '</li>';
    }).join('');
  }
  function listHTML(q) {
    if (!norm(q)) {
      const pops = D().products.map((p, i) => ({ p, i })).filter((x) => x.p.tag === 'Popular').slice(0, 5);
      return pops.length ? '<li class="sg-head">' + esc(T('pop')) + '</li>' + rows(pops) : '<li class="sg-empty">' + esc(T('hint')) + '</li>';
    }
    const r = find(q);
    return r.length ? rows(r) : '<li class="sg-empty">' + esc(T('none')) + ' “' + esc(q.trim()) + '”</li>';
  }

  /* ---- full-screen overlay (phones) ---- */
  const ov = document.createElement('div');
  ov.className = 'sg-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="sg-bar"><label class="sg-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
    '<input type="search" class="sg-in" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"><button type="button" class="sg-clr" hidden></button></label>' +
    '<button type="button" class="sg-x"></button></div><ul class="sg-list" aria-live="polite"></ul>';
  document.body.appendChild(ov);
  const oin = ov.querySelector('.sg-in'), olist = ov.querySelector('.sg-list'), oclr = ov.querySelector('.sg-clr'), ox = ov.querySelector('.sg-x');
  oclr.innerHTML = '&times;'; ox.textContent = '';
  function labels() { oin.placeholder = T('ph'); oclr.setAttribute('aria-label', T('clear')); ox.setAttribute('aria-label', T('close')); ox.textContent = { en: 'Cancel', bn: 'বাতিল', ar: 'إلغاء' }[lang()] || 'Cancel'; hdrInput.placeholder = T('ph'); }
  const paintO = () => { olist.innerHTML = listHTML(oin.value); oclr.hidden = !oin.value; };
  function openO() { if (!ov.hidden) return; labels(); ov.hidden = false; document.body.classList.add('sg-open'); oin.value = hdrInput.value || ''; paintO(); setTimeout(() => oin.focus(), 30); }
  function closeO() { if (ov.hidden) return; ov.hidden = true; document.body.classList.remove('sg-open'); hdrInput.value = ''; hdrInput.blur(); }
  hdrInput.addEventListener('focus', () => { if (mq.matches) openO(); });
  hdrInput.addEventListener('click', () => { if (mq.matches) openO(); });
  oin.addEventListener('input', paintO);
  oclr.addEventListener('click', () => { oin.value = ''; paintO(); oin.focus(); });
  ox.addEventListener('click', closeO);
  oin.addEventListener('keydown', (e) => { if (e.key === 'Enter') { oin.blur(); } });
  ov.addEventListener('click', (e) => { if (e.target.closest('.sg-add')) setTimeout(() => {}, 0); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeO(); closeD(); } });

  /* ---- dropdown (desktop) ---- */
  const dd = document.createElement('ul'); dd.className = 'sg-list sg-dd'; dd.hidden = true; box.style.position = 'relative'; box.appendChild(dd);
  const paintD = () => { dd.innerHTML = listHTML(hdrInput.value); dd.hidden = false; };
  function closeD() { dd.hidden = true; }
  hdrInput.addEventListener('input', () => { if (!mq.matches) paintD(); });
  hdrInput.addEventListener('focus', () => { if (!mq.matches) { labels(); paintD(); } });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) closeD(); });
  hdrInput.setAttribute('autocomplete', 'off');
  labels();
  document.addEventListener('click', (e) => { if (e.target.closest('[data-lang]')) setTimeout(labels, 80); });
  window.__ddSearchRefresh = () => { if (!ov.hidden) paintO(); };
})();
