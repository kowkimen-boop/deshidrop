/* Tests the three Stripe Edge Functions with a fake Supabase REST + fake Stripe API (no network). Run: node functions.test.mjs */
import { createHmac } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url'; import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const ENV = { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', SITE_ORIGINS: 'https://shop.example.com, https://me.github.io' };
let handler; globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h; } };
const OID = '11111111-1111-1111-1111-111111111111', OID2 = '22222222-2222-2222-2222-222222222222';
const mkOrder = (id, over = {}) => ({ id, code: 'DD-' + id.slice(0, 4), user_id: 'u-bob', pay_method: 'card', pay_status: 'unpaid', status: 'new', total: 100, delivery_fee: 9.99, subtotal: 90.01, stripe_payment_intent: null, authorized_amount: null, ...over });
let orders, stripeCalls, users = { 'tok-bob': { id: 'u-bob' }, 'tok-admin': { id: 'u-admin' }, 'tok-staff': { id: 'u-staff' } };
const profiles = { 'u-admin': { role: 'admin', active: true }, 'u-staff': { role: 'staff', active: true }, 'u-bob': { role: 'customer', active: true } };
const reset = () => { orders = [mkOrder(OID), mkOrder(OID2, { pay_status: 'authorized', stripe_payment_intent: 'pi_2', authorized_amount: 115 })]; stripeCalls = []; };
const q = (u) => Object.fromEntries(new URL(u).searchParams.entries());
const matches = (o, p) => Object.entries(p).every(([k, v]) => { if (['select'].includes(k)) return true; const [op, val] = [v.slice(0, v.indexOf('.')), v.slice(v.indexOf('.') + 1)]; return op === 'eq' && String(o[k]) === decodeURIComponent(val); });
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const H = init.headers || {}, j = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (url.endsWith('/auth/v1/user')) { const u = users[(H.Authorization || '').replace('Bearer ', '')]; return u ? j(u) : j({}, 401); }
  if (url.includes('/rest/v1/orders')) { const p = q(url);
    if (!init.method || init.method === 'GET') return j(orders.filter((o) => matches(o, p)));
    orders.filter((o) => matches(o, p)).forEach((o) => Object.assign(o, JSON.parse(init.body))); return j([]); }
  if (url.includes('/rest/v1/settings')) return j([{ value: 15 }]);
  if (url.includes('/rest/v1/profiles')) { const id = q(url).id.replace('eq.', ''); return j(profiles[id] ? [profiles[id]] : []); }
  if (url.startsWith('https://api.stripe.com/v1/')) { const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : {}; stripeCalls.push({ path: url.replace('https://api.stripe.com/v1/', ''), body, auth: H.Authorization, idem: H['Idempotency-Key'] });
    if (globalThis.__stripeFail) return j({ error: { message: 'card_declined' } }, 402);
    return j(url.endsWith('/sessions') ? { id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' } : { id: 'x' }); }
  return j({}, 404);
};
const load = async (name) => { await import(pathToFileURL(path.resolve(here, '../functions', name, 'index.ts')).href + '?t=' + Math.random()); return handler; };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗ FAIL:', m); };
const call = (h, body, { tok = 'tok-bob', origin = 'https://shop.example.com', method = 'POST' } = {}) => h(new Request('https://f/x', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, Origin: origin }, body: method === 'POST' ? JSON.stringify(body) : undefined }));

console.log('\n# create-checkout');
let h = await load('create-checkout'); reset();
let r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/deshidrop/index.html?x=1#/y' }); let b = await r.json();
ok(r.status === 200 && b.url.startsWith('https://checkout.stripe.com/'), 'returns a Stripe Checkout URL');
const s = stripeCalls[0]; ok(s.body['payment_intent_data[capture_method]'] === 'manual', 'uses capture_method=manual (hold only)');
ok(s.body['line_items[0][price_data][unit_amount]'] === '11500', 'hold = total $100 + 15% = $115.00 in cents');
ok(s.body.success_url === 'https://shop.example.com/deshidrop/index.html?card=ok#/account' && s.body.metadata + '' !== undefined && s.body['metadata[order_id]'] === OID, 'success url + order id metadata');
ok(orders[0].stripe_session_id === 'cs_1', 'session id saved on the order');
reset(); r = await call(h, { order_id: OID, return_url: 'https://evil.com/' }); ok(r.status === 400, 'return address on another site refused');
r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }, { origin: 'https://evil.com' }); ok(r.status === 403, 'request from another website refused');
r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }, { tok: 'nope' }); ok(r.status === 401, 'not signed in refused');
r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }, { tok: 'tok-staff' }); ok(r.status === 404, "cannot pay someone else's order");
reset(); orders[0].pay_method = 'cod'; r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }); ok(r.status === 409, 'cash order cannot be paid by card');
reset(); orders[0].pay_status = 'paid'; r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }); ok(r.status === 409, 'already-paid order refused');
reset(); r = await call(h, { order_id: 'x; drop', return_url: 'https://shop.example.com/' }); ok(r.status === 400, 'bad order id refused');
reset(); globalThis.__stripeFail = true; r = await call(h, { order_id: OID, return_url: 'https://shop.example.com/' }); ok(r.status === 502 && !JSON.stringify(await r.json()).includes('sk_'), 'Stripe failure → clean error, no secrets'); globalThis.__stripeFail = false;
r = await h(new Request('https://f/x', { method: 'OPTIONS', headers: { Origin: 'https://me.github.io' } })); ok(r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === 'https://me.github.io', 'CORS preflight allows only listed sites');

