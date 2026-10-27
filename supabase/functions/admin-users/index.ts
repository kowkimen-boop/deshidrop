// Deshi Drop — admin-users (ADMIN only). Create a staff / driver / admin / customer account from Dashboard -> People, or reset someone's password.
// Secrets needed: SITE_ORIGINS (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically).
const env = (k: string) => Deno.env.get(k) || '';
const SB = env('SUPABASE_URL'), SK = env('SUPABASE_SERVICE_ROLE_KEY');
const origins = env('SITE_ORIGINS').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
const cors = (req: Request) => { const o = req.headers.get('Origin') || ''; return { 'Access-Control-Allow-Origin': origins.includes(o) ? o : 'null', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' }; };
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const rest = (path: string, init: RequestInit = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } });
const ROLES = ['customer', 'driver', 'staff', 'admin'];
const authAdmin = (path: string, init: RequestInit = {}) => fetch(`${SB}/auth/v1/admin/${path}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);
  try {
    if (!SB || !SK) return json(req, { error: 'Not configured yet' }, 503);
    if (!origins.includes(req.headers.get('Origin') || '')) return json(req, { error: 'Not allowed' }, 403);
    const ur = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: SK, Authorization: req.headers.get('Authorization') || '' } });
    if (!ur.ok) return json(req, { error: 'Please sign in again' }, 401);
    const me = await ur.json();
    const prof = (await (await rest(`profiles?id=eq.${me.id}&select=role,active`)).json())[0];
    if (!prof || prof.role !== 'admin' || !prof.active) return json(req, { error: 'Admins only' }, 403);

    const b = await req.json().catch(() => ({}));
    const action = String(b.action || 'create');
    const pw = String(b.password || '');
    if (pw.length < 8 || pw.length > 72) return json(req, { error: 'The password must be 8 to 72 characters' }, 400);

    if (action === 'create') {
      const email = String(b.email || '').trim().toLowerCase(), name = String(b.full_name || '').trim().slice(0, 120), phone = String(b.phone || '').trim().slice(0, 40), role = String(b.role || 'staff');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return json(req, { error: 'Enter a valid email address' }, 400);
      if (!name) return json(req, { error: 'Enter the person\'s name' }, 400);
      if (!ROLES.includes(role)) return json(req, { error: 'Unknown role' }, 400);
      const r = await authAdmin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true, user_metadata: { full_name: name, phone } }) });
      const u = await r.json();
      if (!r.ok) return json(req, { error: /already|registered|exists/i.test(JSON.stringify(u)) ? 'There is already an account with that email. Use "Set role" for it instead.' : 'Could not create the account' }, r.status === 422 ? 409 : 502);
      await rest('profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: u.id, role, full_name: name, phone: phone || null, active: true }) });
      await rest(`profiles?id=eq.${u.id}`, { method: 'PATCH', body: JSON.stringify({ role, full_name: name, phone: phone || null }) });
      await rest('audit_log', { method: 'POST', body: JSON.stringify({ user_id: me.id, action: 'create_user', table_name: 'profiles', row_id: u.id, detail: { email, role } }) });
      return json(req, { ok: true, id: u.id, email, role });
    }
    if (action === 'set_password') {
      const id = String(b.user_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(req, { error: 'Bad request' }, 400);
      const r = await authAdmin(`users/${id}`, { method: 'PUT', body: JSON.stringify({ password: pw }) });
      if (!r.ok) return json(req, { error: 'Could not change the password' }, 502);
      await rest('audit_log', { method: 'POST', body: JSON.stringify({ user_id: me.id, action: 'set_password', table_name: 'profiles', row_id: id, detail: {} }) });
      return json(req, { ok: true });
    }
    return json(req, { error: 'Bad request' }, 400);
  } catch (_e) { return json(req, { error: 'Something went wrong' }, 500); }
});
