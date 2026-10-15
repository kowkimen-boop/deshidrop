# Fresh Market — Frontend Prototype

A standalone, self-contained frontend design (single HTML file, no build
step, no dependencies to install) — elegant/modern grocery storefront UI
matching your style brief: warm white, charcoal, beige, Inter + Manrope
fonts, soft shadows, scroll animations.

This is a **visual prototype only** — the cart/search/account icons are
for show, and "Add to cart" buttons don't yet connect to anything. Once
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
