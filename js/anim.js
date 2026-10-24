/* Deshi Drop — short "walking / swimming" animation that plays when a slideshow button takes the customer to a product section.
   window.__ddAnim('fish' | 'meat' | 'grocery' | 'produce'). Turn it off or per category in Dashboard → Settings. Never plays for people who prefer reduced motion. */
(function () {
  'use strict';
  const S = {
    fish: (c, d) => `<svg viewBox="0 0 120 80" class="ga-fish"><g class="ga-wag"><path d="M92 40 118 18 108 40 118 62Z" fill="${d}"/><path d="M14 40C34 10 80 10 98 40 80 70 34 70 14 40Z" fill="${c}"/><path d="M40 26C52 18 70 20 78 28 66 24 52 26 40 26Z" fill="#fff" opacity=".35"/></g><circle cx="32" cy="36" r="4.5" fill="#fff"/><circle cx="31" cy="36" r="2.2" fill="#24231f"/></svg>`,
    chicken: `<svg viewBox="0 0 100 100"><g class="ga-bob"><path d="M20 52c-8-4-12-14-8-22 8 2 12 8 14 14z" fill="#e9e1d2"/><ellipse cx="48" cy="56" rx="27" ry="22" fill="#fff"/><path d="M34 54c8 12 26 12 34 0-8 4-26 4-34 0z" fill="#e8dfcf"/><circle cx="74" cy="34" r="13" fill="#fff"/><path d="M68 22c2-8 8-8 8-2 3-6 9-4 6 4-3 3-10 3-14-2z" fill="#d6283a"/><path d="M86 33l12 4-12 5z" fill="#f5a623"/><path d="M80 44c2 6 0 10-2 12 6-1 6-9 2-12z" fill="#d6283a"/><circle cx="78" cy="31" r="2.4" fill="#24231f"/></g><g stroke="#f08a24" stroke-width="4" stroke-linecap="round" fill="none"><path class="ga-leg" d="M42 76v16m0 0h-7"/><path class="ga-leg b" d="M56 76v16m0 0h-7"/></g></svg>`,
    bull: `<svg viewBox="0 0 170 110"><g class="ga-bob"><path d="M28 40c-12 4-20 16-18 32" stroke="#a89a86" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M10 72c-3 4-2 9 2 10 2-3 3-7 1-10z" fill="#6b5f52"/><rect x="26" y="40" width="92" height="40" rx="19" fill="#ece5d8"/><path d="M66 44c0-24 18-34 34-26 12 6 16 20 14 30z" fill="#e2d9c8"/><path d="M60 46c2-14 10-22 22-22" stroke="#cfc4b0" stroke-width="2" fill="none"/><path d="M112 56c14 4 24 2 30-4l2 22c-8 8-22 8-32 2z" fill="#ddd2bf"/><path d="M116 38c12-8 24-6 30 4l10 10c4 8 0 16-8 18l-18 2c-10-2-16-10-14-20z" fill="#efe8da"/><path d="M148 62c6 0 10 4 8 10-4 3-10 3-14 0z" fill="#c9a899"/><circle cx="153" cy="66" r="1.6" fill="#7a5c50"/><path d="M122 36c-8-14-2-24 6-24-2 8 0 14 6 18z" fill="#4a4036"/><path d="M130 38c8-8 20-6 24 2-8-2-14 0-18 6z" fill="#cdbfa8"/><circle cx="138" cy="48" r="2.6" fill="#fff"/><circle cx="138.6" cy="48" r="1.5" fill="#1d1812"/><path d="M118 42c-6-2-12 2-14 6 6 2 12 0 14-6z" fill="#cdbfa8"/></g><g fill="#e2d9c8"><rect class="ga-leg" x="36" y="74" width="12" height="32" rx="5"/><rect class="ga-leg b" x="54" y="74" width="12" height="32" rx="5"/><rect class="ga-leg b" x="92" y="74" width="12" height="32" rx="5"/><rect class="ga-leg" x="108" y="74" width="12" height="32" rx="5"/></g><g fill="#4a4036"><rect class="ga-leg" x="36" y="100" width="12" height="6" rx="2"/><rect class="ga-leg b" x="54" y="100" width="12" height="6" rx="2"/><rect class="ga-leg b" x="92" y="100" width="12" height="6" rx="2"/><rect class="ga-leg" x="108" y="100" width="12" height="6" rx="2"/></g></svg>`,
    goat: `<svg viewBox="0 0 150 110"><g class="ga-bob"><path d="M24 44c-8-2-14 2-16 8 8 0 12-2 16-4z" fill="#f2ece0"/><ellipse cx="62" cy="52" rx="42" ry="22" fill="#f6f1e7"/><path d="M96 40l14-20 12 6 6 20-4 14-20 4z" fill="#f6f1e7"/><ellipse cx="124" cy="52" rx="14" ry="11" fill="#efe7d8"/><path d="M104 22c-4-12 2-18 8-16-2 6 0 10 4 14z" fill="#8a7a64"/><path d="M118 22c2-10 10-12 14-6-6 0-8 4-8 8z" fill="#8a7a64"/><path d="M112 66c-2 10 0 16 3 18 3-3 3-10 1-18z" fill="#e6dccb"/><path d="M96 38c-12-6-22-2-24 4 8 0 18 0 24-4z" fill="#d9ccb6"/><circle cx="116" cy="44" r="2.4" fill="#24231f"/><circle cx="132" cy="54" r="2" fill="#8a7a64"/></g><g fill="#d9ccb6"><rect class="ga-leg" x="34" y="64" width="9" height="38" rx="4"/><rect class="ga-leg b" x="48" y="64" width="9" height="38" rx="4"/><rect class="ga-leg b" x="78" y="64" width="9" height="38" rx="4"/><rect class="ga-leg" x="92" y="64" width="9" height="38" rx="4"/></g></svg>`,
    tomato: `<svg viewBox="0 0 80 80"><circle cx="40" cy="44" r="28" fill="#d6283a"/><path d="M26 22c6-8 22-8 28 0-8 2-20 2-28 0z" fill="#2f8a52"/><path d="M40 12v10" stroke="#2f8a52" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="38" rx="5" ry="3" fill="#fff" opacity=".4"/></svg>`,
    carrot: `<svg viewBox="0 0 80 80"><path d="M44 20 70 70 20 52z" fill="#f58a1f" transform="rotate(-30 40 44)"/><path d="M40 20c-6-14-14-12-14-12 4 4 4 10 4 14zm4 0c6-14 16-10 16-10-6 2-8 8-8 12z" fill="#2f8a52" transform="rotate(-30 40 44)"/></svg>`,
    onion: `<svg viewBox="0 0 80 80"><path d="M40 10c16 10 24 24 20 40-3 12-12 22-20 22S23 62 20 50c-4-16 4-30 20-40z" fill="#e8c88a"/><path d="M40 10c8 14 8 36 0 62M40 10c-8 14-8 36 0 62" stroke="#c9a15a" stroke-width="2" fill="none"/></svg>`,
    spinach: `<svg viewBox="0 0 80 80"><path d="M40 74V34" stroke="#1c6b3c" stroke-width="4" stroke-linecap="round"/><path d="M40 36C22 34 10 20 14 6c20 0 30 12 26 30zm0 8c18-2 28-14 26-30-18 0-28 10-26 30z" fill="#2f9d5c"/></svg>`,
    rice: `<svg viewBox="0 0 80 90"><path d="M16 22h48l4 56a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="#f3e6c8"/><path d="M16 22l6-12h36l6 12z" fill="#e2cf9f"/><rect x="24" y="40" width="32" height="24" rx="4" fill="#1c6b3c"/><text x="40" y="57" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Inter,sans-serif">RICE</text></svg>`,
    milk: `<svg viewBox="0 0 80 90"><path d="M24 22h32l4 12v44a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V34z" fill="#fff" stroke="#1c6b3c" stroke-width="3"/><path d="M24 22l-4 12h40l-4-12z" fill="#dff0e5" stroke="#1c6b3c" stroke-width="3"/><rect x="28" y="46" width="24" height="18" rx="3" fill="#2f6fb0"/></svg>`,
    egg: `<svg viewBox="0 0 80 90"><ellipse cx="40" cy="50" rx="24" ry="30" fill="#f8efe0" stroke="#d9c6a3" stroke-width="3"/><ellipse cx="32" cy="38" rx="6" ry="9" fill="#fff" opacity=".6"/></svg>`,
    tea: `<svg viewBox="0 0 80 90"><rect x="16" y="20" width="48" height="62" rx="6" fill="#b3261e"/><rect x="16" y="20" width="48" height="12" rx="6" fill="#8a1a14"/><circle cx="40" cy="54" r="12" fill="#f3e6c8"/><path d="M34 54h12M40 48v12" stroke="#b3261e" stroke-width="3"/></svg>`
  };
  const SETS = {
    fish: [() => S.fish('#ff8a65', '#ff7043'), () => S.fish('#cfe3ee', '#78909c'), () => S.fish('#ffd54f', '#fb8c00'), () => S.fish('#7fd1c4', '#2c9b8a')],
    meat: [() => S.chicken, () => S.bull, () => S.goat],
    grocery: [() => S.rice, () => S.milk, () => S.egg, () => S.tea],
    produce: [() => S.tomato, () => S.carrot, () => S.spinach, () => S.onion]
  };
  const KIND = { fish: 'swim', meat: 'walk', grocery: 'hop', produce: 'hop' };
  const sizes = { chicken: 74, bull: 120, goat: 104 };
  window.__ddAnim = function (kind) {
    try {
      const st = window.__DD_SETTINGS || {};
      if (st.anim_enabled === false || st['anim_' + kind] === false) return;
      if (!SETS[kind] || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      const old = document.getElementById('ga-layer'); if (old) old.remove();
      const rtl = document.documentElement.dir === 'rtl', mode = KIND[kind], layer = document.createElement('div');
      layer.id = 'ga-layer'; layer.className = 'ga-layer ga-' + mode + (rtl ? ' ga-rtl' : ''); layer.setAttribute('aria-hidden', 'true');
      const items = SETS[kind], n = items.length, total = 3800;
      items.forEach((fn, i) => {
        const el = document.createElement('div'), isAnimal = kind === 'meat';
        el.className = 'ga-sp' + (isAnimal ? ' ga-walk' : '');
        const w = kind === 'meat' ? [74, 124, 106][i] : kind === 'fish' ? 92 + (i % 2) * 14 : 58;
        el.style.cssText = `--w:${w}px;--d:${i * 420}ms;--y:${kind === 'fish' ? 14 + i * 17 : 0}%;--dur:${total - i * 150}ms;`;
        el.innerHTML = fn() + (kind === 'fish' ? '<i class="ga-b b1"></i><i class="ga-b b2"></i><i class="ga-b b3"></i>' : '');
        layer.appendChild(el);
      });
      document.body.appendChild(layer);
      setTimeout(() => layer.remove(), total + n * 420 + 400);
    } catch (e) { /* the animation is decoration only */ }
  };
})();
