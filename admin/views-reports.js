/* Reports — daily / weekly / monthly sales vs expenses (admin + staff see sales; expenses admin only) */
(() => {
const D = window.__DDA, { S, $, $$, esc, money, VIEWS, ACT, must, dayKey } = D;
const live = (o) => o.status !== 'cancelled' && !(o.pay_method === 'card' && o.pay_status === 'unpaid');
const R = { mode: 'day', data: null };
async function pageAll(make) { let out = [], from = 0; for (;;) { const rows = must(await make().range(from, from + 999)); out = out.concat(rows); if (rows.length < 1000) break; from += 1000; if (from > 50000) break; } return out; }
const monday = (d) => { d = new Date(d); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const keyOf = (mode, t) => { const d = new Date(t); if (mode === 'day') return dayKey(d); if (mode === 'week') return dayKey(monday(d)); return dayKey(d).slice(0, 7); };
const label = (mode, k) => { if (mode === 'month') { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
  const d = new Date(k + 'T12:00:00'); if (mode === 'day') return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const e = new Date(d); e.setDate(e.getDate() + 6); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
function buckets(mode) {
  const n = mode === 'day' ? 31 : mode === 'week' ? 16 : 12, now = new Date(), ks = [];
  for (let i = 0; i < n; i++) { const d = new Date(now); if (mode === 'day') d.setDate(d.getDate() - i); else if (mode === 'week') d.setDate(d.getDate() - 7 * i); else { d.setDate(1); d.setMonth(d.getMonth() - i); } ks.push(keyOf(mode, d)); }
  return ks;
}
function paint() {
  const { orders, exp } = R.data, mode = R.mode, adm = D.isAdmin();
  const rows = buckets(mode).map((k) => ({ k, n: 0, s: 0, e: 0, i: 0 })), by = Object.fromEntries(rows.map((r) => [r.k, r]));
  orders.filter(live).forEach((o) => { const r = by[keyOf(mode, o.created_at)]; if (r) { r.n++; r.s += Number(o.total); } });
  exp.forEach((x) => { const r = by[keyOf(mode, x.spent_on + 'T12:00:00')]; if (r) r[x.kind === 'expense' ? 'e' : 'i'] += Number(x.amount); });
  const sum = (f) => rows.reduce((t, r) => t + f(r), 0), S_ = sum((r) => r.s), E_ = sum((r) => r.e), I_ = sum((r) => r.i), N_ = sum((r) => r.n);
  R.rows = rows;
  const title = { day: 'last 31 days', week: 'last 16 weeks (Mon–Sun)', month: 'last 12 months' }[mode];
  $('#rp-body').innerHTML = `<div class="grid g3"><div class="card kpi"><div class="l">Sales — ${title}</div><div class="v">${money(S_)}</div><div class="small mute">${N_} orders</div></div>
    ${adm ? `<div class="card kpi"><div class="l">Expenses</div><div class="v">${money(E_)}</div><div class="small mute">Investment ${money(I_)}</div></div>
    <div class="card kpi"><div class="l">Profit (sales − expenses)</div><div class="v ${S_ - E_ >= 0 ? 'up' : 'dn'}">${money(S_ - E_)}</div><div class="small mute">After investment ${money(S_ - E_ - I_)}</div></div>` : ''}</div>
    <div class="card mt" style="overflow-x:auto"><table class="tbl"><thead><tr><th>${mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'Month'}</th><th style="text-align:right">Orders</th><th style="text-align:right">Sales</th>${adm ? '<th style="text-align:right">Expenses</th><th style="text-align:right">Investment</th><th style="text-align:right">Profit</th>' : ''}</tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(label(mode, r.k))}</td><td style="text-align:right">${r.n}</td><td style="text-align:right">${money(r.s)}</td>${adm ? `<td style="text-align:right">${money(r.e)}</td><td style="text-align:right">${money(r.i)}</td><td style="text-align:right"><b class="${r.s - r.e >= 0 ? 'up' : 'dn'}">${money(r.s - r.e)}</b></td>` : ''}</tr>`).join('')}
    </tbody><tfoot><tr><th>Total</th><th style="text-align:right">${N_}</th><th style="text-align:right">${money(S_)}</th>${adm ? `<th style="text-align:right">${money(E_)}</th><th style="text-align:right">${money(I_)}</th><th style="text-align:right">${money(S_ - E_)}</th>` : ''}</tr></tfoot></table></div>`;
  $$('#rp-tabs [data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
}
VIEWS.reports = async () => {
  const since = new Date(Date.now() - 400 * 864e5);
  const orders = await pageAll(() => S.sb.from('orders').select('total,created_at,status,pay_method,pay_status').gte('created_at', since.toISOString()).order('created_at'));
  const exp = D.isAdmin() ? await pageAll(() => S.sb.from('expenses').select('kind,amount,spent_on').gte('spent_on', dayKey(since)).order('spent_on')) : [];
  R.data = { orders, exp };
  $('#va').innerHTML = '<button class="btn ghost sm" data-act="rp-csv">⬇ Export CSV</button>';
  $('#view').innerHTML = `<div class="row" id="rp-tabs" role="tablist" style="margin-bottom:12px"><button class="btn ghost sm" data-act="rp-mode" data-m="day">Daily</button><button class="btn ghost sm" data-act="rp-mode" data-m="week">Weekly</button><button class="btn ghost sm" data-act="rp-mode" data-m="month">Monthly</button></div><div id="rp-body"></div>`;
  paint();
};
ACT['rp-mode'] = (a) => { R.mode = a.dataset.m; paint(); };
ACT['rp-csv'] = () => D.downloadCSV(`report-${R.mode}.csv`, ['Period', 'Orders', 'Sales', 'Expenses', 'Investment', 'Profit'], (R.rows || []).map((r) => [label(R.mode, r.k), r.n, r.s.toFixed(2), r.e.toFixed(2), r.i.toFixed(2), (r.s - r.e).toFixed(2)]));
})();
