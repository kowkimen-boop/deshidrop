# Deshi Drop — database setup (Supabase)

This folder is the "brain" behind the website: customers, orders, products, prices, deals, website text and pictures.
You do this once. Menu names in Supabase change now and then, so if a name below differs slightly, look for the closest one.

## 1. Create the tables (5 minutes)
1. Open your project at supabase.com → **SQL Editor** → **New query**.
2. Open `schema.sql` from this folder, copy **everything**, paste it in, press **Run**. You should see "Success".
3. New query again → paste all of `seed.sql` → **Run**. This loads your current products, deals and every website text (English, Bangla, Arabic).
   - Running either file a second time is safe. `seed.sql` never overwrites changes you made later in the dashboard.

## 2. Tell Supabase where your website lives
**Authentication → URL Configuration**
- **Site URL**: your website address, for example `https://yourname.github.io/your-repo/` (or your own domain later).
- **Redirect URLs**: add the same address, with `/*` at the end. If you also test on your computer, add `http://localhost:8123/*`.
Without this, "confirm your email" and "reset password" links won't bring people back to your site.

## 3. Turn on sign-in
**Authentication → Providers (or Sign In / Up)**
- **Email**: ON. This gives you real sign-up, sign-in and "forgot password".
- **Confirm email**: your choice. ON = customers must click an email link before they can order (safer, but the free plan limits how many emails Supabase sends per hour). OFF = instant sign-up, easier for testing.
- Google / Facebook login are optional; they need their own app set-up first. Email works without them.

## 4. Copy the two public keys into the website
**Project Settings → API**
- **Project URL** (looks like `https://abcdxyz.supabase.co`)
- **anon public** key (a long text starting with `eyJ…`)

Paste both into `js/backend-config.js` in the website files. These two are *meant* to be visible in a website — the security rules in `schema.sql` are what protect your data.

> **Never share or paste the `service_role` key** (also on that page). It skips all security. Do not put it in the website, in GitHub, or in a chat.

## 5. Make yourself the admin
1. Open your website and **sign up** with your own email (and confirm the email if you left that on).
2. Back in **SQL Editor**, run this with your real email:
```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOU@example.com');
```
3. Sign out and in again on the website. You are now the admin.

## 6. Add staff and drivers
Ask them to sign up on the website like a customer. Then, signed in as admin (or in the SQL Editor), run:
```sql
select admin_set_role('person@example.com', 'driver');   -- or 'staff'
```
The dashboard will do this with one click later. To stop someone: `update profiles set active = false where id = (select id from auth.users where email = '...');`

| Role | Can do |
|---|---|
| customer | Browse, order, see their own orders |
| driver | See only orders assigned to them; mark out for delivery / delivered |
| staff | See all orders with name, phone and address; change status, assign drivers. Cannot change prices, totals, site content or see finances |
| admin | Everything, including expenses, audit log and roles |

## What the database protects
- Prices are calculated **on the server** when an order is placed. A browser cannot send its own price.
- A customer cannot make themselves admin; staff cannot edit order totals; drivers only see their own deliveries.
- Every change to products, deals, texts, settings and orders is written to `audit_log` (admins can read it).
- "Cash on delivery" works now. Card payments are switched off until the payment step (Stripe) is built.

## Settings you can change (table `settings`)
`delivery_fee` (9.99) · `free_delivery_lb` (100) · `first_order_free` (true) · `deals_page_size` (4) · `max_orders_per_hour` (8, per account — stops order spam).
Change them in **Table Editor → settings**, e.g. `update settings set value = '12.5'::jsonb where key = 'delivery_fee';`

## Pictures
`schema.sql` creates a public storage bucket called **media**. Only admins can upload. Put the picture's web address in `products.image_url` (the dashboard will do this for you).

## Re-creating the seed file
If you change products or texts in the website code and want a fresh `seed.sql`: `node tools/make_seed.mjs` (see the top of that file).

## Tests (optional, for developers)
`cd supabase/tests && npm i && npm test` runs 120+ checks against a temporary in-memory database: who can read/change what, order pricing, delivery rules, roles and the audit log.
