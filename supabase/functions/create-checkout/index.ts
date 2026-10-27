// Deshi Drop — create-checkout. A signed-in customer asks to pay a CARD order. We open a Stripe Checkout page that only
// puts a HOLD on the card (capture_method=manual). The final amount is charged later, after the order is weighed.
// Settings (Edge Functions -> Secrets): STRIPE_SECRET_KEY, SITE_ORIGINS (comma list, e.g. https://deshiee.com,https://x.github.io)
const env = (k: string) => Deno.env.get(k) || '';
const SB = env('SUPABASE_URL'), SK = env('SUPABASE_SERVICE_ROLE_KEY'), STRIPE = env('STRIPE_SECRET_KEY');
const origins = env('SITE_ORIGINS').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

const cors = (req: Request) => {
  const o = req.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': origins.includes(o) ? o : 'null', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
};
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const rest = (path: string, init: RequestInit = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);
  try {
    if (!STRIPE || !SB || !SK) return json(req, { error: 'Payments are not configured yet' }, 503);
    const reqOrigin = req.headers.get('Origin') || '';
    if (!origins.includes(reqOrigin)) return json(req, { error: 'This site is not allowed to start a payment' }, 403);

    const ur = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: SK, Authorization: req.headers.get('Authorization') || '' } });
    if (!ur.ok) return json(req, { error: 'Please sign in again' }, 401);
    const user = await ur.json();

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json(req, { error: 'Bad order' }, 400);
    let returnUrl: URL;
    try { returnUrl = new URL(String(body.return_url || '')); } catch { return json(req, { error: 'Bad return address' }, 400); }
    if (!origins.includes(returnUrl.origin)) return json(req, { error: 'Return address not allowed' }, 400);
    returnUrl.hash = ''; returnUrl.search = '';

    const o = (await (await rest(`orders?id=eq.${orderId}&select=id,code,user_id,pay_method,pay_status,status,total,delivery_fee`)).json())[0];
    if (!o || o.user_id !== user.id) return json(req, { error: 'Order not found' }, 404);
    if (o.pay_method !== 'card' || o.pay_status !== 'unpaid' || o.status === 'cancelled') return json(req, { error: 'This order cannot be paid by card' }, 409);

    const st = await (await rest('settings?key=eq.card_hold_buffer_pct&select=value')).json();
    const pct = Math.min(50, Math.max(0, Number(st[0] && st[0].value) || 15));
    const estimate = Number(o.total), hold = Math.round(estimate * (1 + pct / 100) * 100);
    if (!(hold >= 50)) return json(req, { error: 'Amount too small' }, 400);

    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('success_url', `${returnUrl.toString()}?card=ok#/account`);
    f.set('cancel_url', `${returnUrl.toString()}?card=cancel#/account`);
    f.set('client_reference_id', o.code);
    f.set('metadata[order_id]', o.id); f.set('payment_intent_data[metadata][order_id]', o.id); f.set('payment_intent_data[metadata][code]', o.code);
    f.set('payment_intent_data[capture_method]', 'manual');
    f.set('payment_intent_data[description]', `Deshi Drop order ${o.code}`);
    f.set('line_items[0][quantity]', '1');
    f.set('line_items[0][price_data][currency]', 'usd');
    f.set('line_items[0][price_data][unit_amount]', String(hold));
    f.set('line_items[0][price_data][product_data][name]', `Deshi Drop order ${o.code} — card hold`);
    f.set('line_items[0][price_data][product_data][description]', `Estimated total $${estimate.toFixed(2)}. We hold up to $${(hold / 100).toFixed(2)} on your card and charge only the exact final amount after your order is weighed. The rest is released.`);
    const sr = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${STRIPE}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `co-${o.id}-${hold}` }, body: f });
    const s = await sr.json();
    if (!sr.ok || !s.url) return json(req, { error: (s.error && s.error.message) || 'Stripe error' }, 502);
    await rest(`orders?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ stripe_session_id: s.id }) });
    return json(req, { url: s.url });
  } catch (e) { return json(req, { error: 'Something went wrong' }, 500); }
});
