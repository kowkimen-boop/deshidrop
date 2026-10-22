/* Deshi Drop — DEALS data.  Today this file is the "database"; later the dashboard/backend replaces it.
   ─────────────────────────────────────────────────────────────────────────────────────────────
   Deals section: 4 products per page (pageSize), extra pages appear automatically (11 deals → 4 + 4 + 3).
   The ORDER of the list below is the order shown on the pages.

   Each deal:
     name   – product name, must match js/main.js exactly
     pct    – percent off (1–90); the sale price is calculated and used on cards AND in the cart
     active – optional, false hides the deal without deleting it
     from / until – optional ISO dates ("2026-10-24T00:00:00") → the deal switches on/off by itself

   BACKEND (later): set endpoint to a URL that returns JSON and this file's list becomes the fallback:
     GET /api/deals  →  { "pageSize": 4, "deals": [ { "name": "...", "pct": 20, "active": true, "from": null, "until": null } ] }
   Or push data from your dashboard script at any time:  window.__setDeals(list, { pageSize: 4 })
   (The percentages below are placeholders — set your real ones.) */
window.__DEALS_CONFIG = { pageSize: 4, endpoint: "" };
window.__DEALS = [
  { name: "Chicken Leg – with skin (per lb)", pct: 20 },
  { name: "Chicken Soft (per lb)", pct: 15 },
  { name: "Meat – Regular (per lb)", pct: 10 },
  { name: "Beef Koliza (per lb)", pct: 20 },
  { name: "Chicken Breast (per lb)", pct: 15 },
  { name: "Meat – Zero Fat (per lb)", pct: 10 },
  { name: "Beef Trip (per lb)", pct: 20 },
  { name: "Whole Head (per lb)", pct: 25 }
];
