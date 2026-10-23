/* Dashboard views: Overview (charts), Orders, New order, Deliveries */
(() => {
'use strict';
const D = window.__DDA, { S, $, $$, esc, money, money0, STATUS, FLOW, dayKey, fmtDT, photo, toast, must, fail, ACT, VIEWS, overlay, closeOv, isAdmin } = D;
const mapUrl = (a) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a || '');
const live = (o) => o.status !== 'cancelled' && !(o.pay_method === 'card' && o.pay_status === 'unpaid');

/* ---------- tiny SVG charts (no libraries, so the strict security policy stays strict) ---------- */
function barLine(labels, bars, line, o = {}) {
  const W = 680, H = 250, L = 44, R = 12, T = 12, B = 28, iw = W - L - R, ih = H - T - B;
  const max = Math.max(1, ...bars, ...(line || [0])) * 1.12, n = labels.length, bw = Math.max(2, iw / n * 0.6);
  const x = (i) => L + (i + 0.5) * iw / n, y = (v) => T + ih - v / max * ih;
  let g = ''; for (let i = 0; i <= 4; i++) { const v = max / 1.12 * i / 4, yy = y(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)}</text>`; }
  const step = Math.ceil(n / 8); labels.forEach((l, i) => { if (i % step === 0) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
  bars.forEach((v, i) => { g += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, T + ih - y(v))}" rx="3" fill="var(--brand)"><title>${esc(labels[i])}: ${money(v)}</title></rect>`; });
  if (line) { g += `<polyline fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linejoin="round" points="${line.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`; line.forEach((v, i) => { if (v > 0) g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--red)"><title>${esc(labels[i])}: ${money(v)} ${esc(o.lineName || '')}</title></circle>`; }); }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'chart')}">${g}</svg>`;
}
function donut(parts) {
  const tot = parts.reduce((s, p) => s + p.v, 0); if (!tot) return '<div class="empty">No data yet</div>';
  let acc = 0; const r = 52, c = 2 * Math.PI * r;
  const arcs = parts.filter((p) => p.v > 0).map((p) => { const len = p.v / tot * c, s = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)"><title>${esc(p.l)}: ${p.v}</title></circle>`; acc += len; return s; }).join('');
  return `<div class="row wrap"><svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="breakdown">${arcs}<text x="70" y="75" text-anchor="middle" style="font:800 20px Manrope;fill:var(--ink)">${tot}</text></svg>
  <div class="legend" style="flex-direction:column;gap:6px;margin:0">${parts.map((p) => `<span><i style="background:${p.c}"></i>${esc(p.l)} · <b>${p.v}</b></span>`).join('')}</div></div>`;
}
function hbars(rows, fmt) {
  if (!rows.length) return '<div class="empty">No sales in this period</div>'; const max = Math.max(...rows.map((r) => r.v));
  return rows.map((r) => `<div style="margin:9px 0"><div class="row sp small"><span>${esc(r.l)}</span><b>${fmt(r.v)}</b></div><div class="bar"><i style="width:${Math.max(3, r.v / max * 100)}%"></i></div></div>`).join('');
}
D.charts = { barLine, donut, hbars };

