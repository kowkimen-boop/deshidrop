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
