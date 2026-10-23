/* Dashboard: Site pictures (logo, slider photos, gallery). Saved in settings.site_images / settings.gallery_extra */
(() => {
'use strict';
const D = window.__DDA, { S, $, $$, esc, toast, must, ACT, VIEWS, uploadPic } = D;
const SLOTS = [['s2t1', 'Meat slide · photo 1', 'fl_cubes'], ['s2t2', 'Meat slide · photo 2', 'beef'], ['s2t3', 'Meat slide · photo 3', 'onion'],
  ['s3t1', 'Produce slide · photo 1', 'milk'], ['s3t2', 'Produce slide · photo 2', 'chicken_breast'], ['s3t3', 'Produce slide · photo 3', 'chicken_whole'],
  ['s4t1', 'Grocery slide · photo 1', 'lentils'], ['s4t2', 'Grocery slide · photo 2', 'spinach'], ['s4t3', 'Grocery slide · photo 3', 'pepper'],
  ['s7t1', 'Chicken offer slide · photo 1', 'promo_chicken_row'], ['s7t2', 'Chicken offer slide · photo 2', 'fl_chicken'], ['s7t3', 'Chicken offer slide · photo 3', 'promo_chicken_row'],
  ['s8t1', 'Koliza offer slide · photo 1', 'beef'], ['s8t2', 'Koliza offer slide · photo 2', 'promo_koliza'], ['s8t3', 'Koliza offer slide · photo 3', 'fl_cubes'],
  ['s9t1', 'Catering slide · photo 1', 'cater_meat'], ['s9t2', 'Catering slide · photo 2', 'cater_chicken'], ['s9t3', 'Catering slide · photo 3', 'cater_meat']];
let SI = {}, GE = [];
const load = async () => { const rows = must(await S.sb.from('settings').select('*').in('key', ['site_images', 'gallery_extra'])); SI = {}; GE = []; rows.forEach((r) => { if (r.key === 'site_images' && r.value && typeof r.value === 'object') SI = r.value; if (r.key === 'gallery_extra' && Array.isArray(r.value)) GE = r.value; }); SI.slides = SI.slides || {}; SI.gallery = SI.gallery || {}; SI.gallery_hidden = SI.gallery_hidden || []; };
const saveSI = async () => must(await S.sb.from('settings').upsert({ key: 'site_images', value: SI }));
const saveGE = async () => must(await S.sb.from('settings').upsert({ key: 'gallery_extra', value: GE }));
const pick = (accept = 'image/jpeg,image/png,image/webp') => new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
const G = () => window.DD_GALLERY || { items: [], categories: [] };
const galSrc = (it) => it.src && !it.photo ? '../' + it.src : '../img/p/' + (it.photo || '') + '.jpg';

VIEWS.siteimages = async () => {
  if (!D.isAdmin()) { $('#view').innerHTML = '<div class="empty">Admins only.</div>'; return; }
  await load();
  const cats = G().categories;
  $('#view').innerHTML = `<p class="mute" style="margin-top:0">Replace the pictures visitors see. Changes show on the website the next time the page loads. “Reset” goes back to the built-in picture.</p>
  <div class="card"><h3>Logo</h3><div class="row wrap"><img class="picbox" style="border-style:solid;object-fit:contain;background:#fff" src="${esc(SI.logo || '../img/logo.jpg')}" alt="Logo"><div><button class="btn sm" data-act="si-logo">Choose new logo</button> ${SI.logo ? '<button class="btn ghost sm" data-act="si-logo-reset">Reset</button>' : ''}<div class="mute small mt">Square picture works best (it is shown round).</div></div></div></div>
  <div class="card mt"><h3>Homepage slider photos</h3><div class="grid g3">${SLOTS.map(([k, l, d]) => `<div class="row"><img class="picbox" src="${esc(SI.slides[k] || '../img/p/' + d + '.jpg')}" alt=""><div><b class="small">${l}</b><div class="row mt"><button class="btn sm" data-act="si-slot" data-k="${k}">Replace</button>${SI.slides[k] ? `<button class="btn ghost sm" data-act="si-slot-reset" data-k="${k}">Reset</button>` : ''}</div></div></div>`).join('')}</div></div>
  <div class="card mt"><h3>Gallery</h3><div class="grid g3">${G().items.map((it) => { const hid = SI.gallery_hidden.includes(it.id), src = SI.gallery[it.id] || galSrc(it); return `<div class="row"><img class="picbox" style="${hid ? 'opacity:.35' : ''}" src="${esc(src)}" alt=""><div><b class="small">${esc((it.title && it.title.en) || it.id)}</b>${hid ? ' <span class="pill s-cancelled">hidden</span>' : ''}<div class="row mt wrap"><button class="btn sm" data-act="si-gal" data-id="${esc(it.id)}">Replace</button><button class="btn ghost sm" data-act="si-gal-hide" data-id="${esc(it.id)}">${hid ? 'Show' : 'Hide'}</button></div></div></div>`; }).join('')}
  ${GE.map((x) => `<div class="row"><img class="picbox" src="${esc(x.src)}" alt=""><div><b class="small">${esc((x.title && x.title.en) || x.id)}</b> <span class="pill">added</span><div class="row mt"><button class="btn red ghost sm" data-act="si-gal-del" data-id="${esc(x.id)}">Delete</button></div></div></div>`).join('')}</div>
  <h3 class="mt">Add a gallery photo</h3><div class="f"><div><label>Title (English)</label><input id="ga-t"></div><div><label>Category</label><select id="ga-c">${cats.map((c) => `<option value="${esc(c.id)}">${esc(c.en)}</option>`).join('')}</select></div><div><label>Picture</label><input id="ga-f" type="file" accept="image/jpeg,image/png,image/webp"></div></div><button class="btn mt" data-act="si-gal-add">Add to gallery</button></div>`;
};
const done = (m) => { toast(m || 'Saved — refresh the website to see it'); D.go('siteimages'); };
ACT['si-logo'] = async () => { const f = await pick(); if (!f) return; SI.logo = await uploadPic(f, 'site'); await saveSI(); done(); };
ACT['si-logo-reset'] = async () => { delete SI.logo; await saveSI(); done(); };
ACT['si-slot'] = async (a) => { const f = await pick(); if (!f) return; SI.slides[a.dataset.k] = await uploadPic(f, 'site'); await saveSI(); done(); };
ACT['si-slot-reset'] = async (a) => { delete SI.slides[a.dataset.k]; await saveSI(); done(); };
ACT['si-gal'] = async (a) => { const f = await pick(); if (!f) return; SI.gallery[a.dataset.id] = await uploadPic(f, 'gallery'); await saveSI(); done(); };
ACT['si-gal-hide'] = async (a) => { const i = SI.gallery_hidden.indexOf(a.dataset.id); if (i < 0) SI.gallery_hidden.push(a.dataset.id); else SI.gallery_hidden.splice(i, 1); await saveSI(); done(); };
ACT['si-gal-add'] = async (a) => {
  const f = $('#ga-f').files[0]; if (!f) throw new Error('Choose a picture first'); const title = $('#ga-t').value.trim(); if (!title) throw new Error('Enter a title');
  a.disabled = true; try { const src = await uploadPic(f, 'gallery'); GE.push({ id: 'x' + Date.now().toString(36), src, cat: $('#ga-c').value, date: new Date().toLocaleDateString('en-CA'), title: { en: title }, caption: { en: '' } }); await saveGE(); done(); } finally { a.disabled = false; }
};
ACT['si-gal-del'] = async (a) => { if (!confirm('Remove this photo from the gallery?')) return; GE = GE.filter((x) => x.id !== a.dataset.id); await saveGE(); done(); };
})();