console.log('\n# stripe-webhook');
h = await load('stripe-webhook'); reset();
const sign = (raw, t = Math.floor(Date.now() / 1000), secret = 'whsec_test') => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;
const hook = (ev, sig) => { const raw = JSON.stringify(ev); return h(new Request('https://f/w', { method: 'POST', headers: { 'stripe-signature': sig === undefined ? sign(raw) : sig }, body: raw })); };
const done = { type: 'checkout.session.completed', data: { object: { metadata: { order_id: OID }, payment_intent: 'pi_1', amount_total: 11500, payment_status: 'unpaid' } } };
r = await hook(done, 'garbage'); ok(r.status === 400 && orders[0].pay_status === 'unpaid', 'bad signature rejected, order untouched');
r = await h(new Request('https://f/w', { method: 'POST', headers: { 'stripe-signature': sign('{"a":1}', 1000) }, body: '{"a":1}' })); ok(r.status === 400, 'old (replayed) signature rejected');
r = await h(new Request('https://f/w', { method: 'POST', body: JSON.stringify(done) })); ok(r.status === 400, 'missing signature rejected');
r = await hook(done, sign(JSON.stringify(done), undefined, 'whsec_wrong')); ok(r.status === 400, 'wrong secret rejected');
r = await hook(done); ok(r.status === 200 && orders[0].pay_status === 'authorized' && orders[0].stripe_payment_intent === 'pi_1' && orders[0].authorized_amount === 115, 'valid event → order authorized with PI + amount');
orders[0].pay_status = 'paid'; r = await hook(done); ok(orders[0].pay_status === 'paid', 'repeat delivery does not overwrite a paid order');
r = await hook({ type: 'payment_intent.canceled', data: { object: { id: 'pi_2' } } }); ok(orders[1].pay_status === 'failed', 'expired hold → failed');
orders[1].pay_status = 'paid'; r = await hook({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_2' } } }); ok(orders[1].pay_status === 'refunded', 'refund made in Stripe → refunded');
r = await hook({ type: 'something.else', data: { object: {} } }); ok(r.status === 200, 'unknown events acknowledged');
r = await h(new Request('https://f/w', { method: 'GET' })); ok(r.status === 405, 'GET refused');

console.log('\n# capture-payment');
h = await load('capture-payment'); reset();
r = await call(h, { order_id: OID2, amount: 98.5 }, { tok: 'tok-bob' }); ok(r.status === 403, 'customer cannot capture');
r = await call(h, { order_id: OID2, amount: 98.5 }, { tok: 'tok-staff' }); ok(r.status === 403, 'staff cannot capture');
r = await call(h, { order_id: OID2, amount: 120 }, { tok: 'tok-admin' }); ok(r.status === 400 && /most you can charge/.test((await r.json()).error), 'cannot charge more than the hold');
r = await call(h, { order_id: OID2, amount: 0.1 }, { tok: 'tok-admin' }); ok(r.status === 400, 'under $0.50 refused');
r = await call(h, { order_id: OID2, amount: 98.5 }, { tok: 'tok-admin' }); b = await r.json();
const cap = stripeCalls.find((c) => c.path === 'payment_intents/pi_2/capture');
ok(r.status === 200 && b.charged === 98.5 && cap.body.amount_to_capture === '9850', 'captures the final weighed amount (9850 cents)');
ok(orders[1].pay_status === 'paid' && orders[1].captured_amount === 98.5 && orders[1].total === 98.5 && orders[1].subtotal === 88.51, 'order updated: paid, total = charged, subtotal adjusted');
r = await call(h, { order_id: OID2, amount: 50 }, { tok: 'tok-admin' }); ok(r.status === 409, 'cannot capture twice');
reset(); r = await call(h, { order_id: OID2, action: 'release' }, { tok: 'tok-admin' }); ok(r.status === 200 && stripeCalls.some((c) => c.path === 'payment_intents/pi_2/cancel') && orders[1].pay_status === 'refunded', 'release hold cancels the PaymentIntent');
reset(); orders[1].pay_status = 'paid'; r = await call(h, { order_id: OID2, action: 'refund' }, { tok: 'tok-admin' }); ok(r.status === 200 && stripeCalls.some((c) => c.path === 'refunds' && c.body.payment_intent === 'pi_2') && orders[1].pay_status === 'refunded', 'refund works on a paid order');
reset(); r = await call(h, { order_id: OID2, action: 'refund' }, { tok: 'tok-admin' }); ok(r.status === 409, 'cannot refund an unpaid/held order');
reset(); r = await call(h, { order_id: OID }, { tok: 'tok-admin' }); ok(r.status === 404, 'order without a payment → not found');
reset(); r = await call(h, { order_id: OID2, amount: 10 }, { tok: 'tok-admin', origin: 'https://evil.com' }); ok(r.status === 403, 'other website refused');
reset(); globalThis.__stripeFail = true; r = await call(h, { order_id: OID2, amount: 50 }, { tok: 'tok-admin' }); ok(r.status === 502 && orders[1].pay_status === 'authorized', 'Stripe error → order stays authorized'); globalThis.__stripeFail = false;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
