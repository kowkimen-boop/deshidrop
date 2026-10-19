# Fresh Market — Frontend Prototype

A standalone, self-contained frontend design (single HTML file, no build
step, no dependencies to install) — elegant/modern grocery storefront UI
matching your style brief: warm white, charcoal, beige, Inter + Manrope
fonts, soft shadows, scroll animations.

This is still a **front-end prototype**. The cart and account now work in the
browser (saved in localStorage on the visitor's device): add to cart, quantity
changes, checkout request, sign up / sign in, and Google / Facebook / TikTok
buttons (demo mode until you add app IDs in `js/config.js`). Search is still
for show. Once
you approve the look, this exact design gets converted into the real
WooCommerce theme (PHP templates) so it becomes a working store.

## Run it on your laptop

No installation needed — just open `index.html` in any browser
(double-click it, or drag it into a browser window).

For a smoother local preview (recommended, avoids some browser file://
quirks):
- **VS Code users:** install the "Live Server" extension, right-click
  `index.html` → "Open with Live Server."
- **Or, if you have Python installed:** open a terminal in this folder
  and run `python3 -m http.server 8000`, then visit
  `http://localhost:8000` in your browser.

## Deploy to GitHub (free hosting via GitHub Pages)

1. Create a new repository on GitHub (e.g., `fresh-market-frontend`).
2. Upload `index.html` (and this README) to the repo — either drag-and-drop
   on github.com, or via git:
   ```
   git init
   git add .
   git commit -m "Initial frontend prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fresh-market-frontend.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set Source to **Deploy from a branch**,
   branch **main**, folder **/ (root)** → Save.
5. GitHub gives you a live link in a minute or two, usually:
   `https://YOUR_USERNAME.github.io/fresh-market-frontend/`

That link is shareable — send it to anyone to preview the design, no
hosting account needed on your end for this preview stage.

## Next step

Once you're happy with the design (or have specific changes), send
feedback and I'll either adjust this file or carry the exact look over
into the WooCommerce theme files so it becomes the real, functional
store with cart, checkout, and the admin panel.

---

## Quran — part of the same site

There is one website: `index.html`. The shop is the default view; the Quran is a second view of the same page,
opened from the **Quran** tab in the bottom bar (Home · Quran · Search · Cart · Account) or the **Quran** link in the
desktop nav. They share the header language toggle, styles, fonts and bottom bar — no separate Quran site.

URLs (hash routes, so it works on GitHub Pages and by double-clicking `index.html`):
`#/` shop · `#/quran` surah list · `#/quran/surah/2/255` verse · `#/quran/saved/bookmarks` · `#/quran/search?q=mercy`

**Features** — surah / page / juz / hizb lists · reader with Arabic + English + Bangla · bookmarks · favorites ·
Continue Reading + Last Read chips · full-text search (English, Arabic without diacritics, Bangla, surah names, or a
reference like `2:255`) · reading streak · text size and show/hide per language. Saved in the browser
(`localStorage`, key `dd_quran_v1`). The Search tab opens Quran search while you're in the Quran, and focuses the
shop's search box while you're in the shop.

**Data** (114 surahs, 6,236 verses — verified by `tools/build_quran_data.py`, which fails if any count is off)

| Content | Source |
|---|---|
| Arabic (Hafs, Uthmani) | [Tanzil Project](https://tanzil.net) — kept verbatim (`tools/source/tanzil-uthmani.txt`) |
| English | Saheeh International (Tanzil `en.sahih`, via npm `quran-json`) |
| Bangla | Muhiuddin Khan (Tanzil `bn.bengali`, via npm `quran-json`) |
| Page / Juz / Hizb, surah names | npm `quran-meta` (Madani 604-page mushaf) |

Tanzil's terms require crediting tanzil.net with a link and not altering the text — both are done (menu + list
footer). The bismillah Tanzil prefixes to verse 1 is hidden at display time and shown as a header instead.

Files: `js/quran.js` (logic + routing), `css/quran.css`, `js/quran-meta.js` (small, always loaded),
`js/quran-data.js` (~4 MB, ~1 MB gzipped; loads only when a surah, search or saved list opens).
Rebuild data: `python3 tools/build_quran_data.py`.

**Not included yet:** verse audio (Quran.com API) and accounts/sync — Quran data is stored per browser for now.

---

## Home page: popup, countdown, side stack

- **Welcome popup** (shown on every visit): English title and "Start Shopping" button, delivery info, a
  "Prayer Time for Warren, MI" section (next prayer highlighted), then the Quran verse. Fade/slide/pop-in on open,
  fade-out on close; honours *reduce motion*.
- **Next-prayer countdown** (fixed, right side): counts down to the next event in the order
  Fajr → Sunrise → Dhuhr → Asr → Maghrib → Isha → tomorrow's Fajr, updating every second. The next event is picked by
  the actual time of day (America/Detroit), so it's correct around midnight and after Isha. Times are calculated on
  the device (ISNA method) — see `js/main.js`.
- **Date under the countdown** follows the language: English `MM/DD/YYYY` · Bangla calendar (Bangladesh revised) ·
  Hijri in Arabic. Hijri can be shifted for moon sighting with `HIJRI_OFFSET` in `js/main.js` (or `?hijri=-1`).
- **Social icons** sit directly under the countdown, same width, in the same fixed stack. While you scroll down the
  stack folds to just the prayer name + time, and unfolds when you scroll up or pause.
- **Home ↔ Quran** switching uses the View Transitions API (slide + fade, tab bar stays put) with a CSS fallback for
  browsers without it. The Quran text is preloaded in the background once you open Quran or hover/touch its tab.


---

## Deals carousel & popup (latest)

- **Deals carousel** (`js/carousel.js`, section `#deals` above the product hero; the old promo banner was removed, and the
  menu's "Deals" link jumps here): 5 slides — free delivery, Hand Zabiha Halal meats, fresh produce, frozen fish & pantry,
  delivery area. Swipe, arrows, progress dots, pause button, keyboard arrows; autoplay stops on hover/focus/touch,
  off-screen, hidden tab and *reduce motion*. Text keys `cs1_*`…`cs5_*` (EN in `index.html`, BN/AR in `js/main.js`).
  Prices shown are the real ones from the product list.
- **Welcome popup**: bigger logo (96px), tighter spacing, slogan "From Store to Door" sits 2px under the title.
- **Header**: 2px gap between the "Deshi Drop" wordmark and its slogan.

## Category menu (latest)

- The hero text block was removed (the carousel replaces it). The category menu (`#cat-menu`, `css/filter.css`, `js/filter.js`)
  shows **All · Meat & Poultry · Fish · Grocery · Bakery · Beverage** — two rows on phones, one row on desktop.
  All filters the product grid with a smooth fade; Meat & Poultry shows meat only; Fish, Grocery, Bakery and Beverage show a
  "Coming soon" panel. To open a section later, give it a filter in `FILTERS` (js/filter.js) and remove the `soon` class in `index.html`.

## Meat menu from the flyer (latest)

- Products now follow the price flyer: beef (Trip $6.00, Whole Head $3.50, Koliza $3.50, Meat Regular $4.50, Meat & Bones Zero Fat $5.50,
  Meat Zero Fat $7.50 — per lb) and chicken (Soft $2.50/lb, Hard $5.00/piece, Leg with skin $1.50/lb, Leg without skin $2.00/lb,
  Breast $3.50/lb). Edit them in `products` in `js/main.js` (EN, Bangla on the object, Arabic in `AR_NAMES`).
- Every meat card carries a Halal seal (`#halal-seal` symbol in `index.html`, styles in `css/meat.css`).
- "Meat & Poultry" in the menu shows All meat / Beef / Chicken chips plus the delivery note (free over 100 LB, $9.99 minimum, Sat & Sun 3–9 PM).
- Flyer-based text: carousel slides, "Why shop with us", trust badges, shop heading. Delivery from $9.99 (Metro Detroit).

## Gallery tab (latest)

- New **Gallery** tab in the bottom bar (now six equal tabs: Home · Quran · Gallery · Search · Cart · Account) and a page at `#/gallery`.
- **Add photos for every visitor:** copy the image into the `gallery/` folder, add one entry to `js/gallery-data.js` (id, src, cat, date,
  title/caption in EN/BN/AR), upload to GitHub. Categories are defined at the top of the same file. `video:` entries are supported.
- **Add photos from the page** (button "Add photos"): choose / drag / paste images, caption + category; they are compressed in the browser and
  saved on that device only (IndexedDB) — handy for previews; delete them from the viewer.
- Features: masonry or uniform grid, category chips, favourites (saved on the device), newest/oldest sort, lazy loading with fade-in,
  full-screen viewer (swipe, pinch / double-tap / wheel zoom, keyboard arrows, thumbnails, slideshow, share, download, full screen),
  shareable links `#/gallery/<id>`, shared-element open/close animation (View Transitions API with fallback), EN/BN/AR, reduced-motion aware.
- Files: `css/gallery.css`, `js/gallery.js`, `js/gallery-data.js`, `gallery/`.

## Deals section & carousel buttons
- `js/deals-data.js` lists the sale items (`name` must match a product in `js/main.js`, `pct` = percent off). Sale price is computed automatically and used on cards, in the Deals section and in the cart. The 20% values are placeholders.
- Carousel buttons jump to the matching category: "Order Your Meat Now" shows the meat section only; produce/grocery/fish slides open their "Coming soon" panel.

### Deals pages (dashboard-ready)
The Deals section shows 4 products per page with numbered pages, arrows and swipe; extra pages appear automatically (11 deals → 4 + 4 + 3). `js/deals-data.js` holds `pageSize` and the ordered deal list (`name`, `pct`, optional `active`, `from`, `until`).
When the backend exists: set `endpoint` in `window.__DEALS_CONFIG` to a URL returning `{ "pageSize": 4, "deals": [ {name, pct, active, from, until} ] }`, or call `window.__setDeals(list, { pageSize })` from the dashboard script.
