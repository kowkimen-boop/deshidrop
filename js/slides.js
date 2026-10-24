/* Deshi Drop — builds the slideshow from a list (js/slides-default.js, or the copy saved from Dashboard → Slideshow). */
(function () {
  'use strict';
  const ART = {"truck": "<svg class=\"cs-truck\" viewBox=\"0 0 340 200\" focusable=\"false\"> <rect x=\"0\" y=\"180\" width=\"340\" height=\"6\" rx=\"3\" fill=\"rgba(255,255,255,.28)\"/> <path d=\"M6 76h26M0 102h40M12 128h24\" stroke=\"rgba(255,255,255,.55)\" stroke-width=\"5\" stroke-linecap=\"round\" fill=\"none\"/> <rect x=\"44\" y=\"38\" width=\"180\" height=\"124\" rx=\"12\" fill=\"#fff\"/> <rect x=\"44\" y=\"120\" width=\"180\" height=\"14\" fill=\"#1c6b3c\"/> <text x=\"134\" y=\"82\" text-anchor=\"middle\" font-family=\"Manrope, Inter, sans-serif\" font-weight=\"800\" font-size=\"27\"><tspan fill=\"#1c6b3c\">Deshi</tspan> <tspan fill=\"#c8202f\">Drop</tspan></text> <text x=\"134\" y=\"104\" text-anchor=\"middle\" font-family=\"Inter, sans-serif\" font-weight=\"800\" font-size=\"9.5\" letter-spacing=\"1.4\" fill=\"#24231f\">FROM STORE TO DOOR</text> <path d=\"M228 70h40l34 40v52h-74z\" fill=\"#f3e9d6\"/> <path d=\"M238 80h26l22 27h-48z\" fill=\"#8fd1a4\"/> <rect x=\"228\" y=\"150\" width=\"80\" height=\"12\" rx=\"3\" fill=\"#ddd2bf\"/> <circle cx=\"96\" cy=\"164\" r=\"19\" fill=\"#24231f\"/><circle cx=\"96\" cy=\"164\" r=\"8\" fill=\"#ddd2bf\"/> <circle cx=\"266\" cy=\"164\" r=\"19\" fill=\"#24231f\"/><circle cx=\"266\" cy=\"164\" r=\"8\" fill=\"#ddd2bf\"/> </svg>", "fish": "<div class=\"cs-arch t1 cs-fisharch\" style=\"--k:1\"><svg class=\"cs-fish f1\" viewBox=\"0 0 120 120\" focusable=\"false\"><g class=\"fsw\"><path class=\"ftail\" d=\"M92 62 118 40 109 62 118 84Z\" fill=\"#ff7043\"/><path d=\"M20 62C38 34 78 34 96 62 78 90 38 90 20 62Z\" fill=\"#ff8a65\"/><path d=\"M26 66C44 80 74 80 92 64 74 84 40 86 26 66Z\" fill=\"#ffd5c2\"/><path d=\"M50 40 62 24 76 40Z\" fill=\"#e64a19\"/><path d=\"M48 44C42 56 42 68 48 80\" fill=\"none\" stroke=\"#e64a19\" stroke-width=\"3.5\" stroke-linecap=\"round\"/><circle cx=\"35\" cy=\"56\" r=\"4.6\" fill=\"#fff\"/><circle cx=\"34\" cy=\"56\" r=\"2.2\" fill=\"#24231f\"/></g> <circle class=\"bub b1\" cx=\"26\" cy=\"38\" r=\"3.2\"/><circle class=\"bub b2\" cx=\"38\" cy=\"30\" r=\"2.2\"/><circle class=\"bub b3\" cx=\"20\" cy=\"26\" r=\"1.8\"/></svg></div> <div class=\"cs-arch t2 cs-fisharch\" style=\"--k:0\"><svg class=\"cs-fish f2\" viewBox=\"0 0 120 120\" focusable=\"false\"><g class=\"fsw\"><path class=\"ftail\" d=\"M100 62 120 44 113 62 120 80Z\" fill=\"#78909c\"/><path d=\"M6 62C28 48 84 46 104 62 84 78 28 76 6 62Z\" fill=\"#e3ecf1\"/><path d=\"M12 64C34 72 80 72 100 64 82 76 30 78 12 64Z\" fill=\"#fff\"/><path d=\"M52 50 62 38 74 49Z\" fill=\"#78909c\"/><path d=\"M44 52c4 8 4 16 0 22M58 52c4 8 4 16 0 22M72 52c4 8 4 16 0 22\" fill=\"none\" stroke=\"#b0bec5\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><circle cx=\"22\" cy=\"58\" r=\"4\" fill=\"#fff\"/><circle cx=\"21\" cy=\"58\" r=\"2\" fill=\"#24231f\"/></g> <circle class=\"bub b1\" cx=\"26\" cy=\"38\" r=\"3.2\"/><circle class=\"bub b2\" cx=\"38\" cy=\"30\" r=\"2.2\"/><circle class=\"bub b3\" cx=\"20\" cy=\"26\" r=\"1.8\"/></svg></div> <div class=\"cs-arch t3 cs-fisharch\" style=\"--k:2\"><svg class=\"cs-fish f3\" viewBox=\"0 0 120 120\" focusable=\"false\"><g class=\"fsw\"><path class=\"ftail\" d=\"M82 62 108 44 101 62 108 80Z\" fill=\"#fb8c00\"/><path d=\"M22 62C28 38 70 34 86 54 90 58 90 66 86 70 70 90 30 86 22 62Z\" fill=\"#ffd54f\"/><path d=\"M40 38 52 26 64 38Z\" fill=\"#fb8c00\"/><path d=\"M40 84 52 96 62 84Z\" fill=\"#fb8c00\"/><path d=\"M42 44c-4 10-4 20 0 30M58 42c-4 12-4 24 0 34\" fill=\"none\" stroke=\"#fb8c00\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"36\" cy=\"56\" r=\"4.4\" fill=\"#fff\"/><circle cx=\"35\" cy=\"56\" r=\"2.1\" fill=\"#24231f\"/></g> <circle class=\"bub b1\" cx=\"26\" cy=\"38\" r=\"3.2\"/><circle class=\"bub b2\" cx=\"38\" cy=\"30\" r=\"2.2\"/><circle class=\"bub b3\" cx=\"20\" cy=\"26\" r=\"1.8\"/></svg></div>", "map": "<div class=\"cs-arch t2 cs-maparch\" style=\"--k:0\"> <span class=\"cs-ring\"></span><span class=\"cs-ring\"></span><span class=\"cs-ring\"></span> <svg class=\"cs-pin\" viewBox=\"0 0 120 150\" focusable=\"false\"> <ellipse cx=\"60\" cy=\"136\" rx=\"34\" ry=\"9\" fill=\"rgba(0,0,0,.28)\"/> <path d=\"M60 8C36 8 18 26 18 49c0 31 42 80 42 80s42-49 42-80C102 26 84 8 60 8z\" fill=\"#c8202f\"/> <circle cx=\"60\" cy=\"49\" r=\"17\" fill=\"#fff\"/> </svg> </div>"};
  const THEME = { green: 1, cream: 2, mint: 3, red: 4, dark: 5, blue: 6, gold: 7, maroon: 8, night: 9 };
  const GO = ['all', 'meat', 'fish', 'grocery', 'bakery', 'beverage', 'whatsapp', 'none'];
  const photos = () => window.__PRODUCT_PHOTOS__ || {};
  const pick = (o, l) => (o && (o[l] || o.en)) || '';
  const txt = (s, l) => (window.__ddFee ? window.__ddFee(String(s || ''), l) : String(s || ''));
  const imgSrc = (v, sk, n) => {
    const o = window.__SLIDE_IMG_OVR && window.__SLIDE_IMG_OVR[sk + 't' + n]; if (/^https:\/\//i.test(o || '')) return o;
    v = String(v || ''); if (/^https:\/\//i.test(v)) return v; return photos()[v] || '';
  };
  window.__ddSlideThemes = Object.keys(THEME);
  window.__ddSlideGo = GO;
  /* returns the <article> elements for the active slides */
  window.__ddBuildSlides = function (list, lang) {
    const on = (list || []).filter((s) => s && s.on !== false);
    return on.map((s, i) => {
      const a = document.createElement('article'), th = THEME[s.theme] || 1;
      a.className = 'cs-slide cs-s' + th + (s.soon ? ' is-soon' : ''); a.dataset.sk = s.id || ('x' + i);
      a.setAttribute('role', 'group'); a.setAttribute('aria-roledescription', 'slide'); a.setAttribute('aria-label', (i + 1) + ' of ' + on.length);
      const go = String(s.go || 'all'), isUrl = /^https:\/\//i.test(go);
      a.innerHTML = '<div class="cs-copy"><span class="cs-tag" data-sl="tag"></span><p class="cs-h" data-sl="h"></p><p class="cs-p" data-sl="p"></p>' +
        (go === 'none' ? '' : '<a class="cs-cta' + (s.soon ? ' cs-soon-cta' : '') + '" href="#categories" data-sl="cta"></a>') + '</div>' +
        '<div class="cs-art ' + (s.art === 'truck' ? 'sit' : 'arches') + '" aria-hidden="true"></div>';
      const cta = a.querySelector('.cs-cta'); if (cta) { if (isUrl) { cta.dataset.url = go; cta.href = go; } else if (go === 'whatsapp') cta.dataset.wa = '1'; else cta.dataset.go = go; if (s.anim) cta.dataset.anim = s.anim; else if (go === 'meat' || go === 'fish' || go === 'grocery') cta.dataset.anim = go; if (s.soon) cta.dataset.goLabel = '1'; }
      const art = a.querySelector('.cs-art');
      if (s.art === 'truck') { art.innerHTML = ART.truck + '<span class="cs-badge"><b data-sl="b1"></b><small data-sl="b2"></small></span>'; }
      else if (s.art === 'fish') { art.innerHTML = ART.fish; }
      else if (s.art === 'map') { art.innerHTML = ART.map; }
      else {
        if (s.seal) art.innerHTML = '<span class="halal-seal xl"><svg viewBox="0 0 64 64"><use href="#halal-seal"/></svg></span>';
        [[1, 1], [0, 2], [2, 3]].forEach(([k, t], j) => { const d = document.createElement('div'); d.className = 'cs-arch t' + t; d.style.setProperty('--k', k); const im = document.createElement('img'); im.className = 'cs-photo'; im.alt = ''; const src = imgSrc((s.imgs || [])[j], a.dataset.sk, j + 1); if (src) im.src = src; d.appendChild(im); art.appendChild(d); });
      }
      if (s.pl || s.pv) { const pr = document.createElement('span'); pr.className = 'cs-price'; pr.innerHTML = '<span class="pl" data-sl="pl"></span><span class="pv"><b data-sl="pv"></b></span>'; art.appendChild(pr); }
      a._slide = s; return a;
    });
  };
  /* (re)writes every text in the current language */
  window.__ddSlideText = function (root, lang) {
    root.querySelectorAll('.cs-slide').forEach((a) => {
      const s = a._slide; if (!s) return;
      a.querySelectorAll('[data-sl]').forEach((el) => {
        const k = el.dataset.sl, v = k === 'b1' ? pick(s.badge && s.badge.b1, lang) : k === 'b2' ? pick(s.badge && s.badge.b2, lang) : pick(s[k], lang);
        el.textContent = txt(v, lang);
      });
    });
  };
})();
