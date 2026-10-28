/* Dashboard views (admin): Products, Deals, Site text, Money, People, Settings, Activity */
(() => {
'use strict';
const D = window.__DDA, { S, $, $$, esc, money, money0, fmtDT, fmtD, photo, toast, must, fail, ACT, VIEWS, overlay, closeOv, safeUrl } = D;
const adminOnly = (fn) => async () => { if (!D.isAdmin()) { $('#view').innerHTML = '<div class="empty">Admins only.</div>'; return; } await fn(); };

/* ---------- Products ---------- */
const reloadProducts = async () => { S.products = must(await S.sb.from('products').select('*').order('sort').order('id')); };
VIEWS.products = adminOnly(async () => {
  await reloadProducts();
  $('#va').innerHTML = '<button class="btn" data-act="p-new">+ Add product</button>';
  const cats = [...new Set(S.products.map((p) => p.category).filter(Boolean))];
  $('#view').innerHTML = `<div class="row wrap" style="margin-bottom:12px"><input id="pq" placeholder="Search products…" style="max-width:280px"><span class="mute small">${S.products.length} products · click a price to change it, tick boxes to switch stock / visibility</span></div>
  <div class="card scroll"><table class="tbl"><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>In stock</th><th>Visible</th><th></th></tr></thead><tbody id="pt"></tbody></table></div>`;
  const draw = () => { const q = $('#pq').value.toLowerCase(); $('#pt').innerHTML = S.products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)).map((p) => `<tr>
    <td><img class="thumb" src="${esc(photo(p))}" alt="" loading="lazy"></td><td><b>${esc(p.name)}</b><div class="mute small">${p.halal ? 'Halal · ' : ''}${esc(p.unit)}${p.tag ? ' · ' + esc(p.tag) : ''}</div></td><td>${esc(p.category || '')}<div class="mute small">${esc(p.sub || '')}</div></td>
    <td><input class="pp" data-id="${p.id}" type="number" min="0" step="0.01" value="${p.price}" style="width:96px" aria-label="Price"></td>
    <td><input type="checkbox" data-act="p-flag" data-f="in_stock" data-id="${p.id}" ${p.in_stock ? 'checked' : ''} aria-label="In stock"></td><td><input type="checkbox" data-act="p-flag" data-f="active" data-id="${p.id}" ${p.active ? 'checked' : ''} aria-label="Visible"></td>
    <td><button class="btn ghost sm" data-act="p-edit" data-id="${p.id}">Edit</button></td></tr>`).join(''); };
  $('#pq').oninput = draw; draw();
  $('#pt').addEventListener('change', async (e) => {
    try {
      if (e.target.classList.contains('pp')) { const v = Number(e.target.value); if (!(v >= 0)) throw new Error('Enter a valid price'); must(await S.sb.from('products').update({ price: v }).eq('id', e.target.dataset.id)); toast('Price saved'); }
      else if (e.target.dataset.act === 'p-flag') { must(await S.sb.from('products').update({ [e.target.dataset.f]: e.target.checked }).eq('id', e.target.dataset.id)); toast('Saved'); }
    } catch (x) { fail(x); D.go('products'); }
  });
});
const PF = [['name_bn', 'Name (Bangla)'], ['name_ar', 'Name (Arabic)'], ['category_bn', 'Category (Bangla)'], ['category_ar', 'Category (Arabic)'], ['sub', 'Sub-category (optional, e.g. Beef, Chicken, Shrimp)']];
/* free automatic translation (MyMemory). The unit part "(per lb)" is handled by a small glossary because machine translation gets it wrong. */
const GLOSS = { bn: { 'per lb': 'প্রতি পাউন্ড', 'per piece': 'প্রতি পিস', 'dozen': 'ডজন', 'bunch': 'আঁটি', '1 gal': '১ গ্যালন' }, ar: { 'per lb': 'للرطل', 'per piece': 'للحبة', 'dozen': 'دزينة', 'bunch': 'حزمة', '1 gal': '١ غالون' } };
const DIG = { bn: '০১২৩৪৫৬৭৮৯', ar: '٠١٢٣٤٥٦٧٨٩' };
async function translate(text, lang) {
  text = String(text || '').trim(); if (!text) return '';
  let unit = ''; const m = text.match(/\s*\(([^)]*)\)\s*$/); let core = text;
  if (m) { core = text.slice(0, m.index).trim(); const raw = m[1].trim(); unit = ' (' + (GLOSS[lang][raw.toLowerCase()] || raw.replace(/\d/g, (d) => DIG[lang][d]).replace(/\blb\b/gi, lang === 'bn' ? 'পাউন্ড' : 'رطل').replace(/\bkg\b/gi, lang === 'bn' ? 'কেজি' : 'كجم')) + ')'; }
  const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(core) + '&langpair=en|' + lang);
  const j = await r.json(); let out = j && j.responseData && j.responseData.translatedText || '';
  if (!out || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) throw new Error('translation service busy');
  return (out.replace(/&#39;/g, "'").replace(/&quot;/g, '"') + unit).trim();
}
D.translate = translate;
let trTimer = 0;
async function autoTr(force) {
  const en = ($('#pm-name') || {}).value || ''; const st = $('#pm-trs'); if (!en.trim()) return;
  const jobs = [['name_bn', 'bn', en], ['name_ar', 'ar', en]];
  const cs = $('#pm-cat'); const catEn = cs ? (cs.value === '__new' ? ($('#pm-newcat').value || '') : cs.value) : '';
  const known = S.products.find((x) => x.category === catEn && x.category_bn);
  if (catEn) { if (known) { setK('category_bn', known.category_bn, force); setK('category_ar', known.category_ar, force); } else { jobs.push(['category_bn', 'bn', catEn], ['category_ar', 'ar', catEn]); } }
  if (st) st.textContent = 'Translating…';
  try { await Promise.all(jobs.map(async ([k, l, t]) => { const el = document.querySelector('.modal [data-k="' + k + '"]'); if (!el || (el.dataset.touched && !force)) return; el.value = await translate(t, l); })); if (st) st.textContent = 'Translated — please check the Bangla and Arabic and fix anything that looks wrong.'; }
  catch (e) { if (st) st.textContent = 'Could not translate automatically (' + e.message + '). Please type the Bangla and Arabic names.'; }
}
function setK(k, v, force) { const el = document.querySelector('.modal [data-k="' + k + '"]'); if (el && (!el.dataset.touched || force)) el.value = v || ''; }
ACT['p-new'] = () => pModal(null);
ACT['p-edit'] = (a) => pModal(S.products.find((p) => String(p.id) === a.dataset.id));
function catOpts(cur) {
  const cs = [...new Set(S.products.map((x) => x.category).filter(Boolean))]; if (cur && !cs.includes(cur)) cs.push(cur);
  return '<option value="">Choose a category…</option>' + cs.map((c) => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('') + '<option value="__new">➕ New category…</option>';
}
function pModal(p) {
  const v = p || { unit: 'lb', halal: true, in_stock: true, active: true, sort: S.products.length + 1, price: 0 };
  overlay(`<div class="modal"><button class="x" data-act="close" aria-label="Close">×</button><h2>${p ? 'Edit product' : 'New product'}</h2>
  <div class="row mt"><img class="picbox" id="pm-img" src="${esc(photo(v))}" alt=""><div><label>Picture</label><input type="file" id="pm-file" accept="image/jpeg,image/png,image/webp"><div class="mute small">JPG/PNG/WebP — resized automatically. Leave empty to keep the current picture.</div></div></div>
  <div class="f mt"><div class="full"><label>Product name (English only) — this is the product's ID, so it can't be changed later</label><input id="pm-name" value="${esc(v.name || '')}" ${p ? 'disabled' : ''}></div>
  <div class="full mute small" id="pm-trs">${p ? '' : 'Type the English name — Bangla and Arabic are filled in automatically.'}</div>
  <div><label>Category</label><select id="pm-cat" data-k="category">${catOpts(v.category)}</select></div><div id="pm-newc" hidden><label>New category name (English)</label><input id="pm-newcat" maxlength="40"></div>
  <div><label>Tag</label><select data-k="tag">${['', 'Popular', 'Fresh', 'New'].map((t) => `<option value="${t}" ${(v.tag || '') === t ? 'selected' : ''}>${t || 'No tag'}</option>`).join('')}</select></div>
  ${PF.map(([k, l]) => `<div><label>${l}</label><input data-k="${k}" value="${esc(v[k] || '')}"></div>`).join('')}
  <div><label>Price ($)</label><input id="pm-price" type="number" min="0" step="0.01" value="${v.price}"></div><div><label>Unit</label><select id="pm-unit">${['lb', 'piece', 'each', 'pack'].map((u) => `<option ${v.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
  <div><label>Sort order</label><input id="pm-sort" type="number" value="${v.sort || 0}"></div></div>
  <div class="row wrap mt"><label class="chk"><input type="checkbox" id="pm-halal" ${v.halal ? 'checked' : ''}> Halal</label><label class="chk"><input type="checkbox" id="pm-stock" ${v.in_stock ? 'checked' : ''}> In stock</label><label class="chk"><input type="checkbox" id="pm-active" ${v.active ? 'checked' : ''}> Visible on website</label></div>
  <div class="row mt">${p ? `<button class="btn red ghost" data-act="p-del" data-id="${p.id}">Delete</button>` : ''}<span class="grow"></span><button class="btn" data-act="p-save" data-id="${p ? p.id : ''}">Save</button></div></div>`, 'c');
  const nm = $('#pm-name'), cat = $('#pm-cat');
  $$('.modal [data-k]').forEach((i) => { if (/^(name_|category_)/.test(i.dataset.k)) i.addEventListener('input', () => { i.dataset.touched = '1'; }); });
  if (!p) nm.addEventListener('input', () => { clearTimeout(trTimer); trTimer = setTimeout(() => autoTr(false), 700); });
  cat.addEventListener('change', () => { $('#pm-newc').hidden = cat.value !== '__new'; if (cat.value !== '__new') autoTr(false); });
  $('#pm-newcat').addEventListener('input', () => { clearTimeout(trTimer); trTimer = setTimeout(() => autoTr(false), 700); });
  $('#pm-file').onchange = (e) => { const f = e.target.files[0]; if (f) $('#pm-img').src = URL.createObjectURL(f); };
}
function resizeImg(file, max = 900) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => b ? res(b) : rej(new Error('Could not read the image')), 'image/jpeg', 0.86); }; img.onerror = () => rej(new Error('That file is not a usable image')); img.src = URL.createObjectURL(file); });
}
async function uploadPic(file, folder) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 12e6) throw new Error('Use a JPG, PNG or WebP image under 12 MB');
  const blob = await resizeImg(file), path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  must(await S.sb.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }));
  return S.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}
D.uploadPic = uploadPic;
ACT['p-save'] = async (a) => {
  const id = a.dataset.id, row = {}; $$('.modal [data-k]').forEach((i) => { row[i.dataset.k] = i.value.trim() || null; });
  Object.assign(row, { price: Number($('#pm-price').value), unit: $('#pm-unit').value, sort: Number($('#pm-sort').value) || 0, halal: $('#pm-halal').checked, in_stock: $('#pm-stock').checked, active: $('#pm-active').checked });
  if (row.category === '__new') { row.category = ($('#pm-newcat').value || '').trim() || null; }
  if (!row.category) throw new Error('Choose a category');
  if (!(row.price >= 0)) throw new Error('Enter a valid price');
  if (!id) { row.name = $('#pm-name').value.trim(); if (!row.name) throw new Error('Name is required'); }
  a.disabled = true;
  try {
    const f = $('#pm-file').files[0]; if (f) row.image_url = await uploadPic(f, 'products');
    if (id) must(await S.sb.from('products').update(row).eq('id', id)); else must(await S.sb.from('products').insert(row));
    toast('Saved — the website shows it right away'); closeOv(); D.go('products');
  } finally { a.disabled = false; }
};
ACT['p-del'] = async (a) => { if (!confirm('Delete this product? Old orders keep their lines.')) return; must(await S.sb.from('products').delete().eq('id', a.dataset.id)); toast('Deleted'); closeOv(); D.go('products'); };

/* ---------- Deals ---------- */
VIEWS.deals = adminOnly(async () => {
  await reloadProducts();
  const [d, st] = await Promise.all([S.sb.from('deals').select('*').order('sort').order('id'), S.sb.from('settings').select('*').eq('key', 'deals_page_size').maybeSingle()]);
  const deals = must(d), ps = Number(must(st)?.value) || 4, name = (id) => S.products.find((p) => p.id === id)?.name || '(deleted)';
  const live = (x) => x.active && (!x.starts_at || new Date(x.starts_at) <= new Date()) && (!x.ends_at || new Date(x.ends_at) > new Date());
  const shown = deals.filter(live), pages = Math.max(1, Math.ceil(shown.length / ps));
  $('#view').innerHTML = `<div class="grid g-main"><div class="card scroll"><h3>Deal list <span class="mute small">(top = first on the website)</span></h3><table class="tbl"><thead><tr><th></th><th>Product</th><th>Off</th><th>Starts</th><th>Ends</th><th>On</th><th></th></tr></thead><tbody>
  ${deals.map((x, i) => `<tr><td><button class="btn ghost sm" data-act="d-mv" data-id="${x.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button> <button class="btn ghost sm" data-act="d-mv" data-id="${x.id}" data-dir="1" ${i === deals.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></td>
    <td><b>${esc(name(x.product_id))}</b>${live(x) ? '' : ' <span class="pill s-cancelled">not live</span>'}</td><td>-${x.pct}%</td><td class="small">${x.starts_at ? fmtD(x.starts_at) : '—'}</td><td class="small">${x.ends_at ? fmtD(x.ends_at) : '—'}</td>
    <td><input type="checkbox" data-act="d-flag" data-id="${x.id}" ${x.active ? 'checked' : ''} aria-label="Active"></td><td><button class="btn ghost sm red" data-act="d-del" data-id="${x.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No deals yet</td></tr>'}</tbody></table></div>
  <div class="grid" style="align-content:start"><div class="card"><h3>Add a deal</h3><div class="f"><div class="full"><label>Product</label><select id="dn-p">${S.products.map((p) => `<option value="${p.id}">${esc(p.name)} (${money(p.price)})</option>`).join('')}</select></div>
  <div><label>% off</label><input id="dn-pct" type="number" min="1" max="90" value="20"></div><div></div><div><label>Starts (optional)</label><input id="dn-s" type="date"></div><div><label>Ends (optional)</label><input id="dn-e" type="date"></div></div><button class="btn mt" data-act="d-add">Add deal</button></div>
  <div class="card"><h3>Page layout</h3><label>Products per page on the website</label><div class="row"><input id="dn-ps" type="number" min="1" max="24" value="${ps}" style="width:90px"><button class="btn sm" data-act="d-ps">Save</button></div>
  <p class="mute small">${shown.length} live deal(s) → <b>${pages}</b> page(s). The last page holds the remaining ${shown.length - (pages - 1) * ps || 0}.</p></div></div></div>`;
  const pr = await S.sb.from('promos').select('*').order('id');
  if (!pr.error) $('#view').insertAdjacentHTML('beforeend', `<div class="card mt scroll"><h3>Free-item offers <span class="mute small">(like “Buy 5, get 1 free” — added to the order automatically; the customer pays only for the bought items)</span></h3><table class="tbl"><thead><tr><th>Offer</th><th>Rule</th><th>Free qty</th><th>Ends</th><th>On</th><th></th></tr></thead><tbody>
    ${pr.data.map((x) => `<tr><td><b>${esc(x.title || x.kind)}</b></td><td class="small">${x.kind === 'buy_get' ? `Buy ${x.buy_qty} of ${esc(name(x.product_id))} → ${x.free_qty} free` : `${x.min_lb}+ lb → ${x.free_qty} × ${esc(name(x.free_product_id))} free`}</td>
    <td><input type="number" min="1" max="99" value="${x.free_qty}" style="width:70px" data-chg="pm-qty" data-id="${x.id}"></td>
    <td><input type="date" value="${x.ends_at ? new Date(x.ends_at).toISOString().slice(0, 10) : ''}" data-chg="pm-end" data-id="${x.id}"></td>
    <td><input type="checkbox" data-act="pm-on" data-id="${x.id}" ${x.active ? 'checked' : ''} aria-label="On"></td><td><button class="btn ghost sm red" data-act="pm-del" data-id="${x.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No offers yet</td></tr>'}</tbody></table>
    <h3 class="mt">Add an offer</h3><div class="f"><div><label>Type</label><select id="pn-k"><option value="buy_get">Buy N, get some free (same product)</option><option value="free_item">Free item when the order has X lb or more</option></select></div>
    <div><label>Name shown to you</label><input id="pn-t" maxlength="80" placeholder="Buy 5 get 1 free"></div>
    <div id="pn-a"><label>Product they buy (Buy N type)</label><select id="pn-p">${S.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
    <div><label>Buy this many (Buy N type)</label><input id="pn-b" type="number" min="1" value="5"></div>
    <div><label>Minimum lb in the order (Free item type)</label><input id="pn-m" type="number" min="1" value="100"></div>
    <div><label>Free product (Free item type — leave the same as above for Buy N)</label><select id="pn-f">${S.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
    <div><label>How many free</label><input id="pn-q" type="number" min="1" max="99" value="1"></div><div><label>Ends (optional)</label><input id="pn-e" type="date"></div></div>
    <button class="btn mt" data-act="pm-add">Add offer</button>
    <p class="mute small">Clear an end date for an offer that never expires. Turn the tick off to pause an offer without deleting it.</p></div>`);
});
ACT['pm-add'] = async () => {
  const k = $('#pn-k').value, q = Math.max(1, Math.min(99, Math.round(Number($('#pn-q').value)) || 1)), e = $('#pn-e').value, t = $('#pn-t').value.trim() || (k === 'buy_get' ? 'Buy N get free' : 'Free item offer');
  const row = { kind: k, title: t, free_qty: q, ends_at: e ? new Date(e + 'T23:59:59').toISOString() : null };
  if (k === 'buy_get') { row.product_id = Number($('#pn-p').value); row.free_product_id = Number($('#pn-p').value); row.buy_qty = Math.max(1, Math.round(Number($('#pn-b').value)) || 1); }
  else { row.free_product_id = Number($('#pn-f').value); row.min_lb = Math.max(1, Number($('#pn-m').value) || 100); }
  must(await S.sb.from('promos').insert(row)); toast('Offer added — it works on the website right away'); D.go('deals');
};
ACT['pm-del'] = async (a) => { if (!confirm('Delete this offer?')) return; must(await S.sb.from('promos').delete().eq('id', a.dataset.id)); D.go('deals'); };
ACT['pm-on'] = async (a) => { must(await S.sb.from('promos').update({ active: a.checked }).eq('id', a.dataset.id)); toast('Saved'); };
ACT['pm-qty'] = async (a) => { const n = Math.max(1, Math.min(99, Math.round(Number(a.value)) || 1)); must(await S.sb.from('promos').update({ free_qty: n }).eq('id', a.dataset.id)); toast('Saved'); };
ACT['pm-end'] = async (a) => { must(await S.sb.from('promos').update({ ends_at: a.value ? new Date(a.value + 'T23:59:59').toISOString() : null }).eq('id', a.dataset.id)); toast('Saved'); };
ACT['d-add'] = async () => { const e = $('#dn-e').value, s = $('#dn-s').value;
  must(await S.sb.from('deals').insert({ product_id: Number($('#dn-p').value), pct: Number($('#dn-pct').value), starts_at: s ? new Date(s + 'T00:00:00').toISOString() : null, ends_at: e ? new Date(e + 'T23:59:59').toISOString() : null, sort: 999 })); toast('Deal added'); D.go('deals'); };
ACT['d-flag'] = async (a) => { must(await S.sb.from('deals').update({ active: a.checked }).eq('id', a.dataset.id)); toast('Saved'); D.go('deals'); };
ACT['d-del'] = async (a) => { if (!confirm('Remove this deal?')) return; must(await S.sb.from('deals').delete().eq('id', a.dataset.id)); D.go('deals'); };
ACT['d-ps'] = async () => { const n = Math.max(1, Math.min(24, Number($('#dn-ps').value) || 4)); must(await S.sb.from('settings').upsert({ key: 'deals_page_size', value: n })); toast('Saved'); D.go('deals'); };
ACT['d-mv'] = async (a) => {
  const rows = must(await S.sb.from('deals').select('id').order('sort').order('id')).map((r) => r.id), i = rows.indexOf(Number(a.dataset.id)), j = i + Number(a.dataset.dir);
  if (i < 0 || j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]];
  for (let k = 0; k < rows.length; k++) must(await S.sb.from('deals').update({ sort: k + 1 }).eq('id', rows[k])); D.go('deals');
};

/* ---------- Site text ---------- */
VIEWS.content = adminOnly(async () => {
  const rows = must(await S.sb.from('site_content').select('*').order('key')); S.content = rows;
  $('#view').innerHTML = `<div class="card"><p class="mute" style="margin-top:0">Change any wording on the website in English, Bangla and Arabic. Changes appear for visitors on their next page load. Leave a language empty to keep the built-in text.</p>
  <input id="cq" placeholder="Search text or key…" style="max-width:320px;margin-bottom:12px"><div id="cl"></div></div>`;
  const draw = () => { const q = $('#cq').value.toLowerCase(); $('#cl').innerHTML = rows.filter((r) => !q || r.key.toLowerCase().includes(q) || [r.en, r.bn, r.ar].some((x) => (x || '').toLowerCase().includes(q))).slice(0, 80).map((r) => `<div class="card" style="box-shadow:none;border:1px solid var(--line);margin-bottom:10px" data-key="${esc(r.key)}"><div class="row sp"><code class="small mute">${esc(r.key)}</code><button class="btn sm" data-act="c-save">Save</button></div>
    <div class="f mt">${['en', 'bn', 'ar'].map((l) => `<div><label>${{ en: 'English', bn: 'বাংলা', ar: 'العربية' }[l]}</label><textarea rows="2" data-l="${l}" ${l === 'ar' ? 'dir="rtl"' : ''}>${esc(r[l] || '')}</textarea></div>`).join('')}</div></div>`).join('') || '<div class="empty">Nothing found</div>'; };
  $('#cq').oninput = draw; draw();
});
ACT['c-save'] = async (a) => { const card = a.closest('[data-key]'), row = { key: card.dataset.key }; $$('[data-l]', card).forEach((t) => { row[t.dataset.l] = t.value.trim() || null; }); must(await S.sb.from('site_content').upsert(row)); toast('Text saved'); };

/* ---------- Money ---------- */
const CATS = ['Inventory / stock purchase', 'Delivery & fuel', 'Packaging', 'Rent', 'Marketing', 'Salary / driver pay', 'Equipment', 'Website & software', 'Other'];
VIEWS.money = adminOnly(async () => {
  const rows = must(await S.sb.from('expenses').select('*').order('spent_on', { ascending: false }).order('id', { ascending: false }).limit(500)); S.exp = rows;
  const ord = must(await S.sb.from('orders').select('total,created_at,status').neq('status', 'cancelled').gte('created_at', new Date(Date.now() - 190 * 864e5).toISOString()).limit(5000));
  $('#va').innerHTML = '<button class="btn ghost sm" data-act="csv-exp">⬇ Export CSV</button>';
  const months = [], now = new Date(); for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ k: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), l: d.toLocaleDateString('en-US', { month: 'short' }), s: 0, e: 0, i: 0 }); }
  const mk = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  ord.forEach((o) => { const m = months.find((x) => x.k === mk(o.created_at)); if (m) m.s += Number(o.total); });
  rows.forEach((r) => { const m = months.find((x) => x.k === r.spent_on.slice(0, 7)); if (m) m[r.kind === 'expense' ? 'e' : 'i'] += Number(r.amount); });
  const totE = rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0), totI = rows.filter((r) => r.kind === 'investment').reduce((s, r) => s + Number(r.amount), 0);
  const byCat = {}; rows.filter((r) => r.kind === 'expense').forEach((r) => { byCat[r.category || 'Other'] = (byCat[r.category || 'Other'] || 0) + Number(r.amount); });
  $('#view').innerHTML = `<div class="grid g3"><div class="card kpi"><div class="l">Expenses (all time)</div><div class="v">${money0(totE)}</div></div><div class="card kpi"><div class="l">Investment (all time)</div><div class="v">${money0(totI)}</div></div>
  <div class="card kpi"><div class="l">Sales − expenses − investment (6 mo)</div><div class="v ${months.reduce((s, m) => s + m.s - m.e - m.i, 0) >= 0 ? 'up' : 'dn'}">${money0(months.reduce((s, m) => s + m.s - m.e - m.i, 0))}</div></div></div>
  <div class="grid g-main mt"><div class="card"><h3>Sales vs expenses vs investment</h3>${D.charts.barLine(months.map((m) => m.l), months.map((m) => m.s), months.map((m) => m.e), { label: 'monthly', lineName: 'expenses' })}
  <div class="legend"><span><i style="background:var(--brand)"></i>Sales</span><span><i style="background:var(--red)"></i>Expenses</span><span class="mute">Investment this month: ${money0(months[5].i)}</span></div></div>
  <div class="card"><h3>Where money goes</h3>${D.charts.hbars(Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), money0)}</div></div>
  <div class="grid g-main mt"><div class="card scroll"><h3>Entries</h3><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th class="right">Amount</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${fmtD(r.spent_on + 'T12:00:00')}</td><td><span class="pill ${r.kind === 'investment' ? 's-confirmed' : 's-new'}">${r.kind}</span></td><td>${esc(r.category || '')}</td><td class="mute">${esc(r.note || '')}</td><td class="right"><b>${money(r.amount)}</b></td><td><button class="btn ghost sm red" data-act="e-del" data-id="${r.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing recorded yet — add your first expense →</td></tr>'}</tbody></table></div>
  <div class="card" style="align-self:start"><h3>Add entry</h3><div class="f"><div><label>Type</label><select id="ex-k"><option value="expense">Expense</option><option value="investment">Investment</option></select></div><div><label>Date</label><input id="ex-d" type="date" value="${new Date().toLocaleDateString('en-CA')}"></div>
  <div><label>Category</label><select id="ex-c">${CATS.map((c) => `<option>${c}</option>`).join('')}</select></div><div><label>Amount ($)</label><input id="ex-a" type="number" min="0" step="0.01"></div><div class="full"><label>Note</label><input id="ex-n"></div></div><button class="btn mt" data-act="e-add">Save entry</button></div></div>`;
});
ACT['e-add'] = async () => { const amt = Number($('#ex-a').value); if (!(amt > 0)) throw new Error('Enter an amount'); must(await S.sb.from('expenses').insert({ kind: $('#ex-k').value, spent_on: $('#ex-d').value, category: $('#ex-c').value, amount: amt, note: $('#ex-n').value.trim() || null, created_by: S.me.id })); toast('Saved'); D.go('money'); };
ACT['e-del'] = async (a) => { if (!confirm('Delete this entry?')) return; must(await S.sb.from('expenses').delete().eq('id', a.dataset.id)); D.go('money'); };
ACT['csv-exp'] = () => D.downloadCSV('expenses.csv', ['Date', 'Type', 'Category', 'Amount', 'Note'], (S.exp || []).map((r) => [r.spent_on, r.kind, r.category, r.amount, r.note]));

/* ---------- People ---------- */
VIEWS.people = adminOnly(async () => {
  const rows = must(await S.sb.rpc('admin_users')); S.people = rows;
  $('#va').innerHTML = '<button class="btn" data-act="u-new">+ Add user</button>';
  $('#view').innerHTML = `<div class="card"><div class="row wrap" style="margin-bottom:12px"><input id="uq" placeholder="Search name, email, phone…" style="max-width:300px"><span class="grow"></span>
  <input id="ur-e" type="email" placeholder="Email of an existing account" style="max-width:240px"><select id="ur-r" style="width:auto"><option>staff</option><option>driver</option><option>admin</option><option>customer</option></select><button class="btn sm" data-act="u-role">Set role</button></div>
  <div class="scroll"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th><th>Spent</th><th>Joined</th><th>Active</th><th></th></tr></thead><tbody id="ut"></tbody></table></div>
  <p class="mute small">Use <b>+ Add user</b> to create a staff, driver or admin account yourself (you choose a first password and give it to them). Or let them sign up on the website and use <b>Set role</b>. You cannot change your own role.</p></div>`;
  const draw = () => { const q = $('#uq').value.toLowerCase(); $('#ut').innerHTML = rows.filter((u) => !q || [u.full_name, u.email, u.phone].some((x) => (x || '').toLowerCase().includes(q))).map((u) => `<tr><td><b>${esc(u.full_name || '—')}</b><div class="mute small">${esc(u.address || '')}</div></td><td>${esc(u.email || '')}</td><td>${esc(u.phone || '')}</td>
    <td><span class="pill ${u.role === 'customer' ? '' : 's-confirmed'}">${u.role}</span></td><td>${u.orders}</td><td>${money(u.spent)}</td><td class="small">${fmtD(u.created_at)}</td><td><input type="checkbox" data-act="u-active" data-id="${u.id}" ${u.active ? 'checked' : ''} ${u.id === S.me.id ? 'disabled' : ''} aria-label="Active"></td><td><button class="btn ghost sm" data-act="u-pw" data-id="${u.id}" data-n="${esc(u.full_name || u.email || '')}">Password</button></td></tr>`).join(''); };
  $('#uq').oninput = draw; draw();
});
ACT['u-role'] = async () => { const r = must(await S.sb.rpc('admin_set_role', { p_email: $('#ur-e').value, p_role: $('#ur-r').value })); toast(`${r.email} is now ${r.role}`); D.go('people'); };
ACT['u-active'] = async (a) => { must(await S.sb.from('profiles').update({ active: a.checked }).eq('id', a.dataset.id)); toast(a.checked ? 'Account enabled' : 'Account blocked'); };

/* ---------- Settings ---------- */
const SET = [['card_small_below', 'Small card order limit ($)', 'number', 50, 'Card orders under this amount (items + delivery) get a small fee. Orders at or above it pay nothing extra.'], ['card_small_pct', 'Small card order fee (% of the limit)', 'number', 2.5, '2.5 on a $50 limit = $1.25. Set 0 to switch the fee off.'], ['delivery_fee', 'Delivery fee ($)', 'number', 9.99, 'Charged on each order (except free-delivery cases).'], ['free_delivery_lb', 'Free delivery from (lb)', 'number', 100, 'Orders with this many lb or more get free delivery.'], ['first_order_free', 'First order delivery is free', 'bool', true, 'For new customers.'], ['deals_page_size', 'Deals per page', 'number', 4, 'How many deal cards show per page on the website.'], ['card_enabled', 'Accept card payments (Stripe)', 'bool', false, 'Turn ON only after Stripe is connected (see STRIPE-SETUP.md). Customers can then choose card at checkout.'], ['card_hold_buffer_pct', 'Card hold: extra % above the order total', 'number', 15, 'Covers weight differences. The card is charged only the exact final amount; the rest is released.'], ['cod_enabled', 'Allow cash on delivery', 'bool', false, 'OFF = customers must pay by card (turn card payments ON first, or nobody can order).'], ['products_per_page', 'Products per page', 'number', 10, 'How many products show on each page of the shop (most popular first).'], ['sticky_menu', 'Keep the category menu (All, Meat, Fish…) pinned while shopping', 'bool', true, 'The menu stays at the top of the screen only while the customer is in the product section.'],
  ['anim_enabled', 'Slideshow button animations', 'bool', true, 'A short animation (fish swimming, animals walking…) plays before the page scrolls to the products.'], ['anim_meat', '— animation for Meat (chicken, desi bull, goat)', 'bool', true, ''], ['anim_fish', '— animation for Fish (swimming fish)', 'bool', true, ''], ['anim_grocery', '— animation for Grocery (rice, milk, eggs)', 'bool', true, ''], ['anim_produce', '— animation for Fresh produce (tomato, carrot, spinach)', 'bool', true, ''],
  ['max_orders_per_hour', 'Max orders per customer per hour', 'number', 8, 'Spam protection.']];
VIEWS.settings = adminOnly(async () => {
  const cur = {}; must(await S.sb.from('settings').select('*')).forEach((r) => { cur[r.key] = r.value; });
  $('#view').innerHTML = `<div class="card" style="max-width:640px"><div class="f">${SET.map(([k, l, t, d, h]) => t === 'bool' ? `<div class="full"><label class="chk"><input type="checkbox" data-s="${k}" ${(cur[k] ?? d) ? 'checked' : ''}> ${l}</label><div class="mute small">${h}</div></div>` : `<div><label>${l}</label><input data-s="${k}" type="number" step="0.01" value="${cur[k] ?? d}"><div class="mute small">${h}</div></div>`).join('')}</div><button class="btn mt" data-act="s-save">Save settings</button>
  <p class="mute small">Note: some checkout sentences on the website still say “from $9.99”; the amount actually charged always follows this page.</p></div>`;
});
ACT['s-save'] = async () => { const rows = $$('[data-s]').map((i) => ({ key: i.dataset.s, value: i.type === 'checkbox' ? i.checked : Number(i.value) })); must(await S.sb.from('settings').upsert(rows)); toast('Settings saved'); };

/* ---------- Activity ---------- */
VIEWS.activity = adminOnly(async () => {
  const rows = must(await S.sb.from('audit_log').select('*').order('at', { ascending: false }).limit(200)), who = {};
  must(await S.sb.from('profiles').select('id,full_name').in('role', ['admin', 'staff', 'driver'])).forEach((p) => { who[p.id] = p.full_name; });
  const sum = (r) => { const d = r.detail || {}, n = d.new || {}, o = d.old || {}; if (r.action === 'set_role') return `${d.email} → ${d.role}`; const keys = Object.keys(n).filter((k) => r.action === 'update').map((k) => `${k}: ${o[k] ?? '∅'} → ${n[k] ?? '∅'}`).join(', '); return keys || (n.name || n.code || o.name || o.code || r.row_id || ''); };
  $('#view').innerHTML = `<div class="card scroll"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="small">${fmtDT(r.at)}</td><td>${esc(who[r.user_id] || (r.user_id || '').slice(0, 8))}</td><td><span class="pill">${esc(r.action)} ${esc(r.table_name || '')}</span></td><td class="small mute">${esc(sum(r)).slice(0, 220)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nothing yet</td></tr>'}</tbody></table></div>`;
});

/* add a user (staff / driver / admin / customer) through the admin-users function */
const genPw = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; const a = new Uint32Array(12); crypto.getRandomValues(a); return [...a].map((n) => c[n % c.length]).join(''); };
const userCall = async (body) => {
  const { data, error } = await S.sb.functions.invoke('admin-users', { body });
  if (error) { let m = error.message; try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (e) { /* keep */ } throw new Error(m); }
  return data;
};
ACT['u-new'] = () => overlay(`<div class="modal"><button class="x" data-act="close" aria-label="Close">×</button><h2>Add user</h2>
  <div class="f mt"><div><label>Full name</label><input id="nu-n" maxlength="120" autocomplete="off"></div><div><label>Email</label><input id="nu-e" type="email" autocomplete="off"></div>
  <div><label>Phone (optional)</label><input id="nu-p" type="tel" autocomplete="off"></div>
  <div><label>Role</label><select id="nu-r"><option value="staff">Staff — handles orders</option><option value="driver">Driver — sees deliveries</option><option value="admin">Admin — full access</option><option value="customer">Customer</option></select></div>
  <div class="full"><label>First password (they can change it later)</label><div class="row"><input id="nu-w" type="text" value="${genPw()}" autocomplete="off" style="flex:1"><button class="btn ghost sm" type="button" data-act="u-gen">New</button></div></div></div>
  <div class="err" id="nu-err"></div><p class="mute small">The account is ready immediately (no email confirmation). Write the password down and give it to them — it is not shown again.</p>
  <div class="row mt"><span class="grow"></span><button class="btn" data-act="u-create">Create account</button></div></div>`, 'c');
ACT['u-gen'] = () => { $('#nu-w').value = genPw(); };
ACT['u-create'] = async (a) => {
  const e = $('#nu-err'); e.textContent = ''; a.disabled = true;
  try {
    const r = await userCall({ action: 'create', full_name: $('#nu-n').value, email: $('#nu-e').value, phone: $('#nu-p').value, role: $('#nu-r').value, password: $('#nu-w').value });
    const pw = $('#nu-w').value; closeOv(); toast(`${r.email} created as ${r.role}`);
    overlay(`<div class="modal"><h2>Account created</h2><p>Give these sign-in details to <b>${esc(r.email)}</b> (${esc(r.role)}):</p><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div>Email: <b>${esc(r.email)}</b></div><div>Password: <b>${esc(pw)}</b></div></div><p class="mute small">Staff and drivers sign in at the dashboard link. The password is not shown again.</p><div class="row mt"><span class="grow"></span><button class="btn" data-act="close">Done</button></div></div>`, 'c');
    D.go('people');
  } catch (x) { e.textContent = x.message; } finally { a.disabled = false; }
};
ACT['u-pw'] = async (a) => {
  const pw = prompt(`New password for ${a.dataset.n} (8 or more characters):`, genPw()); if (pw === null) return;
  if (pw.length < 8) throw new Error('Use at least 8 characters');
  await userCall({ action: 'set_password', user_id: a.dataset.id, password: pw }); toast('Password changed — tell them the new one');
};
})();
