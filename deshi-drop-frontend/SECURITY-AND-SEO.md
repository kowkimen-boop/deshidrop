# Deshi Drop — Security & SEO

No website can be made "unhackable", but this setup closes the common doors.

## What is already done
**Security**
- Passwords/logins are handled by Supabase (never stored by this site). Database rules (RLS) mean customers can only see their own orders; only admin/staff see everyone's. 126 automated tests check this.
- All product/text coming from the database is escaped (blocks script injection / XSS).
- Content-Security-Policy: only your own scripts, Supabase, and (optional) Google/Stripe may run. Set both in `index.html` and in `.htaccess`.
- `.htaccess`: forces HTTPS, HSTS, no clickjacking (X-Frame-Options/frame-ancestors), nosniff, referrer + permissions policy, directory listing off, blocks `.sql/.md/.mjs/.env` files and the `supabase/` and `tools/` folders.
- Supabase SDK is hosted on your own site (no third-party script).
- Order spam limit: max 8 orders/hour per customer (setting `max_orders_per_hour`), and text-size caps.
- `security.txt` so researchers can report problems.

**SEO**: title/description, canonical URL, Open Graph + Twitter card (share image), LocalBusiness JSON-LD (Google rich result), sitemap.xml, robots.txt, favicon/app icons, manifest, hidden H1, noscript text, 404 page, gzip + caching.

## Do these yourself (most important)
1. **Turn on 2-factor** for GoDaddy, Supabase, Stripe, GitHub and your email. Most real hacks are stolen passwords.
2. Use long unique passwords (a password manager). Make only *your* account admin; give staff the `staff` role only.
3. In Supabase: Auth → turn on "Confirm email", enable leaked-password protection, set Site URL + Redirect URLs to your real domain only.
4. Never put the Supabase **service_role** key or Stripe **secret** key in this site — only the anon key (it is meant to be public).
5. Turn on free SSL in cPanel (AutoSSL) and GoDaddy domain lock + auto-renew.
6. Keep backups: cPanel backup monthly; Supabase → Database → Backups.
7. Cloudflare (free) in front of the domain adds DDoS/bot protection — optional but recommended.

## Go-live steps
1. `node tools/set_site.mjs https://YOURDOMAIN` (replaces the placeholder domain in SEO files).
2. `node tools/build_dist.mjs` → upload the **contents** of `dist/` to `public_html` (include the hidden `.htaccess`).
3. Edit `js/backend-config.js` with your Supabase URL + anon key (before step 2).
4. Check: securityheaders.com and ssllabs.com (aim for A), then add the site to Google Search Console and submit `sitemap.xml`.
5. Create a Google Business Profile for "Deshi Drop" (Warren, MI) — biggest local-SEO win.

## Known limits
- `style-src 'unsafe-inline'` is kept because the page uses inline styles; scripts are strict.
- Real card payments (Stripe) come in phase 2 and need server-side keys in Supabase Edge Functions.
- If you use cPanel hosting without mod_headers, the meta-tag CSP in `index.html` still applies.
