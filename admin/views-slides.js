/* Dashboard: Slideshow — full control of the homepage slideshow (on/off, order, add, edit text / photos / button / animation).
   Saved in settings.carousel; if nothing is saved the website uses the built-in list (js/slides-default.js). */
(() => {
'use strict';
const D = window.__DDA, { S, $, $$, esc, toast, must, ACT, VIEWS, overlay, closeOv } = D;
const THEMES = [['green', 'Green'], ['cream', 'Cream'], ['mint', 'Light green'], ['red', 'Red'], ['dark', 'Dark'], ['blue', 'Blue (sea)'], ['gold', 'Green + gold'], ['maroon', 'Maroon + gold'], ['night', 'Night green']];
const ARTS = [['photos', 'Three photos in arches'], ['fish', 'Swimming fish (animated)'], ['truck', 'Delivery truck'], ['map', 'Map pin']];
const GOS = [['all', 'Shop: All products'], ['meat', 'Shop: Meat'], ['fish', 'Shop: Fish'], ['grocery', 'Shop: Grocery'], ['bakery', 'Shop: Bakery'], ['beverage', 'Shop: Beverage'], ['whatsapp', 'Open WhatsApp chat'], ['url', 'Open a web link…'], ['none', 'No button']];
const ANIMS = [['', 'Automatic (by where the button goes)'], ['meat', 'Chicken, desi bull & goat walking'], ['fish', 'Fish swimming'], ['grocery', 'Rice, milk & eggs hopping'], ['produce', 'Tomato, carrot & spinach hopping'], ['none', 'No animation']];
const DEF = () => JSON.parse(JSON.stringify(window.__SLIDES_DEFAULT || []));
let LIST = [], SAVED = false;
const L3 = (o) => ({ en: (o && o.en) || '', bn: (o && o.bn) || '', ar: (o && o.ar) || '' });
const imgUrl = (v) => !v ? '' : /^https:\/\//i.test(v) ? v : '../img/p/' + String(v).replace(/[^a-z0-9_-]/gi, '') + '.jpg';
async function load() {
  const r = must(await S.sb.from('settings').select('*').eq('key', 'carousel').maybeSingle());
  SAVED = !!(r && Array.isArray(r.value)); LIST = SAVED ? r.value : DEF();
}
const save = async () => { must(await S.sb.from('settings').upsert({ key: 'carousel', value: LIST })); SAVED = true; };
const th = (s) => (THEMES.find((t) => t[0] === s.theme) || ['', s.theme])[1];
function thumb(s) {
  const u = imgUrl((s.imgs || [])[1] || (s.imgs || [])[0]);
  return u ? `<img class="thumb" src="${esc(u)}" alt="">` : `<span class="thumb" style="display:grid;place-items:center;font-size:20px">${s.art === 'fish' ? '🐟' : s.art === 'truck' ? '🚚' : s.art === 'map' ? '📍' : '🖼️'}</span>`;
}
VIEWS.slides = async () => {
  if (!D.isAdmin()) { $('#view').innerHTML = '<div class="empty">Admins only.</div>'; return; }
  await load();
  $('#va').innerHTML = '<button class="btn" data-act="sl-new">+ Add slide</button>';
  $('#view').innerHTML = `<p class="mute" style="margin-top:0">These are the slides at the top of your homepage. Tick “Shown” to switch a slide on or off, use the arrows to change the order, and <b>Edit</b> to change its words, photos, colours, button and animation. Changes show on the website as soon as visitors refresh.</p>
  <div class="card scroll"><table class="tbl"><thead><tr><th></th><th>Slide</th><th>Colour</th><th>Button goes to</th><th>Shown</th><th></th></tr></thead><tbody>
  ${LIST.map((s, i) => `<tr><td>${thumb(s)}</td><td><b>${esc((s.h && s.h.en) || '(no heading)')}</b><div class="mute small">${esc((s.tag && s.tag.en) || '')}${s.soon ? ' · coming-soon style' : ''}</div></td><td class="small">${esc(th(s))}</td><td class="small">${esc((GOS.find((g) => g[0] === s.go) || (/^https:/.test(s.go || '') ? ['', 'Web link'] : ['', s.go || '']))[1])}</td>
  <td><input type="checkbox" data-act="sl-on" data-i="${i}" ${s.on !== false ? 'checked' : ''} aria-label="Shown"></td>
  <td class="nw"><button class="btn ghost sm" data-act="sl-mv" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button> <button class="btn ghost sm" data-act="sl-mv" data-i="${i}" data-d="1" ${i === LIST.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button> <button class="btn ghost sm" data-act="sl-edit" data-i="${i}">Edit</button> <button class="btn ghost sm red" data-act="sl-del" data-i="${i}" aria-label="Delete">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No slides — the slideshow is hidden on the website. Add one!</td></tr>'}</tbody></table></div>
  <div class="row mt"><span class="mute small">${SAVED ? 'Using your saved slideshow.' : 'Showing the built-in slideshow — change anything and it becomes yours.'}</span><span class="grow"></span>${SAVED ? '<button class="btn ghost sm" data-act="sl-reset">Reset to the built-in slideshow</button>' : ''}</div>`;
};
ACT['sl-on'] = async (a) => { LIST[+a.dataset.i].on = a.checked; await save(); toast(a.checked ? 'Slide shown' : 'Slide hidden'); D.go('slides'); };
ACT['sl-mv'] = async (a) => { const i = +a.dataset.i, j = i + +a.dataset.d; if (j < 0 || j >= LIST.length) return; [LIST[i], LIST[j]] = [LIST[j], LIST[i]]; await save(); D.go('slides'); };
ACT['sl-del'] = async (a) => { if (!confirm('Delete this slide? (You can use “Reset to the built-in slideshow” to bring the original ones back.)')) return; LIST.splice(+a.dataset.i, 1); await save(); D.go('slides'); };
ACT['sl-reset'] = async () => { if (!confirm('Throw away your changes and go back to the built-in slideshow?')) return; must(await S.sb.from('settings').delete().eq('key', 'carousel')); toast('Back to the built-in slideshow'); D.go('slides'); };
ACT['sl-new'] = () => { LIST.push({ id: 'n' + Date.now().toString(36), on: true, theme: 'green', art: 'photos', seal: false, tag: L3(), h: L3({ en: 'New slide' }), p: L3(), cta: L3({ en: 'Shop now' }), go: 'all', anim: '', soon: false, imgs: ['', '', ''], pl: L3(), pv: L3() }); edit(LIST.length - 1, true); };
ACT['sl-edit'] = (a) => edit(+a.dataset.i, false);

const TXT = [['tag', 'Small label (top)'], ['h', 'Heading'], ['p', 'Text'], ['cta', 'Button text'], ['pl', 'Price tag: small words'], ['pv', 'Price tag: big words']];
function edit(i, isNew) {
  const s = LIST[i], goSel = /^https:/.test(s.go || '') ? 'url' : (s.go || 'all');
  const f = (k, l, lang) => k === 'p' ? `<div class="full"><label>${l}</label><textarea data-t="${k}" data-l="${lang}" rows="2" maxlength="300">${esc((s[k] && s[k][lang]) || '')}</textarea></div>` : `<div><label>${l}</label><input data-t="${k}" data-l="${lang}" maxlength="${k === 'h' ? 90 : 60}" value="${esc((s[k] && s[k][lang]) || '')}"></div>`;
  overlay(`<div class="modal" style="max-width:760px"><button class="x" data-act="sl-cancel" data-new="${isNew ? 1 : ''}" data-i="${i}" aria-label="Close">×</button><h2>${isNew ? 'New slide' : 'Edit slide'}</h2>
  <div class="f mt"><div><label>Colour</label><select id="se-th">${THEMES.map(([k, n]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div><label>Picture style</label><select id="se-art">${ARTS.map(([k, n]) => `<option value="${k}" ${s.art === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div><label>Button goes to</label><select id="se-go">${GOS.map(([k, n]) => `<option value="${k}" ${goSel === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div><label>Web link (only for “Open a web link”, must start with https://)</label><input id="se-url" value="${esc(goSel === 'url' ? s.go : '')}" placeholder="https://"></div>
  <div class="full"><label>Animation when the button is pressed</label><select id="se-an">${ANIMS.map(([k, n]) => `<option value="${k}" ${(s.anim || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
  <div class="row wrap mt"><label class="chk"><input type="checkbox" id="se-seal" ${s.seal ? 'checked' : ''}> Show the Halal badge</label><label class="chk"><input type="checkbox" id="se-soon" ${s.soon ? 'checked' : ''}> “Coming soon” style button (outlined)</label><label class="chk"><input type="checkbox" id="se-on" ${s.on !== false ? 'checked' : ''}> Shown on the website</label></div>
  <h3 class="mt">Photos <span class="mute small">(for “Three photos in arches” — left, middle, right)</span></h3>
  <div class="grid g3">${[0, 1, 2].map((n) => `<div class="row"><img class="picbox" id="se-pv${n}" src="${esc(imgUrl((s.imgs || [])[n]))}" alt=""><div><button class="btn sm" type="button" data-act="se-up" data-n="${n}">Upload</button> <button class="btn ghost sm" type="button" data-act="se-clr" data-n="${n}">Clear</button></div></div>`).join('')}</div>
  <h3 class="mt">Words <span class="mute small">(type English, then press “Translate to Bangla + Arabic”)</span></h3>
  <div class="row wrap"><button class="btn ghost sm" type="button" data-act="se-tr">Translate English → Bangla + Arabic</button><span class="mute small" id="se-trs"></span></div>
  ${['en', 'bn', 'ar'].map((lang) => `<h4 class="mt" style="margin:14px 0 4px">${{ en: 'English', bn: 'Bangla', ar: 'Arabic' }[lang]}</h4><div class="f">${TXT.map(([k, l]) => f(k, l, lang)).join('')}</div>`).join('')}
  <div class="err" id="se-err"></div>
  <div class="row mt"><span class="grow"></span><button class="btn ghost" type="button" data-act="sl-cancel" data-new="${isNew ? 1 : ''}" data-i="${i}">Cancel</button><button class="btn" data-act="sl-save" data-i="${i}">Save slide</button></div></div>`, 'c');
  window.__seImgs = (s.imgs || ['', '', '']).slice(0, 3); while (window.__seImgs.length < 3) window.__seImgs.push('');
}
ACT['sl-cancel'] = (a) => { if (a.dataset.new) LIST.pop(); closeOv(); };
const pickFile = () => new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/jpeg,image/png,image/webp'; i.onchange = () => res(i.files[0] || null); i.click(); });
ACT['se-up'] = async (a) => { const n = +a.dataset.n, f = await pickFile(); if (!f) return; const u = await D.uploadPic(f, 'slides'); window.__seImgs[n] = u; $('#se-pv' + n).src = u; };
ACT['se-clr'] = (a) => { const n = +a.dataset.n; window.__seImgs[n] = ''; $('#se-pv' + n).removeAttribute('src'); };
ACT['se-tr'] = async () => {
  const st = $('#se-trs'); st.textContent = 'Translating…';
  try {
    for (const [k] of TXT) { const en = (document.querySelector(`[data-t="${k}"][data-l="en"]`) || {}).value || ''; if (!en.trim() || /^\$?[\d.,/ ]+$/.test(en.trim())) { for (const l of ['bn', 'ar']) { const e = document.querySelector(`[data-t="${k}"][data-l="${l}"]`); if (e && !e.value) e.value = en; } continue; }
      for (const l of ['bn', 'ar']) { const e = document.querySelector(`[data-t="${k}"][data-l="${l}"]`); if (e) e.value = await D.translate(en, l); } }
    st.textContent = 'Done — please read the Bangla and Arabic and fix anything that looks wrong.';
  } catch (e) { st.textContent = 'Could not translate automatically (' + e.message + '). Please type them.'; }
};
ACT['sl-save'] = async (a) => {
  const s = LIST[+a.dataset.i], err = $('#se-err'); err.textContent = '';
  const goSel = $('#se-go').value; let go = goSel;
  if (goSel === 'url') { go = $('#se-url').value.trim(); if (!/^https:\/\/[^\s]+$/i.test(go)) { err.textContent = 'The web link must start with https://'; return; } }
  s.theme = $('#se-th').value; s.art = $('#se-art').value; s.go = go; s.anim = $('#se-an').value; s.seal = $('#se-seal').checked; s.soon = $('#se-soon').checked; s.on = $('#se-on').checked;
  ['tag', 'h', 'p', 'cta', 'pl', 'pv'].forEach((k) => { s[k] = L3(); ['en', 'bn', 'ar'].forEach((l) => { const e = document.querySelector(`[data-t="${k}"][data-l="${l}"]`); s[k][l] = e ? e.value.trim() : ''; }); });
  if (!s.h.en) { err.textContent = 'Please type an English heading.'; return; }
  s.imgs = window.__seImgs.slice(0, 3);
  a.disabled = true; try { await save(); closeOv(); toast('Slide saved — it is live on the website'); D.go('slides'); } finally { a.disabled = false; }
};
})();
