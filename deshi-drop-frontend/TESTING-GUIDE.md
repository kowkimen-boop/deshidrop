# Deshi Drop — Phase 1 backend: what's new and how to test it

## What's new in this version
- **Database design** (`supabase/schema.sql`): customers, roles (admin / staff / driver / customer), products, deals, website text (English · Bangla · Arabic), settings, orders, order items, expenses, activity log, picture storage. Security rules are built in.
- **Your current website loaded into it** (`supabase/seed.sql`): 24 products, 8 deals, 89 website texts, 4 settings.
- **Real accounts**: sign up, sign in, sign out, "forgot password" email, Google/Facebook sign-in (optional).
- **Real orders** with cash on delivery: the *server* works out the prices, the deal discount and the delivery fee. Customers see their orders in their account.
- **Website reads from the database**: change a product, price, deal or text in Supabase → refresh the site → it changes. No re-upload.
- **Safe fallback**: if `js/backend-config.js` is empty (or Supabase is down), the website runs on its built-in content exactly like before.

## Not built yet (be aware)
Admin dashboard with charts (phase 3) · card payments with Stripe (phase 2) · choosing weight in lb and re-weighing orders · email/SMS alerts · picture upload screen · drivers' page. Until the dashboard exists, you edit data in Supabase **Table Editor** (it looks like a spreadsheet). Text inside the cart and account pages is still in the code, not in the database.

---
## Part A — Set it up (about 15 minutes)
Follow `supabase/README.md` steps 1–5. In short:
1. Supabase → **SQL Editor** → paste `supabase/schema.sql` → Run. Then paste `supabase/seed.sql` → Run.
2. **Authentication → URL Configuration**: Site URL = your website address (https://kowkimen-boop.github.io/…), plus the same address with `/*` as a Redirect URL.
3. **Authentication → Providers → Email**: turn **Confirm email OFF while testing** (instant signup). Turn it ON before launch.
4. **Project Settings → API**: copy *Project URL* and *anon public* key into `js/backend-config.js`. Upload all files to GitHub.
5. Sign up on your site, then in SQL Editor run: `update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Part B — Test checklist (tick each one)
**1. Content comes from the database**
- [ ] Open the site: products show (24 in "All"). Open the browser console (F12 → Console): no red errors.
- [ ] Table Editor → `products` → change a price → refresh the site → new price shows.
- [ ] `products` → set `in_stock` to false → that card shows "Sold out" with no "+" button. Set it back.
- [ ] `site_content` → row `cs2_h` → edit the `en` column → refresh → first carousel headline changes. Edit `bn` / `ar` and switch language to check.
- [ ] `deals` → change a `pct` → refresh → the ribbon and price change. `settings` → `deals_page_size` = 2 → the Deals section now has more pages.

**2. Accounts**
- [ ] Account → Sign Up with a real email you can open. (If confirmation is ON, click the link in the email, then sign in.)
- [ ] Sign out, sign in again. A wrong password shows "Email or password is incorrect."
- [ ] "Forgot password?" with your email → email arrives → link returns to the site and asks for a **new password** → save → you are signed in.
- [ ] Supabase → Authentication → Users: your account is listed; `profiles` has a row with role = customer.

**3. Ordering (cash on delivery)**
- [ ] Add 2–3 items → cart → Checkout → address + phone → **Place order**. Message shows an order code (DD-XXXXXX), total, "delivery free" (first order).
- [ ] Account → Orders shows it with status "Received".
- [ ] Supabase → `orders` and `order_items`: name, phone, address, items, prices are there.
- [ ] Place a **second** order: delivery fee should be $9.99 (unless 100+ lb). Put a deal item in the cart: the deal price is charged.
- [ ] In `orders`, change `status` to `out_for_delivery`, then `delivered` → refresh Account → the status updates.

**4. Security spot-checks** (signed in as a normal customer; F12 → Console)
- [ ] `await DDB.client.from('orders').select('*')` → only YOUR orders.
- [ ] `await DDB.client.from('profiles').update({role:'admin'}).eq('id', DDB.user.id)` → must **not** make you admin (error, or role unchanged).
- [ ] `await DDB.client.from('expenses').select('*')` → empty list / no access.
- [ ] Signed out (private window): `DDB.client.from('orders').select('*')` → empty. Products are readable (that's intended).

**5. Roles**
- [ ] Sign up two more accounts. In SQL Editor: `select admin_set_role('a@x.com','staff');` and `select admin_set_role('b@x.com','driver');`.
- [ ] As staff: can see all orders (with phone + address) but the browser cannot change totals. As driver: sees only orders whose `driver_id` is their id.

**6. Offline fallback**
- [ ] Temporarily empty both values in `js/backend-config.js` → the site works with built-in products and a local demo account (as before).

If something fails, tell me which line number above and what you saw (a screenshot of the Console helps).

## Automated checks I already ran
- **Database** (`supabase/tests`, `npm i && npm test`): 122 checks pass in a temporary Postgres — who can read/write what, price and delivery-fee calculation, role limits, audit log.
- **Website** (simulated Supabase in a headless browser): content loading, sold-out, text overrides, sign-up with email confirmation, sign-in, wrong password, forgot/reset password, checkout, orders list, Google button, sign-out; plus the original offline mode.
- **Not tested by me:** your real Supabase project (I don't have access). That is what Part B checks.
