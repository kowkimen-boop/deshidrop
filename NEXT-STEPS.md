# Deshi Drop — what to do now (covers the last 4 updates, in order)

> **Newest round (update 4)** is at the very bottom: dark mode, Slideshow control, animations, pinned menu, no cash on delivery, offers manager. Do Steps 1–5 first, then that section.

The three updates you have not tested yet:
1. **Site pictures + Change password** (dashboard)
2. **Card payments with Stripe**
3. **This update**: search overlay, address suggestions, 10 products per page (most popular first), fish and shrimp, new slides and offers, auto-translate, category dropdown, Add user, menu auto-hide.

Do the steps top to bottom. Each step says how to check it worked.

---
## Step 1 — Put the new files on GitHub
Upload the contents of the new zip over your repository (same as last time: GitHub → Add file → Upload files). GitHub accepts fewer than 100 files per upload, so send them in batches: `index.html`, then `css`, then `js`, then `admin`, then `img`, then `gallery`. You do not need to upload `supabase`, `tools` or `node_modules` (keep them on your computer).
Wait about 1 minute, then open the site and press **Ctrl+Shift+R** (phone: close the tab and open again).
*Check:* the slideshow now has 9 slides and the **Fish** button no longer says "Soon".

## Step 2 — Update the database (Supabase → SQL Editor)
Paste ONLY the SQL text (no ``` lines). Run these files in this order. Anything you already ran earlier is safe to run again.
1. `supabase/phase3.sql` (only if you never ran it)
2. `supabase/phase2.sql` (card payments; only if you never ran it)
3. `supabase/seed.sql` — adds the 16 fish and shrimp products and the new slide texts. Your existing prices and edits are NOT overwritten.
4. `supabase/phase5.sql` — free-item offers, "most popular first", and the cash-on-delivery switch. **Run it after the seed.** If you already ran an older phase5.sql, run this new one again — it is safe. If you see a yellow "destructive operations" warning, click **Run query**: it only replaces rules on the new `promos` table.
*Check:* Supabase → Table Editor → `products` now has 40 rows; the table `promos` has 2 rows.
If the editor says the file is too large, split `seed.sql` in half at a line that starts with `insert into` and run the halves one after the other.

## Step 3 — Deploy the two Edge Functions
Supabase → Edge Functions → *Deploy a new function* → *Via Editor*.
- `admin-users` ← paste `supabase/functions/admin-users/index.ts`. Leave **Verify JWT ON**. (New in this update: lets you create staff/driver/admin accounts.)
- If you have not done the Stripe update yet: `create-checkout`, `capture-payment`, `stripe-webhook` (webhook has Verify JWT **OFF**). Full instructions: `STRIPE-SETUP.md`.
Supabase → Edge Functions → Secrets: make sure `SITE_ORIGINS` = `https://kowkimen-boop.github.io` (origin only, no `/deshidrop`, no trailing slash). `admin-users` needs only this one.

## Step 4 — Stripe (from update 2) — only when you are ready for cards
Follow `STRIPE-SETUP.md` steps 1, 2, 5, 6, 7, 8. Stay in **Test mode** until a test order works: pay with card `4242 4242 4242 4242`, any future date, any CVC. Card payments stay hidden from customers until you tick *Dashboard → Settings → Accept card payments*.

---
## Step 5 — Test checklist (tick each)

### Update 1 · Site pictures + Change password (Dashboard)
- [ ] Sign in at `/admin/`. Menu → **Change password**: wrong current password is refused, a correct change works, you can sign in with the new one.
- [ ] **Site pictures**: replace the logo → the website logo changes after a refresh.
- [ ] Replace one slideshow photo (there are now 18 slots, including the three new offer slides) → it shows on the site.
- [ ] Gallery: replace, hide and add one photo.

### Update 2 · Card payments
- [ ] Settings → tick *Accept card payments*. On the site, checkout shows "Cash on delivery / Pay by card".
- [ ] Test order by card → returns to My Orders → Dashboard → Orders shows **Card hold placed**.
- [ ] **Charge** the exact amount (try a lower amount too). Stripe → Payments shows it.
- [ ] Another test order → **Release hold**. Another → **Charge** then **Refund**.

### Update 3 · This update
**Phone (test on your real phone):**
- [ ] Tap the search box at the top → it opens full screen with the keyboard. Type "shr" → suggestions with a picture and the price; tap **+** to add to cart. **Cancel** closes it.
- [ ] Products show **10 per page** with 1 2 3 4 below; page 1 has the best sellers (until real orders exist it uses the "Popular" tags). Switch between All / Meat / Fish and the pager resets to page 1.
- [ ] **Fish** button shows the fish and shrimp (no "coming soon").
- [ ] Slideshow: Chicken offer, Koliza offer, Fish, Catering ("Ask about catering" opens WhatsApp).
- [ ] Add 5 *Chicken Hard* to the cart → a green "FREE 1 × Chicken Hard" line appears. Place the order → in Dashboard → Orders it shows 6 pieces, one at $0.00.
- [ ] Add meat by the lb until 100 lb in total → a free Beef Koliza appears (until 31 Oct 2026).
- [ ] Checkout → type "123 Main" in the address → Metro Detroit suggestions appear; tapping one fills the address. Typing the address by hand still works.

**Dashboard:**
- [ ] Products → **+ Add product**: type only the English name → Bangla and Arabic fill in by themselves (check them, fix by hand if needed). **Category** is a drop-down; "➕ New category…" lets you add one.
- [ ] People → **+ Add user**: fill name, email, role (Staff / Driver / Admin / Customer) → *Create account*. Write down the password shown. Sign in as that person in a private window and check they only see their own screens. The **Password** button on a row resets someone's password.
- [ ] Deals → **Free-item offers** card: switch an offer off/on or change its end date.
- [ ] On the phone, open the ☰ menu, then tap anywhere outside it → it closes.

---
## Things to know (honest notes)
- **Shrimp prices** come from your posters: BMR $15.49, CenSea $15.99, Dufer's 31/40 $15.49, Dufer's 20/30 4 lb box $18.00. The BMR and Dufer's 31/40 pictures look identical — replace one in Products → Edit if they differ. Please check the $18.00 for 4 lb is right.
- **Fish have no photos yet** (a fish icon shows). Upload them in Dashboard → Products → Edit.
- **Offers:** "Buy 5 get 1 free" has no end date; the Koliza gift ends 31 Oct 2026 and gives **1 lb** free (change *Free qty* in Dashboard → Deals if you mean more). The "100 lb" counts items sold by the lb.
- **Most popular** = units sold in the last 90 days. Until orders come in, it uses the "Popular" tag.
- **Address suggestions** use a free public map service (Photon / OpenStreetMap). It is fine for a young shop; if it ever gets slow or blocked, tell me and I will switch to a paid key.
- **Auto-translation** uses a free service with a daily limit and is not perfect for food words. Always read the Bangla and Arabic before saving.
- The catering poster says first 3 orders get a special discount and free delivery; I show it on the slide but did not build an automatic discount. Tell me the percent and I can add it.
- Everything above was tested on my side with simulated Supabase / Stripe / map / translation services. Your real services are the final test — that is what the checklist is for.

## Still open (your decisions)
Main domain (deshiee.com or deshiservice.com) and hosting, then moving the site from GitHub to your own domain; customer email/SMS notifications; driver route list; subscriptions.


---
## Update 4 — dark mode, Slideshow control, animations, pinned menu, card-only checkout

### ⚠️ Read this first: cash on delivery is now OFF
You asked for no cash on delivery, so customers can only pay by card. **Until Stripe is connected and "Accept card payments" is ticked (Dashboard → Settings), nobody can place an order** (the checkout says ordering is paused). While you are still testing without Stripe, tick **Allow cash on delivery** in Dashboard → Settings, and untick it when cards work.

### Do these (about 10 minutes)
1. Upload the new files to GitHub (same as Step 1). New this time: `js/slides.js`, `js/slides-default.js`, `js/anim.js`, `admin/views-slides.js` — upload the whole `js` and `admin` folders.
2. Supabase → SQL Editor → run the new `supabase/phase5.sql` again (no seed needed this time). Check: Table Editor shows the `promos` table with 2 rows.
3. Refresh the website (Ctrl+Shift+R) and the dashboard.

### Test checklist
**Dashboard**
- [ ] Left menu → **🌙 Dark mode** switches the dashboard dark/light (remembered on that device).
- [ ] **Slideshow** (new menu item): tick/untick *Shown*, move slides with the arrows, **Edit** a slide (colour, picture style, photos, English/Bangla/Arabic words, button destination, animation), **+ Add slide**, **Delete**, and **Reset to the built-in slideshow**. Use **Translate English → Bangla + Arabic** and read the result before saving. Refresh the website to see it.
- [ ] **Deals** page → *Free-item offers*: add "Buy 5 get 1 free" for any product, or "Free item when the order has X lb", change *Free qty*, end date, switch off, delete.
- [ ] **Settings**: *Allow cash on delivery*, *Products per page*, *Keep the category menu pinned*, and *Slideshow button animations* (one switch for all, plus one each for meat / fish / grocery / produce).

**Website (test on your phone)**
- [ ] Press a slide button (e.g. fish): fish swim across the screen while the page scrolls smoothly to the products. Meat → chicken, buffalo and goat walk. Grocery → rice, milk, eggs hop. Fresh produce slide → tomato, carrot, spinach hop.
- [ ] Scroll down into the products: the **All / Meat / Fish …** menu stays at the top (smaller). Scroll back up out of the product area: it goes back to normal.
- [ ] Add 5 of an item that has "Buy 5 get 1 free": the cart shows the free line; at checkout it shows **6 × Item (1 free)** but the price is for 5.
- [ ] Checkout shows only the card option (no cash).

### Notes
- Animations are decoration only: they are skipped for people who set "reduce motion" on their phone.
- The slideshow photos you replaced earlier in *Site pictures* still work; from now on change slide photos in **Slideshow** (that section was removed from Site pictures).
- Not built: showing the animation when a customer taps the category buttons directly (only the slideshow buttons play it). Tell me if you want that too.

## Update 5 — full address suggestions
Typing e.g. `4724 kingsley` at checkout now suggests complete Metro Detroit addresses (house number, street, city, state, ZIP), using two free map services. If the map doesn't know that exact house number, your typed number is kept on the suggested street. Customers add apartment/unit by typing after picking. Files changed: `js/shop.js`, `index.html`, `.htaccess` (re-upload all three).

## Update 6 — slower animations, desi bull
The slideshow-button animations run about 60% slower, and the buffalo is now a humped desi (zebu) bull. Files changed: `js/anim.js`, `css/carousel.css`, `index.html`, `admin/index.html`, `admin/views-manage.js`, `admin/views-slides.js`.

## Update 7 — layout polish
Removed the stray red tab on the "FREE delivery" seal; desktop/tablet header centred and kept inside the page width; centred top menu with hover effect; category buttons no longer break words; bottom app bar now phones only; footer logo centred; new dashboard look (`admin/polish.css`). New files: `css/layout.css`, `admin/polish.css`. Changed: `index.html`, `admin/index.html`, `js/slides.js`, `css/carousel.css`.

## Update 8 — www.deshillc.com
The site's address tags (canonical, share image, sitemap, robots, security contact) now use `https://www.deshillc.com`. Cloudflare: add `www.deshillc.com` (main) and `deshillc.com` (redirects to www) to the Pages project. Supabase `SITE_ORIGINS` = `https://www.deshillc.com,https://kowkimen-boop.github.io`.

## Update 9 — mobile menu, seal, view-cart, dashboard reports
1. Upload every file in this zip to GitHub (replace existing). Cloudflare redeploys automatically.
2. Supabase → SQL Editor → paste ONLY the text of `supabase/phase6.sql` → Run (needed for old/back-dated orders). Safe to run twice.
3. Hard refresh the site and dashboard (Ctrl/Cmd+Shift+R).
What changed: phone category menu = 3 buttons per row, centered; Zabiha halal seal fixed; "View cart" bar in the mobile search; slower desktop animation; dashboard signs out after 10 minutes idle; New order has a date picker (admin) for old offline records with per-item price, fee $0 by default, and an add-next flow; new Reports page (daily/weekly/monthly, CSV); all money shows cents.

## Update 10 — beef price list, small card-order fee, card test
1. Upload all changed files to GitHub (see list in the chat).
2. Supabase → SQL Editor → paste ONLY the text of `supabase/phase7.sql` → Run. It adds the 6 new beef items (pictures included), updates 2 prices (Meat Regular $6.00, Meat Zero Fat $7.30) and turns on the small card-order fee.
3. Supabase → Edge Functions → `capture-payment` → paste the new `supabase/functions/capture-payment/index.ts` → Deploy.
4. Hard refresh. Then follow `CARD-TEST-CHECKLIST.md`.
Settings (Dashboard → Settings): "Small card order limit" ($50) and "Small card order fee" (2.5% of the limit = $1.25; 0 turns it off).

## Update 11 — quantity shortcuts, 10 lb minimum, lamb & goat, new slide, add-to-cart fix
1. Upload the changed files to GitHub (list in the chat).
2. Supabase → SQL Editor → paste ONLY the text of `supabase/phase8.sql` → Run. (Run phase 8 again if you ever re-run phase 7: phase 7 contains an older copy of the order function.)
3. Hard refresh the site and the dashboard.
What changed:
- Every product: once it is in the cart, a typeable quantity box and +5 / +10 / +25 buttons appear on the card and in the cart. Whole numbers 1–999 per item.
- Dashboard → Settings: switch the quick-add buttons on/off and set their amounts.
- Dashboard → Products → Edit: "Minimum quantity" (0 = none). Lamb and goat are set to 10 lb: the first tap adds 10, going below 10 removes the item, typing less than 10 is refused, and the server refuses it too.
- New products Lamb ($6/lb) and Goat ($8/lb) with pictures from the poster, a "Lamb & Goat" filter chip, and a new homepage slide (Dashboard → Slideshow can edit or hide it).
- Fixed: on the product grid the "+" button could add a different product than the one shown (when the list was reordered or on page 2).
