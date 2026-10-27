// Deshi Drop — stripe-webhook. Stripe calls this when a card hold succeeds, expires or is refunded.
// IMPORTANT: in Supabase turn OFF "Verify JWT" for this function (Stripe has no Supabase login); we verify Stripe's signature instead.
// Secrets: STRIPE_WEBHOOK_SECRET (whsec_...). Stripe events to send: checkout.session.completed, checkout.session.expired, payment_intent.canceled, charge.refunded
const env = (k: string) => Deno.env.get(k) || '';
const SB = env('SUPABASE_URL'), SK = env('SUPABASE_SERVICE_ROLE_KEY'), WH = env('STRIPE_WEBHOOK_SECRET');
const rest = (path: string, body: unknown) => fetch(`${SB}/rest/v1/${path}`, { method: 'PATCH', headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body) });

async function verify(raw: string, header: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1)]; }));
  const t = Number(parts.t); const v1 = header.split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WH), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1.some((s) => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (!WH || !SB || !SK) return new Response('not configured', { status: 503 });
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get('stripe-signature') || ''))) return new Response('bad signature', { status: 400 });
  const ev = JSON.parse(raw), obj = ev.data && ev.data.object || {};
  try {
    if (ev.type === 'checkout.session.completed') {
      const id = obj.metadata && obj.metadata.order_id;
      if (/^[0-9a-f-]{36}$/i.test(id || '') && obj.payment_intent) {
        // Only an order still "unpaid" can become "authorized" (makes repeated deliveries harmless).
        await rest(`orders?id=eq.${id}&pay_status=eq.unpaid`, { pay_status: obj.payment_status === 'paid' ? 'paid' : 'authorized', stripe_payment_intent: obj.payment_intent, authorized_amount: (obj.amount_total || 0) / 100 });
      }
    } else if (ev.type === 'checkout.session.expired') {
      // the customer never finished paying: cancel the unpaid card order so it does not sit in the dashboard
      const id = obj.metadata && obj.metadata.order_id;
      if (/^[0-9a-f-]{36}$/i.test(id || '')) await rest(`orders?id=eq.${id}&pay_status=eq.unpaid&stripe_payment_intent=is.null`, { status: 'cancelled' });
    } else if (ev.type === 'payment_intent.canceled') {
      // a hold that Stripe expired (about 7 days). Holds released by our own function are already marked.
      await rest(`orders?stripe_payment_intent=eq.${encodeURIComponent(obj.id)}&pay_status=eq.authorized`, { pay_status: 'failed' });
    } else if (ev.type === 'charge.refunded' && obj.payment_intent) {
      await rest(`orders?stripe_payment_intent=eq.${encodeURIComponent(obj.payment_intent)}&pay_status=eq.paid`, { pay_status: 'refunded' });
    }
  } catch (_e) { return new Response('error', { status: 500 }); }   // Stripe will retry
  return new Response('ok', { status: 200 });
});
