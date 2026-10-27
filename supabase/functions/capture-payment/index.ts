// Deshi Drop — capture-payment (ADMIN only). Charge the final amount of a held card order, release the hold, or refund.
// Called from Dashboard -> Orders. Secrets: STRIPE_SECRET_KEY, SITE_ORIGINS.
const env = (k: string) => Deno.env.get(k) || '';
const SB = env('SUPABASE_URL'), SK = env('SUPABASE_SERVICE_ROLE_KEY'), STRIPE = env('STRIPE_SECRET_KEY');
const origins = env('SITE_ORIGINS').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
const cors = (req: Request) => { const o = req.headers.get('Origin') || ''; return { 'Access-Control-Allow-Origin': origins.includes(o) ? o : 'null', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' }; };
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const rest = (path: string, init: RequestInit = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } });
const stripe = (path: string, form: Record<string, string>, idem: string) => fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${STRIPE}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idem }, body: new URLSearchParams(form) });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);
  try {
    if (!STRIPE || !SB || !SK) return json(req, { error: 'Payments are not configured yet' }, 503);
    if (!origins.includes(req.headers.get('Origin') || '')) return json(req, { error: 'Not allowed' }, 403);
    const ur = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: SK, Authorization: req.headers.get('Authorization') || '' } });
    if (!ur.ok) return json(req, { error: 'Please sign in again' }, 401);
    const user = await ur.json();
    const prof = (await (await rest(`profiles?id=eq.${user.id}&select=role,active`)).json())[0];
    if (!prof || prof.role !== 'admin' || !prof.active) return json(req, { error: 'Admins only' }, 403);

    const b = await req.json().catch(() => ({}));
    const action = String(b.action || 'capture'), id = String(b.order_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['capture', 'release', 'refund'].includes(action)) return json(req, { error: 'Bad request' }, 400);
    const o = (await (await rest(`orders?id=eq.${id}&select=id,code,pay_method,pay_status,stripe_payment_intent,authorized_amount,total,delivery_fee`)).json())[0];
    if (!o || o.pay_method !== 'card' || !o.stripe_payment_intent) return json(req, { error: 'Not a card order with a payment' }, 404);
    const pi = o.stripe_payment_intent;

    if (action === 'capture') {
      if (o.pay_status !== 'authorized') return json(req, { error: 'Only a held payment can be charged' }, 409);
      const amount = b.amount === undefined || b.amount === null ? Number(o.total) : Number(b.amount);
      const cents = Math.round(amount * 100), hold = Math.round(Number(o.authorized_amount) * 100);
      if (!(cents >= 50)) return json(req, { error: 'Amount must be at least $0.50' }, 400);
      if (cents > hold) return json(req, { error: `The most you can charge is $${(hold / 100).toFixed(2)} (the amount held on the card)` }, 400);
      const r = await stripe(`payment_intents/${pi}/capture`, { amount_to_capture: String(cents) }, `cap-${o.id}-${cents}`);
      const s = await r.json();
      if (!r.ok) return json(req, { error: (s.error && s.error.message) || 'Stripe error' }, 502);
      const total = cents / 100, sub = Math.max(0, Math.round((total - Number(o.delivery_fee)) * 100) / 100);
      await rest(`orders?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ pay_status: 'paid', captured_amount: total, total, subtotal: sub }) });
      return json(req, { ok: true, charged: total });
    }
    if (action === 'release') {
      if (o.pay_status !== 'authorized') return json(req, { error: 'Only a held payment can be released' }, 409);
      const r = await stripe(`payment_intents/${pi}/cancel`, {}, `rel-${o.id}`);
      const s = await r.json();
      if (!r.ok) return json(req, { error: (s.error && s.error.message) || 'Stripe error' }, 502);
      await rest(`orders?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ pay_status: 'refunded' }) });
      return json(req, { ok: true, released: true });
    }
    if (o.pay_status !== 'paid') return json(req, { error: 'Only a paid order can be refunded' }, 409);
    const r = await stripe('refunds', { payment_intent: pi }, `ref-${o.id}`);
    const s = await r.json();
    if (!r.ok) return json(req, { error: (s.error && s.error.message) || 'Stripe error' }, 502);
    await rest(`orders?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ pay_status: 'refunded' }) });
    return json(req, { ok: true, refunded: true });
  } catch (_e) { return json(req, { error: 'Something went wrong' }, 500); }
});