/* ---------- Overview ---------- */
VIEWS.overview = async () => {
  const days = S.range, now = new Date(), start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);
  $('#va').innerHTML = `<div class="seg" id="rg">${[7, 30, 90, 365].map((d) => `<button data-act="range" data-d="${d}" class="${d === days ? 'on' : ''}">${d === 365 ? '1y' : d + 'd'}</button>`).join('')}</div>`;
  const [ord, exp, items] = await Promise.all([
    S.sb.from('orders').select('id,code,status,total,subtotal,delivery_fee,pay_method,pay_status,created_at,customer_name').gte('created_at', prevStart.toISOString()).order('created_at', { ascending: false }).limit(5000),
    isAdmin() ? S.sb.from('expenses').select('*').gte('spent_on', dayKey(prevStart)).limit(5000) : Promise.resolve({ data: [] }),
    S.sb.from('order_items').select('name,qty,unit_price,photo_key,image_url,orders!inner(created_at,status)').gte('orders.created_at', start.toISOString()).neq('orders.status', 'cancelled').limit(5000)
  ]);
  const orders = must(ord), expenses = must(exp), its = must(items);
  const cur = orders.filter((o) => new Date(o.created_at) >= start), prev = orders.filter((o) => new Date(o.created_at) < start);
  const sum = (a, f) => a.reduce((s, x) => s + Number(f(x) || 0), 0);
  const salesC = sum(cur.filter(live), (o) => o.total), salesP = sum(prev.filter(live), (o) => o.total);
  const cntC = cur.filter(live).length, cntP = prev.filter(live).length;
  const exC = expenses.filter((e) => e.spent_on >= dayKey(start)), exP = expenses.filter((e) => e.spent_on < dayKey(start));
  const spendC = sum(exC.filter((e) => e.kind === 'expense'), (e) => e.amount), spendP = sum(exP.filter((e) => e.kind === 'expense'), (e) => e.amount);
  const invC = sum(exC.filter((e) => e.kind === 'investment'), (e) => e.amount);
  const delta = (a, b, inv) => { if (!b) return a ? '<span class="d">new</span>' : '<span class="d">—</span>'; const p = (a - b) / b * 100; const good = inv ? p < 0 : p >= 0; return `<span class="d ${good ? 'up' : 'dn'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}% vs previous ${days}d</span>`; };
  const labels = [], sales = [], spend = [], idx = {};
  for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(d.getDate() + i); const k = dayKey(d); idx[k] = i; labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })); sales.push(0); spend.push(0); }
  cur.filter(live).forEach((o) => { const i = idx[dayKey(o.created_at)]; if (i !== undefined) sales[i] += Number(o.total); });
  exC.filter((e) => e.kind === 'expense').forEach((e) => { const i = idx[e.spent_on]; if (i !== undefined) spend[i] += Number(e.amount); });
  const byProd = {}; its.forEach((i) => { byProd[i.name] = (byProd[i.name] || 0) + Number(i.qty) * Number(i.unit_price); });
  const top = Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v]) => ({ l, v }));
  const stCol = { new: '#d98a00', confirmed: '#2f6fb0', packing: '#7a5bc4', out_for_delivery: '#16a0a0', delivered: '#1c6b3c', cancelled: '#c8202f' };
  const st = Object.keys(STATUS).map((k) => ({ l: STATUS[k], v: cur.filter((o) => o.status === k).length, c: stCol[k] }));
  const cod = cur.filter((o) => live(o) && o.pay_method === 'cod').length, card = cntC - cod;
  const profit = salesC - spendC;
  $('#view').innerHTML = `<div class="grid g4">
    <div class="card kpi hl"><div class="l">Sales</div><div class="v">${money0(salesC)}</div>${delta(salesC, salesP)}</div>
    <div class="card kpi"><div class="l">Orders</div><div class="v">${cntC}</div>${delta(cntC, cntP)}<div class="small mute">avg ${money(cntC ? salesC / cntC : 0)}</div></div>
    ${isAdmin() ? `<div class="card kpi"><div class="l">Expenses</div><div class="v">${money0(spendC)}</div>${delta(spendC, spendP, true)}</div>
    <div class="card kpi"><div class="l">Profit (sales − expenses)</div><div class="v ${profit >= 0 ? 'up' : 'dn'}">${money0(profit)}</div><div class="small mute">Investment in period: ${money0(invC)}</div></div>`
      : `<div class="card kpi"><div class="l">Waiting to start</div><div class="v">${cur.filter((o) => o.status === 'new').length}</div><div class="small mute">new orders</div></div><div class="card kpi"><div class="l">Out for delivery</div><div class="v">${cur.filter((o) => o.status === 'out_for_delivery').length}</div></div>`}
  </div>
  <div class="grid g-main mt"><div class="card"><h3>Sales per day${isAdmin() ? ' <span class="mute small">(red line = expenses)</span>' : ''}</h3>${barLine(labels, sales, isAdmin() ? spend : null, { label: 'Sales per day', lineName: 'expenses' })}
    <div class="legend"><span><i style="background:var(--brand)"></i>Sales</span>${isAdmin() ? '<span><i style="background:var(--red)"></i>Expenses</span>' : ''}</div></div>
    <div class="card"><h3>Orders by status</h3>${donut(st)}<h3 class="mt">Payment</h3>${donut([{ l: 'Cash on delivery', v: cod, c: '#d98a00' }, { l: 'Card', v: card, c: '#2f6fb0' }])}</div></div>
  <div class="grid g2 mt"><div class="card"><h3>Best sellers (by revenue)</h3>${hbars(top, money0)}</div>
    <div class="card"><h3>Latest orders</h3>${cur.slice(0, 6).map((o) => `<div class="row sp" style="padding:7px 0;border-bottom:1px solid var(--line)"><div><b>${esc(o.code)}</b> <span class="mute small">${esc(o.customer_name)} · ${fmtDT(o.created_at)}</span></div><div><span class="pill s-${o.status}">${STATUS[o.status]}</span> <b>${money(o.total)}</b></div></div>`).join('') || '<div class="empty">No orders yet</div>'}
    <div class="mt"><button class="btn ghost sm" data-nav="orders">All orders →</button></div></div></div>`;
};
ACT.range = (a) => { S.range = Number(a.dataset.d); D.go('overview'); };

/* ---------- Orders ---------- */
let OF = { st: 'all', q: '' }, drivers = [];
VIEWS.orders = async () => {
  const [o, dr] = await Promise.all([S.sb.from('orders').select('*, order_items(id,name,qty,unit_price,list_price,photo_key,image_url)').order('created_at', { ascending: false }).limit(500), S.sb.from('profiles').select('id,full_name').eq('role', 'driver')]);
  S.orders = must(o); drivers = must(dr); S.orders.forEach((r) => S.seen.add(r.id));
  $('#va').innerHTML = isAdmin() ? '<button class="btn ghost sm" data-act="csv-orders">⬇ Export CSV</button>' : '';
  drawOrders();
};
function drawOrders() {
  const q = OF.q.toLowerCase(), list = S.orders.filter((o) => (OF.st === 'all' || o.status === OF.st) && (!q || [o.code, o.customer_name, o.phone, o.address].some((x) => (x || '').toLowerCase().includes(q))));
  const cnt = (k) => k === 'all' ? S.orders.length : S.orders.filter((o) => o.status === k).length;
  $('#view').innerHTML = `<div class="row wrap" style="margin-bottom:12px"><div class="seg">${['all', ...Object.keys(STATUS)].map((k) => `<button data-act="ofilter" data-k="${k}" class="${OF.st === k ? 'on' : ''}">${k === 'all' ? 'All' : STATUS[k]} ${cnt(k)}</button>`).join('')}</div>
    <input id="oq" placeholder="Search code, name, phone, address…" value="${esc(OF.q)}" style="max-width:300px"></div>
    <div class="card scroll"><table class="tbl"><thead><tr><th>Order</th><th>Items</th><th>Customer</th><th>Total</th><th>Pay</th><th>Status</th><th>Placed</th></tr></thead><tbody>
    ${list.map((o) => `<tr class="click" data-act="odetail" data-id="${o.id}"><td><b>${esc(o.code)}</b></td>
      <td><div class="thumbs">${(o.order_items || []).slice(0, 4).map((i) => `<img class="thumb" src="${esc(photo(i))}" alt="" loading="lazy">`).join('')}</div></td>
      <td>${esc(o.customer_name)}<div class="mute small">${esc(o.phone || '')}</div></td><td><b>${money(o.total)}</b></td>
      <td><span class="pill">${o.pay_method === 'cod' ? 'COD' : 'Card'} · ${esc(o.pay_status)}</span></td><td><span class="pill s-${o.status}">${STATUS[o.status]}</span></td><td class="mute small">${fmtDT(o.created_at)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No orders match</td></tr>'}</tbody></table></div>`;
  const qi = $('#oq'); qi.oninput = () => { OF.q = qi.value; const p = qi.selectionStart; drawOrders(); const n = $('#oq'); n.focus(); n.setSelectionRange(p, p); };
}
ACT.ofilter = (a) => { OF.st = a.dataset.k; drawOrders(); };
ACT.odetail = (a) => orderDrawer(a.dataset.id);
function orderDrawer(id) {
  const o = S.orders.find((x) => x.id === id) || S.mine?.find((x) => x.id === id); if (!o) return;
  const items = o.order_items || [];
  const canDrive = D.isStaff();
  const ov = overlay(`<div class="drawer"><button class="x" data-act="close" aria-label="Close">×</button><h2>${esc(o.code)}</h2>
    <div class="row wrap" style="margin:8px 0"><span class="pill s-${o.status}">${STATUS[o.status]}</span><span class="mute small">${fmtDT(o.created_at)}${o.delivered_at ? ' · delivered ' + fmtDT(o.delivered_at) : ''}</span></div>
    <dl class="kv"><dt>Customer</dt><dd><b>${esc(o.customer_name)}</b></dd><dt>Phone</dt><dd>${o.phone ? `<a href="tel:${esc(o.phone.replace(/[^\d+]/g, ''))}">${esc(o.phone)}</a>` : '—'}</dd>
    <dt>Address</dt><dd>${esc(o.address || '—')} ${o.address ? `<a href="${mapUrl(o.address)}" target="_blank" rel="noopener noreferrer">map ↗</a>` : ''}</dd>${o.notes ? `<dt>Notes</dt><dd>${esc(o.notes)}</dd>` : ''}</dl>
    <h3>Items</h3>${items.map((i) => `<div class="item"><img class="thumb" src="${esc(photo(i))}" alt=""><div class="grow"><b>${esc(i.name)}</b><div class="mute small">${Number(i.qty)} × ${money(i.unit_price)}${Number(i.list_price) > Number(i.unit_price) ? ` <s>${money(i.list_price)}</s>` : ''}</div></div><b>${money(i.qty * i.unit_price)}</b></div>`).join('')}
    <div class="row sp mt small"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="row sp small"><span>Delivery</span><span>${money(o.delivery_fee)}</span></div><div class="row sp"><b>Total</b><b style="font-size:20px">${money(o.total)}</b></div>
    ${o.pay_method === 'card' && (o.stripe_payment_intent || o.pay_status === 'unpaid') ? cardBox(o) : ''}
    ${canDrive ? `<h3 class="mt">Update</h3><div class="row wrap">${FLOW.map((k) => `<button class="btn sm ${o.status === k ? '' : 'ghost'}" data-act="ostatus" data-id="${o.id}" data-s="${k}">${STATUS[k]}</button>`).join('')}<button class="btn red sm" data-act="ostatus" data-id="${o.id}" data-s="cancelled">Cancel order</button></div>
    <div class="f mt"><div><label>Driver</label><select id="od-dr"><option value="">— none —</option>${drivers.map((d) => `<option value="${d.id}" ${o.driver_id === d.id ? 'selected' : ''}>${esc(d.full_name || d.id.slice(0, 6))}</option>`).join('')}</select></div>
    ${o.pay_method === 'card' ? '' : `<div><label>Payment</label><select id="od-ps">${['unpaid', 'paid', 'refunded', 'failed'].map((s) => `<option ${o.pay_status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`}</div>
    <div class="row mt"><button class="btn sm" data-act="osave" data-id="${o.id}">Save driver & payment</button>${isAdmin() ? `<button class="btn red sm ghost" data-act="odelete" data-id="${o.id}">Delete order</button>` : ''}</div>` : ''}</div>`);
  return ov;
}
const cardBox = (o) => {
  const st = o.pay_status, brand = o.card_brand ? `${esc(o.card_brand)} ••${esc(o.card_last4 || '')}` : '';
  const info = { unpaid: ['s-new', 'Awaiting card payment — the customer has not finished paying yet.'], authorized: ['s-confirmed', `Card hold placed: ${money(o.authorized_amount)} held. Charge the final amount after weighing.`], paid: ['s-delivered', `Paid by card: ${money(o.captured_amount)} charged.`], refunded: ['s-cancelled', 'Refunded or hold released.'], failed: ['s-cancelled', 'Hold expired or failed.'] }[st] || ['', st];
  let btns = '';
  if (isAdmin() && st === 'authorized') btns = `<button class="btn sm" data-act="card-cap" data-id="${o.id}">Charge ${money(Math.min(Number(o.total), Number(o.authorized_amount)))}</button><button class="btn ghost sm" data-act="card-cap" data-id="${o.id}" data-ask="1">Charge other amount…</button><button class="btn red ghost sm" data-act="card-rel" data-id="${o.id}">Release hold</button>`;
  else if (isAdmin() && st === 'paid') btns = `<button class="btn red ghost sm" data-act="card-ref" data-id="${o.id}">Refund full amount</button>`;
  else if (st === 'authorized') btns = '<span class="mute small">Only the owner can charge the card.</span>';
  return `<div class="card" style="box-shadow:none;border:1px solid var(--line);margin-top:14px"><div class="row sp"><b>💳 Card payment ${brand}</b><span class="pill ${info[0]}">${esc(st)}</span></div><p class="small mute" style="margin:8px 0">${esc(info[1])}</p><div class="row wrap">${btns}</div></div>`;
};
const payCall = async (body, okMsg) => {
  const { data, error } = await S.sb.functions.invoke('capture-payment', { body });
  if (error) { let m = error.message; try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (e) { /* keep */ } throw new Error(m); }
  toast(okMsg(data)); closeOv(); D.go(S.view);
};
ACT['card-cap'] = async (a) => {
  let amount; if (a.dataset.ask) { const v = prompt('Final amount to charge ($). It cannot be more than the amount held.'); if (v === null) return; amount = Number(v); if (!(amount > 0)) throw new Error('Enter an amount'); }
  a.disabled = true; try { await payCall({ order_id: a.dataset.id, action: 'capture', amount }, (r) => 'Charged ' + money(r.charged)); } finally { a.disabled = false; }
};
ACT['card-rel'] = async (a) => { if (!confirm('Release the hold? The customer will not be charged.')) return; await payCall({ order_id: a.dataset.id, action: 'release' }, () => 'Hold released'); };
ACT['card-ref'] = async (a) => { if (!confirm('Refund the full amount to the customer’s card?')) return; await payCall({ order_id: a.dataset.id, action: 'refund' }, () => 'Refunded'); };
ACT.ostatus = async (a) => {
  const oo = S.orders.find((x) => x.id === a.dataset.id) || (S.mine || []).find((x) => x.id === a.dataset.id);
  if (oo && oo.pay_method === 'card' && oo.pay_status === 'unpaid' && a.dataset.s !== 'cancelled' && !confirm('This card order has not been paid yet. Continue anyway?')) return;
  if (a.dataset.s === 'cancelled' && !confirm('Cancel this order?')) return;
  must(await S.sb.rpc('driver_set_status', { p_order: a.dataset.id, p_status: a.dataset.s }));
  toast('Status updated'); closeOv(); D.go(S.view);
};
ACT.osave = async (a) => {
  const patch = { driver_id: $('#od-dr').value || null }; if ($('#od-ps')) patch.pay_status = $('#od-ps').value;
  must(await S.sb.from('orders').update(patch).eq('id', a.dataset.id));
  toast('Saved'); closeOv(); D.go(S.view);
};
ACT.odelete = async (a) => { if (!confirm('Delete this order permanently? Sales totals will change.')) return; must(await S.sb.from('orders').delete().eq('id', a.dataset.id)); toast('Deleted'); closeOv(); D.go('orders'); };
const csvCell = (v) => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
D.downloadCSV = (name, head, rows) => { const b = new Blob([[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
ACT['csv-orders'] = () => D.downloadCSV('orders.csv', ['Code', 'Date', 'Customer', 'Phone', 'Address', 'Status', 'Payment', 'Pay status', 'Subtotal', 'Delivery', 'Total', 'Items'],
  S.orders.map((o) => [o.code, o.created_at, o.customer_name, o.phone, o.address, o.status, o.pay_method, o.pay_status, o.subtotal, o.delivery_fee, o.total, (o.order_items || []).map((i) => i.qty + 'x ' + i.name).join('; ')]));

/* ---------- New (manual) order ---------- */
VIEWS.neworder = async () => {
  const opts = S.products.map((p) => `<option value="${esc(p.name)}">${esc(p.name)} — ${money(p.price)}</option>`).join('');
  $('#view').innerHTML = `<div class="card"><p class="mute" style="margin-top:0">For phone calls, WhatsApp orders and walk-ins. Prices and deals are applied automatically, just like website orders.</p>
  <div class="f"><div><label>Customer name *</label><input id="no-name"></div><div><label>Phone</label><input id="no-phone" inputmode="tel"></div><div class="full"><label>Address</label><input id="no-addr"></div></div>
  <h3 class="mt">Items</h3><div id="no-items"></div><button class="btn ghost sm" data-act="no-add">+ Add item</button>
  <div class="f mt"><div><label>Payment</label><select id="no-pay"><option value="cod">Cash on delivery</option><option value="card">Card (taken elsewhere)</option></select></div>
  <div><label>Payment status</label><select id="no-ps"><option>unpaid</option><option>paid</option></select></div>
  <div><label>Order status</label><select id="no-st">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === 'confirmed' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
  ${isAdmin() ? '<div><label>Delivery fee (blank = standard)</label><input id="no-fee" inputmode="decimal"></div>' : ''}<div class="full"><label>Notes</label><input id="no-notes"></div></div>
  <div class="row sp mt"><div><span class="mute">Estimate: </span><b id="no-tot">$0.00</b></div><button class="btn" data-act="no-save">Create order</button></div></div>`;
  D.__noOpts = opts; ACT['no-add'](); $('#view').addEventListener('input', noTotal); $('#view').addEventListener('change', noTotal);
};
function noTotal() {
  let t = 0; $$('#no-items .item').forEach((r) => { const p = S.products.find((x) => x.name === $('select', r).value); const q = Number($('input', r).value) || 0; if (p) t += q * (p.salePrice || p.price); });
  const el = $('#no-tot'); if (el) el.textContent = money(t) + ' + delivery';
}
ACT['no-add'] = () => { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<select class="grow">${D.__noOpts}</select><input type="number" min="0.1" step="0.1" value="1" style="width:90px" aria-label="Quantity"><button class="btn ghost sm" data-act="no-del" aria-label="Remove">✕</button>`; $('#no-items').appendChild(d); noTotal(); };
ACT['no-del'] = (a) => { a.closest('.item').remove(); noTotal(); };
ACT['no-save'] = async (a) => {
  const items = $$('#no-items .item').map((r) => ({ name: $('select', r).value, qty: Number($('input', r).value) }));
  const fee = $('#no-fee') && $('#no-fee').value.trim() !== '' ? Number($('#no-fee').value) : null;
  a.disabled = true;
  try {
    const r = must(await S.sb.rpc('admin_create_order', { p_items: items, p_name: $('#no-name').value, p_phone: $('#no-phone').value, p_address: $('#no-addr').value, p_notes: $('#no-notes').value || null, p_pay: $('#no-pay').value, p_pay_status: $('#no-ps').value, p_status: $('#no-st').value, p_fee: fee }));
    toast(`Order ${r.code} created — ${money(r.total)}`); D.go('orders');
  } finally { a.disabled = false; }
};

/* ---------- Driver: my deliveries ---------- */
VIEWS.deliveries = async () => {
  const rows = must(await S.sb.from('orders').select('*, order_items(id,name,qty,unit_price,photo_key,image_url)').eq('driver_id', S.me.id).order('created_at', { ascending: false }).limit(60));
  S.mine = rows; const open = rows.filter((o) => !['delivered', 'cancelled'].includes(o.status)), done = rows.filter((o) => o.status === 'delivered').slice(0, 10);
  const card = (o) => `<div class="card"><div class="row sp"><b>${esc(o.code)}</b><span class="pill s-${o.status}">${STATUS[o.status]}</span></div>
    <div class="row mt"><div class="thumbs">${(o.order_items || []).slice(0, 5).map((i) => `<img class="thumb" src="${esc(photo(i))}" alt="">`).join('')}</div><span class="mute small">${(o.order_items || []).map((i) => i.qty + '× ' + esc(i.name)).join(', ')}</span></div>
    <dl class="kv"><dt>Customer</dt><dd><b>${esc(o.customer_name)}</b></dd><dt>Phone</dt><dd>${o.phone ? `<a href="tel:${esc(o.phone.replace(/[^\d+]/g, ''))}">${esc(o.phone)}</a>` : '—'}</dd><dt>Address</dt><dd>${esc(o.address)} <a href="${mapUrl(o.address)}" target="_blank" rel="noopener noreferrer">navigate ↗</a></dd>${o.notes ? `<dt>Notes</dt><dd>${esc(o.notes)}</dd>` : ''}<dt>Collect</dt><dd><b>${o.pay_method === 'cod' && o.pay_status !== 'paid' ? money(o.total) + ' cash' : 'Already paid'}</b></dd></dl>
    ${['delivered', 'cancelled'].includes(o.status) ? '' : `<div class="row">${o.status !== 'out_for_delivery' ? `<button class="btn" data-act="ostatus" data-id="${o.id}" data-s="out_for_delivery">Start delivery</button>` : ''}<button class="btn" data-act="ostatus" data-id="${o.id}" data-s="delivered">Mark delivered</button></div>`}</div>`;
  $('#view').innerHTML = `<div class="grid g2">${open.map(card).join('') || '<div class="card empty">No deliveries assigned to you right now 🎉</div>'}</div>${done.length ? '<h3 class="mt">Recently delivered</h3><div class="grid g2">' + done.map(card).join('') + '</div>' : ''}`;
};
})();
