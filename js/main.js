// Deshi Drop — site logic (products, rendering, tilt effect, i18n, lang toggle)

  // Original flat-style icons drawn per product type (no stock photos / no
  // third-party imagery — keeps the design consistent and license-free).
  // Real product photos, embedded once and referenced by key (keeps the
  // HTML from repeating large base64 strings per card).
  const getPhotos = () => window.__PRODUCT_PHOTOS__ || {};

  const icons = {
    chicken: `<svg viewBox="0 0 64 64"><path d="M34 10c6 0 10 5 10 11 0 5-2 8-5 11l3 20H26l3-20c-4-3-6-7-6-12 0-6 5-10 11-10z" fill="var(--fm-accent)"/><ellipse cx="27" cy="20" rx="2.2" ry="2.6" fill="#fff"/><path d="M22 14c-3-3-7-3-9-1 2 3 5 4 9 3z" fill="var(--fm-accent-dark)"/></svg>`,
    beef: `<svg viewBox="0 0 64 64"><path d="M14 24c4-8 14-12 24-9 8 2 13 9 12 17-1 7-7 12-15 12-3 5-8 8-14 7-7-1-12-7-11-14 1-5 4-9 4-13z" fill="var(--fm-red)"/><circle cx="24" cy="30" r="2.4" fill="#fff" opacity=".85"/><circle cx="34" cy="24" r="2" fill="#fff" opacity=".8"/><circle cx="38" cy="36" r="2.2" fill="#fff" opacity=".8"/></svg>`,
    lamb: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="30" rx="18" ry="14" fill="var(--fm-beige-dark)"/><ellipse cx="32" cy="30" rx="18" ry="14" fill="none" stroke="var(--fm-accent-dark)" stroke-width="1" stroke-dasharray="2 3"/><circle cx="48" cy="24" r="6" fill="var(--fm-accent-dark)"/><rect x="20" y="42" width="4" height="10" fill="var(--fm-accent-dark)"/><rect x="38" y="42" width="4" height="10" fill="var(--fm-accent-dark)"/></svg>`,
    turkey: `<svg viewBox="0 0 64 64"><path d="M22 54c-2-14 0-26 10-32 9-5 19-1 21 7 2 7-2 13-9 15l2 10H22z" fill="var(--fm-red)"/><circle cx="40" cy="16" r="3" fill="#fff"/></svg>`,
    rice: `<svg viewBox="0 0 64 64"><rect x="16" y="14" width="32" height="38" rx="3" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><rect x="16" y="14" width="32" height="10" fill="var(--fm-accent)"/><path d="M24 30c4-3 12-3 16 0M24 38c4-3 12-3 16 0M24 46c4-3 12-3 16 0" stroke="var(--fm-accent-dark)" stroke-width="1.6" fill="none"/></svg>`,
    lentils: `<svg viewBox="0 0 64 64"><rect x="18" y="16" width="28" height="36" rx="3" fill="#fff" stroke="var(--fm-red)" stroke-width="2"/><rect x="18" y="16" width="28" height="9" fill="var(--fm-red)"/><circle cx="26" cy="34" r="2.2" fill="var(--fm-red)" opacity=".8"/><circle cx="34" cy="38" r="2.2" fill="var(--fm-red)" opacity=".8"/><circle cx="30" cy="44" r="2.2" fill="var(--fm-red)" opacity=".8"/><circle cx="38" cy="30" r="2.2" fill="var(--fm-red)" opacity=".8"/></svg>`,
    flour: `<svg viewBox="0 0 64 64"><rect x="18" y="14" width="28" height="38" rx="3" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><rect x="18" y="14" width="28" height="9" fill="var(--fm-beige-dark)"/><circle cx="32" cy="36" r="9" fill="var(--fm-beige-dark)" opacity=".6"/></svg>`,
    sugar: `<svg viewBox="0 0 64 64"><rect x="20" y="16" width="24" height="34" rx="3" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><rect x="20" y="16" width="24" height="8" fill="var(--fm-accent)"/><rect x="27" y="30" width="4" height="4" fill="var(--fm-accent-dark)"/><rect x="34" y="30" width="4" height="4" fill="var(--fm-accent-dark)"/><rect x="27" y="37" width="4" height="4" fill="var(--fm-accent-dark)"/><rect x="34" y="37" width="4" height="4" fill="var(--fm-accent-dark)"/></svg>`,
    oil: `<svg viewBox="0 0 64 64"><path d="M26 10h12v8l6 6v24a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V24l6-6z" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><rect x="26" y="8" width="12" height="5" fill="var(--fm-accent-dark)"/><rect x="22" y="30" width="20" height="14" fill="var(--fm-accent)" opacity=".85"/></svg>`,
    tea: `<svg viewBox="0 0 64 64"><rect x="16" y="18" width="32" height="32" rx="3" fill="var(--fm-red)"/><rect x="16" y="18" width="32" height="8" fill="var(--fm-red-dark)"/><path d="M24 34h16M24 40h16" stroke="#fff" stroke-width="2"/></svg>`,
    milk: `<svg viewBox="0 0 64 64"><path d="M24 10h16l3 10v30a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3V20z" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><path d="M24 10l-4 6h20l-4-6z" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><rect x="21" y="30" width="22" height="10" fill="var(--fm-accent)" opacity=".8"/></svg>`,
    egg: `<svg viewBox="0 0 64 64"><ellipse cx="24" cy="36" rx="10" ry="13" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/><ellipse cx="40" cy="30" rx="10" ry="13" fill="#fff" stroke="var(--fm-accent-dark)" stroke-width="2"/></svg>`,
    tomato: `<svg viewBox="0 0 64 64"><circle cx="32" cy="36" r="16" fill="var(--fm-red)"/><path d="M26 22c2-4 10-4 12 0" stroke="var(--fm-accent-dark)" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="27" cy="30" rx="3" ry="2" fill="#fff" opacity=".4"/></svg>`,
    potato: `<svg viewBox="0 0 64 64"><path d="M16 36c0-10 8-18 18-18 9 0 16 6 17 14 1 9-6 17-16 18-11 1-19-5-19-14z" fill="var(--fm-beige-dark)"/><circle cx="26" cy="32" r="1.6" fill="var(--fm-accent-dark)" opacity=".6"/><circle cx="36" cy="38" r="1.6" fill="var(--fm-accent-dark)" opacity=".6"/><circle cx="30" cy="42" r="1.6" fill="var(--fm-accent-dark)" opacity=".6"/></svg>`,
    spinach: `<svg viewBox="0 0 64 64"><path d="M32 54V26" stroke="var(--fm-accent-dark)" stroke-width="2"/><path d="M32 26c-8-2-14-10-12-20 10 0 16 8 16 16M32 32c8-2 14-8 14-16-10-1-16 6-18 12M32 38c-7-1-12 4-12 10 8 1 13-4 15-8" fill="var(--fm-accent)"/></svg>`,
    pepper: `<svg viewBox="0 0 64 64"><path d="M26 16c2-4 8-4 9 0l2 6c6 1 10 7 9 14-1 9-9 16-18 15-8-1-14-9-12-17 1-5 4-9 8-12z" fill="var(--fm-accent)"/><path d="M32 16c6-2 10 2 9 7" fill="none" stroke="var(--fm-red)" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    onion: `<svg viewBox="0 0 64 64"><path d="M32 12c10 6 14 16 12 26-2 10-8 16-12 16s-10-6-12-16c-2-10 2-20 12-26z" fill="var(--fm-beige-dark)"/><path d="M32 12c4 8 4 16 0 24M32 12c-4 8-4 16 0 24" stroke="var(--fm-accent-dark)" stroke-width="1.2" fill="none" opacity=".5"/><path d="M30 10c0-4 1-7 2-7s2 3 2 7" stroke="var(--fm-accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
  };
  icons.fish = `<svg viewBox="0 0 64 64"><path d="M10 32c8-12 24-14 34-4l10-8-3 12 3 12-10-8c-10 10-26 8-34-4z" fill="#4aa3c7" stroke="var(--fm-accent-dark)" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="29" r="2" fill="#fff"/></svg>`;
  const fallbackIcon = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="var(--fm-beige-dark)"/></svg>`;

  const products = [
    { name: "Beef Trip (per lb)", name_bn: "গরুর ভুঁড়ি (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$6.00", icon: "beef" },
    { name: "Whole Head (per lb)", name_bn: "গরুর মাথা (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$3.50", icon: "beef" },
    { name: "Beef Koliza (per lb)", name_bn: "গরুর কলিজা (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$3.50", icon: "beef" },
    { name: "Meat – Regular (per lb)", name_bn: "গরুর মাংস – সাধারণ (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$4.50", tag: "Popular", icon: "beef", photo: "fl_cubes" },
    { name: "Meat & Bones – Zero Fat (per lb)", name_bn: "হাড়সহ গরুর মাংস – জিরো ফ্যাট (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$5.50", icon: "beef", photo: "fl_beef" },
    { name: "Meat – Zero Fat (per lb)", name_bn: "গরুর মাংস – জিরো ফ্যাট (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Beef", price: "$7.50", icon: "beef", photo: "beef" },
    { name: "Chicken Soft (per lb)", name_bn: "নরম মুরগি (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Chicken", price: "$2.50", tag: "Fresh", icon: "chicken", photo: "onion" },
    { name: "Chicken Hard (per piece)", name_bn: "শক্ত মুরগি (প্রতি পিস)", cat: "Meat", cat_bn: "মাংস", sub: "Chicken", price: "$5.00", icon: "chicken", photo: "fl_chicken" },
    { name: "Chicken Leg – with skin (per lb)", name_bn: "চামড়াসহ মুরগির রান (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Chicken", price: "$1.50", icon: "chicken" },
    { name: "Chicken Leg – without skin (per lb)", name_bn: "চামড়া ছাড়া মুরগির রান (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Chicken", price: "$2.00", icon: "chicken" },
    { name: "Chicken Breast (per lb)", name_bn: "মুরগির ব্রেস্ট (প্রতি পাউন্ড)", cat: "Meat", cat_bn: "মাংস", sub: "Chicken", price: "$3.50", icon: "chicken", photo: "potato" },
    { name: "Mrigal Fish – 2 kg up (per lb)", name_bn: "মৃগেল মাছ – ২ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Mrigal", price: "$3.49", icon: "fish" },
    { name: "Mrigal Fish – 3 kg up (per lb)", name_bn: "মৃগেল মাছ – ৩ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Mrigal", price: "$3.99", icon: "fish" },
    { name: "Mrigal Fish – 4 kg up (per lb)", name_bn: "মৃগেল মাছ – ৪ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Mrigal", price: "$4.49", icon: "fish" },
    { name: "Mrigal Fish – 5 kg up (per lb)", name_bn: "মৃগেল মাছ – ৫ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Mrigal", price: "$4.99", icon: "fish" },
    { name: "Mrigal Fish – 6 kg up (per lb)", name_bn: "মৃগেল মাছ – ৬ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Mrigal", price: "$5.49", icon: "fish" },
    { name: "Rohu Fish – 2 kg up (per lb)", name_bn: "রুই মাছ – ২ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Rohu", price: "$2.59", icon: "fish" },
    { name: "Rohu Fish – 3 kg up (per lb)", name_bn: "রুই মাছ – ৩ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Rohu", price: "$2.75", icon: "fish" },
    { name: "Rohu Fish – 4 kg up (per lb)", name_bn: "রুই মাছ – ৪ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Rohu", price: "$2.95", icon: "fish" },
    { name: "Rohu Fish – 5 kg up (per lb)", name_bn: "রুই মাছ – ৫ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Rohu", price: "$3.57", icon: "fish" },
    { name: "Rohu Fish – 6 kg up (per lb)", name_bn: "রুই মাছ – ৬ কেজি+ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Rohu", price: "$3.99", icon: "fish" },
    { name: "Showl Fish (per lb)", name_bn: "শোল মাছ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Showl", price: "$6.49", icon: "fish" },
    { name: "Karfu Fish (per lb)", name_bn: "কার্ফু মাছ (প্রতি পাউন্ড)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Karfu", price: "$2.99", icon: "fish" },
    { name: "Shrimp 31/40 – BMR Classic (2 lb bag)", name_bn: "চিংড়ি ৩১/৪০ – বিএমআর ক্লাসিক (২ পাউন্ড ব্যাগ)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Shrimp", price: "$15.49", icon: "fish", tag: "New", photo: "shrimp_bmr" },
    { name: "Shrimp 31/40 – CenSea (2 lb bag)", name_bn: "চিংড়ি ৩১/৪০ – সেনসি (২ পাউন্ড ব্যাগ)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Shrimp", price: "$15.99", icon: "fish", tag: "New", photo: "shrimp_censea" },
    { name: "Shrimp 31/40 – Dufer's (2 lb bag)", name_bn: "চিংড়ি ৩১/৪০ – ডুফার্স (২ পাউন্ড ব্যাগ)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Shrimp", price: "$15.49", icon: "fish", tag: "New", photo: "shrimp_dufers" },
    { name: "Shrimp 20/30 – Dufer's (4 lb box)", name_bn: "চিংড়ি ২০/৩০ – ডুফার্স (৪ পাউন্ড বক্স)", cat: "Fish", cat_bn: "মাছ", cat_ar: "السمك", sub: "Shrimp", price: "$18.00", icon: "fish", tag: "New", photo: "shrimp_box" },
    { name: "Roma Tomatoes (1 lb)", name_bn: "টমেটো (১ পাউন্ড)", cat: "Produce", cat_bn: "সবজি", price: "$1.99", tag: "New", icon: "tomato" },
    { name: "Russet Potatoes (5 lb)", name_bn: "আলু (৫ পাউন্ড)", cat: "Produce", cat_bn: "সবজি", price: "$3.99", icon: "potato", photo: "chicken_breast" },
    { name: "Fresh Spinach (bunch)", name_bn: "তাজা পালং শাক (আঁটি)", cat: "Produce", cat_bn: "সবজি", price: "$2.29", icon: "spinach", photo: "milk" },
    { name: "Yellow Onions (3 lb)", name_bn: "পেঁয়াজ (৩ পাউন্ড)", cat: "Produce", cat_bn: "সবজি", price: "$2.49", icon: "onion", photo: "chicken_whole" },
    { name: "Bell Peppers (3-pack)", name_bn: "ক্যাপসিকাম (৩ পিস)", cat: "Produce", cat_bn: "সবজি", price: "$3.49", icon: "pepper" },
    { name: "Basmati Rice (10 lb)", name_bn: "বাসমতি চাল (১০ পাউন্ড)", cat: "Grocery", cat_bn: "মুদি", price: "$14.99", tag: "Popular", icon: "rice" },
    { name: "Red Lentils (2 lb)", name_bn: "মসুর ডাল (২ পাউন্ড)", cat: "Grocery", cat_bn: "মুদি", price: "$4.49", icon: "lentils", photo: "lentils" },
    { name: "Cooking Oil (1L)", name_bn: "রান্নার তেল (১ লিটার)", cat: "Grocery", cat_bn: "মুদি", price: "$4.29", icon: "oil" },
    { name: "Granulated Sugar (4 lb)", name_bn: "চিনি (৪ পাউন্ড)", cat: "Grocery", cat_bn: "মুদি", price: "$3.29", icon: "sugar" },
    { name: "All-Purpose Flour (5 lb)", name_bn: "ময়দা (৫ পাউন্ড)", cat: "Grocery", cat_bn: "মুদি", price: "$3.99", icon: "flour" },
    { name: "Black Tea Bags (100 ct)", name_bn: "চা পাতার ব্যাগ (১০০ পিস)", cat: "Grocery", cat_bn: "মুদি", price: "$5.99", icon: "tea" },
    { name: "Whole Milk (1 gal)", name_bn: "দুধ (১ গ্যালন)", cat: "Dairy & Eggs", cat_bn: "দুধ ও ডিম", price: "$3.79", icon: "milk", photo: "spinach" },
    { name: "Large Eggs (dozen)", name_bn: "ডিম (১ ডজন)", cat: "Dairy & Eggs", cat_bn: "দুধ ও ডিম", price: "$3.49", icon: "egg", photo: "pepper" },
  ];


  // Arabic product names / categories / tags (Bangla lives on each product object)
  const AR_NAMES = {
    "Beef Trip (per lb)":"كرشة بقري (للرطل)",
    "Whole Head (per lb)":"رأس بقري كامل (للرطل)",
    "Beef Koliza (per lb)":"كبدة بقري (للرطل)",
    "Meat – Regular (per lb)":"لحم بقري – عادي (للرطل)",
    "Meat & Bones – Zero Fat (per lb)":"لحم مع العظم – بدون دهن (للرطل)",
    "Meat – Zero Fat (per lb)":"لحم بقري – بدون دهن (للرطل)",
    "Chicken Soft (per lb)":"دجاج طري (للرطل)",
    "Chicken Hard (per piece)":"دجاج قاسي (للحبة)",
    "Chicken Leg – with skin (per lb)":"فخذ دجاج بالجلد (للرطل)",
    "Chicken Leg – without skin (per lb)":"فخذ دجاج بدون جلد (للرطل)",
    "Chicken Breast (per lb)":"صدر دجاج (للرطل)",
    "Chicken Breast (1 lb)":"صدر دجاج (١ رطل)","Whole Chicken (1 lb)":"دجاجة كاملة (١ رطل)",
    "Ground Beef 80/20 (1 lb)":"لحم بقري مفروم ٨٠/٢٠ (١ رطل)","Lamb Chops (1 lb)":"ريش ضأن (١ رطل)",
    "Turkey Drumsticks (1 lb)":"أفخاذ ديك رومي (١ رطل)","Roma Tomatoes (1 lb)":"طماطم روما (١ رطل)",
    "Russet Potatoes (5 lb)":"بطاطس روسيت (٥ أرطال)","Fresh Spinach (bunch)":"سبانخ طازجة (حزمة)",
    "Yellow Onions (3 lb)":"بصل أصفر (٣ أرطال)","Bell Peppers (3-pack)":"فلفل رومي (٣ حبات)",
    "Basmati Rice (10 lb)":"أرز بسمتي (١٠ أرطال)","Red Lentils (2 lb)":"عدس أحمر (٢ رطل)",
    "Cooking Oil (1L)":"زيت طبخ (١ لتر)","Granulated Sugar (4 lb)":"سكر ناعم (٤ أرطال)",
    "All-Purpose Flour (5 lb)":"دقيق متعدد الاستعمالات (٥ أرطال)","Black Tea Bags (100 ct)":"أكياس شاي أسود (١٠٠ كيس)",
    "Whole Milk (1 gal)":"حليب كامل الدسم (١ غالون)","Large Eggs (dozen)":"بيض كبير (دزينة)",
    "Mrigal Fish – 2 kg up (per lb)":"سمك مريغال – ٢ كجم فأكثر (للرطل)",
    "Mrigal Fish – 3 kg up (per lb)":"سمك مريغال – ٣ كجم فأكثر (للرطل)",
    "Mrigal Fish – 4 kg up (per lb)":"سمك مريغال – ٤ كجم فأكثر (للرطل)",
    "Mrigal Fish – 5 kg up (per lb)":"سمك مريغال – ٥ كجم فأكثر (للرطل)",
    "Mrigal Fish – 6 kg up (per lb)":"سمك مريغال – ٦ كجم فأكثر (للرطل)",
    "Rohu Fish – 2 kg up (per lb)":"سمك روهو – ٢ كجم فأكثر (للرطل)",
    "Rohu Fish – 3 kg up (per lb)":"سمك روهو – ٣ كجم فأكثر (للرطل)",
    "Rohu Fish – 4 kg up (per lb)":"سمك روهو – ٤ كجم فأكثر (للرطل)",
    "Rohu Fish – 5 kg up (per lb)":"سمك روهو – ٥ كجم فأكثر (للرطل)",
    "Rohu Fish – 6 kg up (per lb)":"سمك روهو – ٦ كجم فأكثر (للرطل)",
    "Showl Fish (per lb)":"سمك شول (للرطل)",
    "Karfu Fish (per lb)":"سمك كارفو (للرطل)",
    "Shrimp 31/40 – BMR Classic (2 lb bag)":"جمبري ٣١/٤٠ – بي إم آر كلاسيك (كيس ٢ رطل)",
    "Shrimp 31/40 – CenSea (2 lb bag)":"جمبري ٣١/٤٠ – سينسي (كيس ٢ رطل)",
    "Shrimp 31/40 – Dufer's (2 lb bag)":"جمبري ٣١/٤٠ – دوفرز (كيس ٢ رطل)",
    "Shrimp 20/30 – Dufer's (4 lb box)":"جمبري ٢٠/٣٠ – دوفرز (علبة ٤ رطل)"
  };
  const AR_CATS = {"Meat":"لحوم","Produce":"خضار وفواكه","Grocery":"بقالة","Dairy & Eggs":"ألبان وبيض","Fish":"السمك"};
  const TAGS = {Fresh:{bn:"তাজা",ar:"طازج"},New:{bn:"নতুন",ar:"جديد"},Popular:{bn:"জনপ্রিয়",ar:"الأكثر طلبًا"}};
  // Text that can come from the database is always escaped before it goes into HTML.
  const escH = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = (u) => /^(https:\/\/|img\/|gallery\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(String(u || '')) ? escH(u) : '';
  window.__ddEsc = escH; window.__ddSafeImg = safeImg;
  const pName = (p,l) => l==='bn' ? (p.name_bn||p.name) : l==='ar' ? (p.name_ar||AR_NAMES[p.name]||p.name) : p.name;
  const pCat  = (p,l) => l==='bn' ? (p.cat_bn||p.cat) : l==='ar' ? (p.cat_ar||AR_CATS[p.cat]||p.cat) : p.cat;
  const pTag  = (p,l) => (TAGS[p.tag] && TAGS[p.tag][l]) || p.tag;
  // ---- Deals: data comes from js/deals-data.js today, from the dashboard/backend later (see README) ----
  const DEALS_CFG = Object.assign({ pageSize: 4, endpoint: '' }, window.__DEALS_CONFIG || {});
  let dealOrder = [], dealPage = 0;
  function dealLive(d) {
    const now = Date.now();
    if (!d || d.active === false) return false;
    if (d.from && Date.parse(d.from) > now) return false;
    if (d.until && Date.parse(d.until) < now) return false;
    return true;
  }
  function applyDeals(list) {
    products.forEach((p) => { delete p.deal; delete p.salePrice; });
    dealOrder = [];
    (list || []).forEach((d) => {
      if (!dealLive(d)) return;
      const i = products.findIndex((x) => x.name === d.name); if (i < 0 || products[i].deal) return;
      const pct = Math.min(90, Math.max(1, Math.round(+d.pct) || 0)); if (!pct) return;
      const p = products[i], base = parseFloat(String(p.price).replace(/[^0-9.]/g, ''));
      p.deal = pct; p.salePrice = '$' + (Math.round(base * (100 - pct)) / 100).toFixed(2);
      dealOrder.push(i);                       // the deals list decides the order shown in the section
    });
  }
  applyDeals(window.__DEALS);
  window.__DD = { dealLive, products, pName, pCat, icons, fallbackIcon };  // used by js/shop.js (cart)

  const grid = document.getElementById('product-grid');
  window.__currentProductLang = 'en';

  function cardHTML(p, i, lang) { return `
      <div class="card fade-in visible ${(p.photo || p.image_url) ? 'tilt-card' : ''}${p.in_stock === false ? ' sold-out' : ''}" style="transition-delay:${(i % 8) * 60}ms">
        <div class="card-img ${(p.photo || p.image_url) ? 'has-photo' : ''}">
          ${p.tag ? `<span class="tag">${escH(pTag(p,lang))}</span>` : ''}
          ${(p.halal === undefined ? p.cat === 'Meat' : p.halal) ? '<span class="halal-seal" title="100% Halal" aria-label="100% Halal"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#halal-seal"/></svg></span>' : ''}
          ${p.deal ? `<span class="deal-ribbon">-${p.deal}%</span>` : ''}
          ${p.image_url
            ? (safeImg(p.image_url) ? `<img class="product-photo" src="${safeImg(p.image_url)}" alt="${escH(p.name)}" loading="lazy">` : '')
            : p.photo
            ? `<img class="product-photo" src="" data-photo-key="${escH(p.photo)}" alt="${escH(p.name)}" loading="lazy">`
            : (icons[p.icon] || fallbackIcon).replace('<svg ', '<svg width="56" height="56" ')}
        </div>
        <div class="card-body">
          <div class="card-cat">${escH(pCat(p,lang))}</div>
          <div class="card-name">${escH(pName(p,lang))}</div>
          <div class="card-bottom">
            ${p.deal ? `<div class="price has-deal"><s class="was">${escH(p.price)}</s><span class="now">${escH(p.salePrice)}</span></div>` : `<div class="price">${escH(p.price)}</div>`}
            ${p.in_stock === false ? '<span class="sold-tag">Sold out</span>' : `<button class="add-btn" type="button" data-pid="${i}" aria-label="Add to cart">+</button>`}
          </div>
        </div>
      </div>`; }

  const dealGrid = document.getElementById('deal-grid'), dealPager = document.getElementById('deal-pager');
  const PG_TXT = {
    en: (a, b, n) => `Showing ${a}–${b} of ${n}`,
    bn: (a, b, n) => `${n}টির মধ্যে ${a}–${b}`,
    ar: (a, b, n) => `عرض ${a}–${b} من ${n}`
  };
  const PG_ARIA = { en: ['Previous page', 'Next page', 'Page'], bn: ['আগের পৃষ্ঠা', 'পরের পৃষ্ঠা', 'পৃষ্ঠা'], ar: ['الصفحة السابقة', 'الصفحة التالية', 'صفحة'] };
  const pageSize = () => Math.max(1, parseInt(DEALS_CFG.pageSize, 10) || 4);
  function pagerHTML(page, pages, lang, from, len, total) {
    const L = PG_ARIA[lang] || PG_ARIA.en, rtl = lang === 'ar';
    const chev = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    let nums = '';
    for (let k = 0; k < pages; k++) nums += `<button class="pg-num${k === page ? ' on' : ''}" type="button" data-pg="${k}" aria-label="${L[2]} ${k + 1}"${k === page ? ' aria-current="page"' : ''}>${k + 1}</button>`;
    return `<div class="pg-row"><button class="pg-arrow" type="button" data-pg="${page - 1}" aria-label="${L[0]}"${page === 0 ? ' disabled' : ''}>${chev(rtl ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6')}</button>` +
      `<div class="pg-nums">${nums}</div>` +
      `<button class="pg-arrow" type="button" data-pg="${page + 1}" aria-label="${L[1]}"${page === pages - 1 ? ' disabled' : ''}>${chev(rtl ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6')}</button></div>` +
      `<p class="pg-info" aria-live="polite">${(PG_TXT[lang] || PG_TXT.en)(from + 1, from + len, total)}</p>`;
  }
  function renderDeals(lang, dir) {
    const sec = document.getElementById('deal-list'); if (!dealGrid) return;
    const total = dealOrder.length, size = pageSize(), pages = Math.max(1, Math.ceil(total / size));
    dealPage = Math.min(Math.max(0, dealPage), pages - 1);
    if (sec) sec.hidden = !total;
    const n = document.getElementById('deal-n'); if (n) n.textContent = total;
    const from = dealPage * size, slice = dealOrder.slice(from, from + size);
    dealGrid.innerHTML = slice.map((i) => cardHTML(products[i], i, lang)).join('');
    dealGrid.classList.remove('pg-next', 'pg-prev');
    if (dir) { void dealGrid.offsetWidth; dealGrid.classList.add(dir > 0 ? 'pg-next' : 'pg-prev'); }
    // keep the grid height steady so the page doesn't jump when the last page has fewer cards
    if (dealGrid.offsetHeight > (parseFloat(dealGrid.style.minHeight) || 0)) dealGrid.style.minHeight = dealGrid.offsetHeight + 'px';
    if (!dealPager) return;
    dealPager.hidden = pages < 2; if (pages < 2) { dealPager.innerHTML = ''; return; }
    const L = PG_ARIA[lang] || PG_ARIA.en, rtl = lang === 'ar';
    const chev = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    let nums = '';
    for (let k = 0; k < pages; k++) nums += `<button class="pg-num${k === dealPage ? ' on' : ''}" type="button" data-pg="${k}" aria-label="${L[2]} ${k + 1}"${k === dealPage ? ' aria-current="page"' : ''}>${k + 1}</button>`;
    dealPager.innerHTML =
      `<div class="pg-row"><button class="pg-arrow" type="button" data-pg="${dealPage - 1}" aria-label="${L[0]}"${dealPage === 0 ? ' disabled' : ''}>${chev(rtl ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6')}</button>` +
      `<div class="pg-nums">${nums}</div>` +
      `<button class="pg-arrow" type="button" data-pg="${dealPage + 1}" aria-label="${L[1]}"${dealPage === pages - 1 ? ' disabled' : ''}>${chev(rtl ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6')}</button></div>` +
      `<p class="pg-info" aria-live="polite">${(PG_TXT[lang] || PG_TXT.en)(from + 1, from + slice.length, total)}</p>`;
  }
  function dealGo(k) {
    const pages = Math.ceil(dealOrder.length / pageSize()); if (k < 0 || k >= pages || k === dealPage) return;
    const dir = k > dealPage ? 1 : -1; dealPage = k;
    renderDeals(window.__currentProductLang || 'en', dir); fillProductPhotos(); attachTiltHandlers();
    const sec = document.getElementById('deal-list'); if (sec && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ block: 'start' });
  }
  if (dealPager) dealPager.addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b && !b.disabled) dealGo(+b.dataset.pg); });
  if (dealGrid) { // swipe left/right on touch screens to change page
    let sx = 0, sy = 0, st = 0;
    dealGrid.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
    dealGrid.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * .6 || Date.now() - st > 700) return;
      const rtl = document.documentElement.dir === 'rtl'; dealGo(dealPage + ((dx < 0) !== rtl ? 1 : -1));
    }, { passive: true });
  }
  // Dashboard / backend hook:  window.__setDeals([{name, pct, ...}], { pageSize })  → re-renders the section + prices.
  window.__setDeals = function (list, cfg) {
    if (cfg && cfg.pageSize) DEALS_CFG.pageSize = cfg.pageSize;
    if (dealGrid) dealGrid.style.minHeight = '';
    applyDeals(list); dealPage = 0; renderProducts(window.__currentProductLang || 'en');
  };

  // ---- products: most popular first, 10 per page ----
  const PROD_PAGE_N = () => Math.min(48, Math.max(1, parseInt(window.__DD_SETTINGS && window.__DD_SETTINGS.products_per_page, 10) || 10)); let prodPage = 0, popSold = {};
  const prodPager = document.getElementById('prod-pager');
  function popOrder() {   // indexes of `products`, best sellers first (real sales when the backend is on, "Popular" tag otherwise)
    return products.map((p, i) => i).sort((a, b) => {
      const A = products[a], B = products[b], sa = popSold[A.name] || 0, sb = popSold[B.name] || 0;
      return (sb - sa) || ((B.tag === 'Popular') - (A.tag === 'Popular')) || (a - b);
    });
  }
  window.__setPopularity = function (rows) { popSold = {}; (rows || []).forEach((r) => { popSold[r.name] = +r.sold || 0; }); prodPage = 0; renderProducts(window.__currentProductLang || 'en'); };
  window.__resetProdPage = function () { prodPage = 0; };
  function prodGo(k) {
    prodPage = k; renderProducts(window.__currentProductLang || 'en', k > 0 ? 1 : -1);
    const sec = document.getElementById('categories'); if (sec) sec.scrollIntoView({ block: 'start' });
  }
  if (prodPager) prodPager.addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b && !b.disabled) prodGo(+b.dataset.pg); });
  function renderProducts(lang, dir) {
    window.__currentProductLang = lang;
    const list = popOrder().filter((i) => !(window.__catFilter && !window.__catFilter(products[i])));
    const pages = Math.max(1, Math.ceil(list.length / PROD_PAGE_N())); prodPage = Math.min(Math.max(0, prodPage), pages - 1);
    const from = prodPage * PROD_PAGE_N(), slice = list.slice(from, from + PROD_PAGE_N());
    grid.innerHTML = slice.map((i, k) => cardHTML(products[i], k, lang)).join('');
    grid.classList.remove('pg-next', 'pg-prev'); if (dir) { void grid.offsetWidth; grid.classList.add(dir > 0 ? 'pg-next' : 'pg-prev'); }
    if (prodPager) { prodPager.hidden = pages < 2; prodPager.innerHTML = pages < 2 ? '' : pagerHTML(prodPage, pages, lang, from, slice.length, list.length); }
    renderDeals(lang);
    fillProductPhotos();
    attachTiltHandlers();
    if (window.__ddSearchRefresh) window.__ddSearchRefresh();
  }

  function fillProductPhotos() {
    document.querySelectorAll('.product-photo').forEach(img => {
      const key = img.getAttribute('data-photo-key');
      const photos = getPhotos();
      if (photos[key]) img.src = photos[key];
    });
  }

  // 3D tilt + zoom hover effect — substitutes for true 360° rotation,
  // which would need 24-36 photos per product shot from different
  // angles. This gives an interactive, premium "product viewer" feel
  // using just the one photo we have per item.
  function attachTiltHandlers() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    const imgWrap = card.querySelector('.card-img');
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;  // 0 to 1
      const y = (e.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 18;   // left-right tilt
      const rotateX = (0.5 - y) * 14;   // up-down tilt
      card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      const img = imgWrap.querySelector('.product-photo');
      if (img) img.style.transform = `scale(1.12) translate(${(x-0.5)*-14}px, ${(y-0.5)*-14}px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      const img = imgWrap.querySelector('.product-photo');
      if (img) img.style.transform = '';
    });
    // light touch support: tap toggles a subtle tilt instead of hover
    card.addEventListener('touchstart', () => card.classList.toggle('tilt-touch'), { passive: true });
  });
  }

  window.__renderProductsForLang = renderProducts;
  renderProducts('en');
  if (DEALS_CFG.endpoint && window.fetch) {     // future backend: GET → { pageSize?, deals:[{ name, pct, active?, from?, until? }] }
    fetch(DEALS_CFG.endpoint, { headers: { Accept: 'application/json' } }).then((r) => r.ok ? r.json() : Promise.reject()).then((j) => window.__setDeals(j.deals || j, j)).catch(() => {});
  }

/* ---- block ---- */
  // Logo embedded once here and reused for every <img class="deshi-logo-img">
  // on the page, instead of duplicating the full image data in the HTML.
  const DESHI_LOGO = "img/logo.jpg";
  document.querySelectorAll('.deshi-logo-img').forEach(img => img.src = DESHI_LOGO);

/* ---- block ---- */
  // NOTE: keys below are legacy names — the picture inside each key is mapped to the right product in the catalogue above.
  window.__PRODUCT_PHOTOS__ = {
    "fl_beef": "img/p/fl_beef.jpg",
    "fl_chicken": "img/p/fl_chicken.jpg",
    "fl_cubes": "img/p/fl_cubes.jpg",
    "chicken_breast": "img/p/chicken_breast.jpg",
    "pepper": "img/p/pepper.jpg",
    "spinach": "img/p/spinach.jpg",
    "chicken_whole": "img/p/chicken_whole.jpg",
    "lamb": "img/p/lamb.jpg",
    "beef": "img/p/beef.jpg",
    "onion": "img/p/onion.jpg",
    "potato": "img/p/potato.jpg",
    "milk": "img/p/milk.jpg",
    "lentils": "img/p/lentils.jpg",
    "shrimp_bmr": "img/p/shrimp_bmr.jpg",
    "shrimp_censea": "img/p/shrimp_censea.jpg",
    "shrimp_dufers": "img/p/shrimp_dufers.jpg",
    "shrimp_box": "img/p/shrimp_box.jpg",
    "promo_chicken_row": "img/p/promo_chicken_row.jpg",
    "promo_koliza": "img/p/promo_koliza.jpg",
    "cater_meat": "img/p/cater_meat.jpg",
    "cater_chicken": "img/p/cater_chicken.jpg"
  };
  fillProductPhotos();   // first render ran before the photos existed — fill them in now

/* ---- block ---- */
  const BN = {
    "search_ph": "মাংস, সবজি, মুদি পণ্য খুঁজুন…",
    "eyebrow": "প্রতিদিন তাজা · আপনার দরজায় ডেলিভারি",
    "hero_h1": "মুদি, মাংস ও সবজি — সহজ উপায়ে।",
    "hero_p": "বিশ্বস্ত স্থানীয় সরবরাহকারীদের কাছ থেকে বাছাই করা মাংস, তাজা শাকসবজি এবং নিত্যপ্রয়োজনীয় পণ্য, আপনার সময়মতো ডেলিভারি।",
    "btn_shop": "এখনই কিনুন",
    "btn_browse": "ক্যাটাগরি দেখুন",
    "biz_h3": "কেন আমাদের থেকে কিনবেন",
    "biz_li1": "প্রথম অর্ডারে অথবা ১০০ পাউন্ডের বেশি যেকোনো অর্ডারে বিনামূল্যে ডেলিভারি।",
    "biz_li2": "হাতে জবাই জবিহা হালাল গরু ও মুরগি",
    "biz_li3": "নিখুঁতভাবে কাটা ও পরিষ্কার — রান্নার উপযোগী সাইজ",
    "biz_li4": "মাসিক মুদি সামগ্রী",
    "biz_area_label": "ডেলিভারি এলাকা:",
    "biz_area_cities": "Detroit, Hamtramck, Warren, Sterling Heights, Troy, Shelby Township",
    "biz_fee": "ন্যূনতম ডেলিভারি চার্জ $৯.৯৯ (মেট্রো ডেট্রয়েট)",
    "nav_all": "সকল পণ্য",
    "nav_meat": "মাংস ও পোল্ট্রি",
    "nav_produce": "সবজি",
    "nav_grocery": "মুদি",
    "nav_deals": "অফার",
    "nav_track": "অর্ডার ট্র্যাক করুন",
    "trust_1": "একই দিনে তাজা ডেলিভারি",
    "trust_2": "নিরাপদ চেকআউট",
    "trust_3": "অর্ডার ট্র্যাকিং",
    "trust_4": "বিশ্বস্ত স্থানীয় সরবরাহকারী",
    "cat_all": "সব",
    "cat_produce": "তাজা সবজি",
    "cat_dairy": "দুধ ও ডিম",
    "cat_pantry": "প্যান্ট্রি",
    "cat_bakery": "বেকারি",
    "cat_bev": "পানীয়",
    "cs4_soon": "শীঘ্রই",
    "biz_days_label": "ডেলিভারির দিন:",
    "biz_days": "শনিবার ও রবিবার, বিকেল ৩টা – রাত ৯টা",
    "tb1": "১০০% হালাল জবিহা মাংস",
    "tb2": "খামার-তাজা",
    "tb3": "হাতে জবাই",
    "tb4": "উচ্চ মান",
    "tb5": "নিরাপদ ও স্বাস্থ্যকর ডেলিভারি",
    "tb_line": "তাজা মাংস। বিশ্বস্ত উৎস। আপনার দরজায় পৌঁছে।",
    "featured_p": "স্বাস্থ্যকর, পরিচ্ছন্ন ও উচ্চমানের মাংস, পৌঁছে যাবে আপনার দরজায়।",
    "mn_free": "১০০ পাউন্ডের বেশি অর্ডারে ফ্রি ডেলিভারি",
    "mn_min": "ন্যূনতম ডেলিভারি চার্জ $৯.৯৯ (মেট্রো ডেট্রয়েট)",
    "mn_days": "শনি ও রবি · বিকেল ৩টা – রাত ৯টা",
    "sub_all": "সব মাংস",
    "sub_beef": "গরু",
    "sub_chicken": "মুরগি",
    "cat_fish": "মাছ",
    "cat_soon_badge": "শীঘ্রই",
    "soon_h": "শীঘ্রই আসছে",
    "soon_p": "আমরা এই বিভাগটি প্রস্তুত করছি। শীঘ্রই আবার দেখুন!",
    "soon_btn": "সব পণ্য দেখুন",
    "featured_h2": "খামার-তাজা জবিহা হালাল",
    "view_all": "সব দেখুন →",
    "cs1_tag": "স্বাগত অফার",
    "cs1_h": "প্রথম অর্ডারে বিনামূল্যে ডেলিভারি",
    "cs1_p": "অথবা ১০০ পাউন্ডের বেশি যেকোনো অর্ডারে।",
    "cs1_cta": "কেনাকাটা শুরু করুন",
    "cs1_b1": "ফ্রি",
    "cs1_b2": "ডেলিভারি",
    "cs2_tag": "১০০% জবিহা হালাল",
    "cs2_h": "খামার-তাজা জবিহা হালাল মাংস",
    "cs2_p": "হাতে জবাই, পরিষ্কার ও রান্নার উপযোগী করে কাটা।",
    "cs2_cta": "এখনই মাংস অর্ডার করুন",
    "cs2_pl": "মুরগির রান",
    "cs_lb": "/পাউন্ড",
    "cs3_tag": "প্রতিদিন তাজা",
    "cs3_h": "আপনার জন্য বাছাই করা তাজা সবজি",
    "cs3_p": "পালং শাক, পেঁয়াজ, আলু ও আরও অনেক কিছু — শীঘ্রই আসছে।",
    "cs3_cta": "সবজি কিনুন",
    "cs3_pl": "তাজা সবজি",
    "cs_bunch": "/আঁটি",
    "cs4_tag": "শীঘ্রই আসছে",
    "cs4_h": "মাসিক মুদি সামগ্রী",
    "cs4_p": "চাল, ডাল, দুধ, ডিম ও নিত্যপ্রয়োজনীয় মুদি। শীঘ্রই আসছে।",
    "cs4_cta": "পণ্য দেখুন",
    "cs4_pl": "মুদি সামগ্রী",
    "cs4_u": "/১০ পাউন্ড",
    "cs_see": "কী আসছে দেখুন",
    "cs6_h": "তাজা ও ফ্রোজেন মাছ",
    "cs6_p": "রুই, মৃগেল, শোল, কার্ফু ও চিংড়ি — পরিষ্কার ও রান্নার জন্য প্রস্তুত।",
    "cs6_pl": "মাছ",
    "cs6_tag": "তাজা ও ফ্রোজেন",
    "cs6_cta": "মাছ কিনুন",
    "cs_from": "শুরু",
    "cs7_tag": "সীমিত সময়ের অফার",
    "cs7_h": "৫টি শক্ত মুরগি কিনলে ১টি ফ্রি",
    "cs7_p": "খামার-তাজা জবিহা হালাল। বৃহস্পতিবারের মধ্যে অর্ডার করুন — শনি ও রবিবার ডেলিভারি।",
    "cs7_cta": "অফারটি নিন",
    "cs7_pl": "৫টি কিনলে",
    "cs7_pv": "১টি ফ্রি",
    "cs8_tag": "ফ্রি উপহার",
    "cs8_h": "পুরো একটি কলিজা ফ্রি",
    "cs8_p": "যেকোনো মাংস ১০০ পাউন্ড বা তার বেশি অর্ডারে। অফার ৩১ অক্টোবর ২০২৬ পর্যন্ত।",
    "cs8_cta": "১০০ পাউন্ড+ অর্ডার",
    "cs8_pl": "১০০ পাউন্ডে",
    "cs8_pv": "কলিজা ফ্রি",
    "cs9_tag": "ক্যাটারিং",
    "cs9_h": "ক্যাটারিং করছেন? মাংস আমরা পৌঁছে দিই",
    "cs9_p": "জবিহা হালাল গরু ও মুরগি, রান্নার উপযোগী করে কাটা। প্রথম ৩টি অর্ডারে বিশেষ ছাড় ও ফ্রি ডেলিভারি।",
    "cs9_cta": "ক্যাটারিং জানুন",
    "cs9_pl": "প্রথম ৩টি অর্ডার",
    "cs9_pv": "বিশেষ ছাড়",
    "deal_h": "অফার",
    "deal_sub": "টি পণ্যে ছাড়",
    "cs5_tag": "আমরা ডেলিভারি দিই",
    "cs5_h": "ডেলিভারি $৯.৯৯ থেকে",
    "cs5_p": "মেট্রো ডেট্রয়েট · শনি ও রবিবার, বিকেল ৩টা – রাত ৯টা",
    "cs5_cta": "এখনই অর্ডার করুন",
    "news_h3": "আপডেট পেতে যুক্ত থাকুন",
    "news_p": "মাংস, সবজি ও নিত্যপ্রয়োজনীয় পণ্যের সাপ্তাহিক অফার — সরাসরি আপনার ইনবক্সে।",
    "news_btn": "সাবস্ক্রাইব করুন",
    "footer_tagline": "বিশ্বস্ত স্থানীয় সরবরাহকারীদের কাছ থেকে তাজা মুদি, মাংস ও সবজি — দোকান থেকে দরজা পর্যন্ত।",
    "foot_shop_h": "কেনাকাটা",
    "foot_support_h": "সহায়তা",
    "foot_company_h": "কোম্পানি",
    "foot_delivery_info": "ডেলিভারি তথ্য",
    "foot_contact": "যোগাযোগ করুন",
    "foot_about": "আমাদের সম্পর্কে",
    "foot_terms": "শর্তাবলী",
    "foot_privacy": "গোপনীয়তা",
    "foot_copyright": "© ২০২৬ দেশি ড্রপ। সর্বস্বত্ব সংরক্ষিত।",
    "foot_tag": "হালাল গ্রোসারি · মেট্রো ডেট্রয়েট",
    "tab_home": "হোম",
    "tab_gallery": "গ্যালারি",
    "tab_quran": "কুরআন",
    "nav_quran": "কুরআন",
    "tab_search": "খুঁজুন",
    "tab_cart": "কার্ট",
    "tab_account": "অ্যাকাউন্ট",
    "pt_fajr": "ফজর", "pt_sunrise": "সূর্যোদয়", "pt_dhuhr": "যোহর", "pt_asr": "আসর", "pt_maghrib": "মাগরিব", "pt_isha": "এশা",
  };

  const AR = {
    "search_ph": "ابحث عن اللحوم والخضار والبقالة…",
    "eyebrow": "طازج يوميًا · يصلك إلى باب منزلك",
    "hero_h1": "البقالة واللحوم والخضار — بكل سهولة.",
    "hero_p": "لحوم مختارة بعناية، وخضروات طازجة، وأساسيات المؤونة من موردين محليين موثوقين، تصلك في الموعد الذي يناسبك.",
    "btn_shop": "تسوّق الآن",
    "btn_browse": "تصفّح الأقسام",
    "biz_h3": "لماذا تتسوق معنا",
    "biz_li1": "توصيل مجاني لطلبك الأول أو لأي طلب يزيد عن ١٠٠ رطل.",
    "biz_li2": "لحم بقري ودجاج حلال بالذبح اليدوي",
    "biz_li3": "مقطّعة ومنظّفة بإتقان — بأحجام جاهزة للطهي",
    "biz_li4": "مواد البقالة الشهرية",
    "biz_area_label": "منطقة التوصيل:",
    "biz_area_cities": "ديترويت، هامترامك، وارن، ستيرلنغ هايتس، تروي، شيلبي تاونشيب",
    "biz_fee": "الحد الأدنى لرسوم التوصيل ٩٫٩٩$ (ديترويت الكبرى)",
    "nav_all": "جميع المنتجات",
    "nav_meat": "اللحوم والدواجن",
    "nav_produce": "الخضار والفواكه",
    "nav_grocery": "البقالة",
    "nav_deals": "العروض",
    "nav_track": "تتبّع الطلب",
    "trust_1": "توصيل طازج في اليوم نفسه",
    "trust_2": "دفع آمن",
    "trust_3": "تتبّع الطلبات",
    "trust_4": "موردون محليون موثوقون",
    "cat_all": "الكل",
    "cat_produce": "منتجات طازجة",
    "cat_dairy": "الألبان والبيض",
    "cat_pantry": "المؤونة",
    "cat_bakery": "المخبوزات",
    "cat_bev": "المشروبات",
    "cs4_soon": "قريبًا",
    "biz_days_label": "أيام التوصيل:",
    "biz_days": "السبت والأحد، ٣ مساءً – ٩ مساءً",
    "tb1": "لحم ذبيحة حلال ١٠٠٪",
    "tb2": "طازج من المزرعة",
    "tb3": "ذبح يدوي",
    "tb4": "جودة عالية",
    "tb5": "توصيل آمن وصحي",
    "tb_line": "لحم طازج. مصدر موثوق. يصلك إلى بابك.",
    "featured_p": "لحوم صحية ونظيفة وعالية الجودة تصل إلى باب منزلك.",
    "mn_free": "توصيل مجاني للطلبات فوق ١٠٠ رطل",
    "mn_min": "الحد الأدنى لرسوم التوصيل ٩٫٩٩$ (ديترويت الكبرى)",
    "mn_days": "السبت والأحد · ٣ – ٩ مساءً",
    "sub_all": "كل اللحوم",
    "sub_beef": "بقري",
    "sub_chicken": "دجاج",
    "cat_fish": "السمك",
    "cat_soon_badge": "قريبًا",
    "soon_h": "قريبًا",
    "soon_p": "نعمل على تجهيز هذا القسم. عُد إلينا قريبًا!",
    "soon_btn": "تصفّح كل المنتجات",
    "featured_h2": "طازج من المزرعة، حلال مذبوح",
    "view_all": "عرض الكل ←",
    "cs1_tag": "عرض الترحيب",
    "cs1_h": "توصيل مجاني لطلبك الأول",
    "cs1_p": "أو لأي طلب يزيد عن ١٠٠ رطل.",
    "cs1_cta": "ابدأ التسوق",
    "cs1_b1": "مجاني",
    "cs1_b2": "توصيل",
    "cs2_tag": "ذبيحة حلال ١٠٠٪",
    "cs2_h": "لحوم حلال مذبوحة طازجة من المزرعة",
    "cs2_p": "ذبح يدوي، منظّفة ومقطّعة جاهزة للطهي.",
    "cs2_cta": "اطلب لحمك الآن",
    "cs2_pl": "فخذ دجاج",
    "cs_lb": "/رطل",
    "cs3_tag": "طازج يوميًا",
    "cs3_h": "خضار طازجة مختارة لك",
    "cs3_p": "سبانخ وبصل وبطاطس والمزيد — قريبًا.",
    "cs3_cta": "تسوق الخضار",
    "cs3_pl": "خضار طازجة",
    "cs_bunch": "/حزمة",
    "cs4_tag": "قريبًا",
    "cs4_h": "مواد البقالة الشهرية",
    "cs4_p": "أرز وعدس وحليب وبيض ومؤن المطبخ. قريبًا.",
    "cs4_cta": "تصفّح المنتجات",
    "cs4_pl": "مواد بقالة",
    "cs4_u": "/١٠ رطل",
    "cs_see": "اكتشف ما سيأتي",
    "cs6_h": "سمك طازج ومجمّد",
    "cs6_p": "روهو ومريغال وشول وكارفو وجمبري — منظّف وجاهز للطهي.",
    "cs6_pl": "سمك",
    "cs6_tag": "طازج ومجمّد",
    "cs6_cta": "تسوّق السمك",
    "cs_from": "من",
    "cs7_tag": "عرض لفترة محدودة",
    "cs7_h": "اشترِ ٥ دجاجات قاسية واحصل على واحدة مجانًا",
    "cs7_p": "ذبيحة حلال طازجة من المزرعة. اطلب قبل الخميس — التوصيل السبت والأحد.",
    "cs7_cta": "احصل على العرض",
    "cs7_pl": "عند شراء ٥",
    "cs7_pv": "١ مجانًا",
    "cs8_tag": "هدية مجانية",
    "cs8_h": "كبدة كاملة مجانًا",
    "cs8_p": "عند طلب ١٠٠ رطل أو أكثر من أي لحم. العرض حتى ٣١ أكتوبر ٢٠٢٦.",
    "cs8_cta": "اطلب ١٠٠ رطل+",
    "cs8_pl": "١٠٠ رطل+",
    "cs8_pv": "كبدة مجانًا",
    "cs9_tag": "تموين",
    "cs9_h": "تعمل في التموين؟ نوصّل لك اللحم",
    "cs9_p": "لحم بقري ودجاج ذبيحة حلال مقطّع جاهز للطهي. خصم خاص وتوصيل مجاني لأول ٣ طلبات.",
    "cs9_cta": "اسأل عن التموين",
    "cs9_pl": "أول ٣ طلبات",
    "cs9_pv": "خصم خاص",
    "deal_h": "العروض",
    "deal_sub": "منتجات بخصم",
    "cs5_tag": "نوصّل إليك",
    "cs5_h": "التوصيل يبدأ من ٩٫٩٩$",
    "cs5_p": "ديترويت الكبرى · السبت والأحد، ٣ مساءً – ٩ مساءً",
    "cs5_cta": "اطلب الآن",
    "news_h3": "ابقَ على اطلاع",
    "news_p": "عروض أسبوعية على اللحوم والخضار والمؤونة — مباشرة إلى بريدك الإلكتروني.",
    "news_btn": "اشترك",
    "footer_tagline": "بقالة ولحوم وخضار طازجة من موردين محليين موثوقين — من المتجر إلى الباب.",
    "foot_shop_h": "تسوّق",
    "foot_support_h": "الدعم",
    "foot_company_h": "الشركة",
    "foot_delivery_info": "معلومات التوصيل",
    "foot_contact": "اتصل بنا",
    "foot_about": "من نحن",
    "foot_terms": "الشروط",
    "foot_privacy": "الخصوصية",
    "foot_copyright": "© ٢٠٢٦ ديشي دروب. جميع الحقوق محفوظة.",
    "foot_tag": "بقالة حلال · ديترويت الكبرى",
    "tab_home": "الرئيسية",
    "tab_gallery": "المعرض",
    "tab_quran": "القرآن",
    "nav_quran": "القرآن",
    "tab_search": "بحث",
    "tab_cart": "السلة",
    "tab_account": "حسابي",
    "pt_fajr": "الفجر", "pt_sunrise": "الشروق", "pt_dhuhr": "الظهر", "pt_asr": "العصر", "pt_maghrib": "المغرب", "pt_isha": "العشاء",
  };
  const DICTS = { bn: BN, ar: AR };

  // Language toggle: captures original English text once, then swaps
  // between it and the Bangla dictionary above.
  const EN = {};
  document.querySelectorAll('[data-i18n]').forEach(el => {
    EN[el.getAttribute('data-i18n')] = el.textContent;
  });
  const EN_PH = {};
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    EN_PH[el.getAttribute('data-i18n-ph')] = el.getAttribute('placeholder');
  });

  const dbText = (lang, key) => { const T = window.__DD_TEXT; return T && T[lang] && T[lang][key] || ''; };
  /* delivery fee shown in texts follows Dashboard -> Settings (built-in texts say 9.99) */
  window.__ddFee = (s, lang) => {
    const f = window.__DD_SETTINGS && Number(window.__DD_SETTINGS.delivery_fee);
    if (!(f >= 0) || f === 9.99 || typeof s !== 'string') return s;
    const n = f.toFixed(2), bn = n.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]), ar = n.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]).replace('.', '٫');
    return s.split('9.99').join(n).split('৯.৯৯').join(bn).split('٩٫٩٩').join(ar);
  };
  function setLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    const D = DICTS[lang];
    if (window.__renderProductsForLang) window.__renderProductsForLang(lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = window.__ddFee(dbText(lang, key) || (D && D[key]) || EN[key], lang);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      el.setAttribute('placeholder', dbText(lang, 'ph:' + key) || (D && D[key]) || EN_PH[key]);
    });
    document.querySelectorAll('.lang-opt').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    if (window.__onLangChange) window.__onLangChange(lang);
    document.dispatchEvent(new CustomEvent('ddlang', { detail: lang }));
  }

  // Called by js/backend.js with live data from the database (products, deals, site text, settings).
  window.__ddBackendData = function (d) {
    if (d.products && d.products.length) {
      products.splice(0, products.length, ...d.products.map((r) => ({
        id: r.id, name: r.name, name_bn: r.name_bn || '', name_ar: r.name_ar || '', cat: r.category, cat_bn: r.category_bn || '', cat_ar: r.category_ar || '',
        sub: r.sub || undefined, price: '$' + Number(r.price).toFixed(2), unit: r.unit, tag: r.tag || undefined, icon: r.icon || undefined,
        photo: r.photo_key || undefined, image_url: r.image_url || undefined, halal: !!r.halal, in_stock: r.in_stock !== false
      })));
    }
    if (d.settings && +d.settings.deals_page_size > 0) DEALS_CFG.pageSize = +d.settings.deals_page_size;
    if (d.settings) { window.__DD_SETTINGS = d.settings; document.body.classList.toggle('no-sticky', d.settings.sticky_menu === false); }
    if (d.settings) {
      const okU = (u) => /^https:\/\//i.test(String(u || '')), SI = d.settings.site_images, GE = d.settings.gallery_extra;
      if (SI && typeof SI === 'object') {
        if (okU(SI.logo)) { window.__DD_LOGO = SI.logo; document.querySelectorAll('.deshi-logo-img').forEach((i) => { i.src = SI.logo; }); }
        window.__SLIDE_IMG_OVR = SI.slides || {};
      }
      const G = window.DD_GALLERY;
      if (G && Array.isArray(G.items)) {
        const hide = (SI && Array.isArray(SI.gallery_hidden)) ? SI.gallery_hidden : [];
        G.items.forEach((it) => { const u = SI && SI.gallery && SI.gallery[it.id]; if (okU(u)) { it.src = u; delete it.photo; } });
        if (hide.length) G.items = G.items.filter((it) => hide.indexOf(it.id) < 0);
        if (Array.isArray(GE)) GE.forEach((x) => { if (x && okU(x.src) && !G.items.some((it) => it.id === x.id)) G.items.push({ id: String(x.id), src: x.src, cat: x.cat || 'offers', date: x.date || '2026-01-01', title: x.title || { en: '' }, caption: x.caption || { en: '' } }); });
      }
    }
    if (d.content) window.__DD_TEXT = d.content;
    if (d.settings && Array.isArray(d.settings.carousel) && window.__ddSlidesSet) window.__ddSlidesSet(d.settings.carousel); else if (window.__ddSlidesSet && window.__SLIDE_IMG_OVR) window.__ddSlidesSet();
    if (d.promos) window.__PROMOS = d.promos;
    if (d.popular) window.__setPopularity(d.popular);
    if (d.deals) { if (dealGrid) dealGrid.style.minHeight = ''; applyDeals(d.deals); dealPage = 0; }
    setLang(window.__currentProductLang || document.documentElement.lang || 'en');
  };

  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')));
  });


/* ---- Welcome popup: delivery info + random Quran verse ---- */
(function () {
  // Pool lives in js/verses.js. No verse repeats within 30 minutes of being shown
  // (tracked per browser); if every verse is on cooldown, the longest-ago one is reused.
  const POOL = window.DD_VERSES || [];
  const COOLDOWN = 30 * 60 * 1000, KEY = 'dd_verse_seen';
  const id = (x) => x.s + ':' + x.a;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { seen = {}; }
  const nowMs = Date.now();
  Object.keys(seen).forEach((k) => { if (nowMs - seen[k] >= COOLDOWN || seen[k] > nowMs) delete seen[k]; });
  let avail = POOL.filter((x) => !(id(x) in seen));
  if (!avail.length) {
    avail = POOL.slice().sort((a, b) => (seen[id(a)] || 0) - (seen[id(b)] || 0)).slice(0, 1);
  }
  const v = avail[Math.floor(Math.random() * avail.length)];
  seen[id(v)] = nowMs;
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {}
  document.getElementById('verse-ar').textContent = v.ar;
  document.getElementById('verse-en').textContent = v.en;
  document.getElementById('verse-bn').textContent = v.bn;
  document.getElementById('verse-ref').textContent = 'Surah ' + v.sn + ' ' + v.s + ':' + v.a + ' · সূরা ' + v.sb + ' ' + String(v.s + ':' + v.a).replace(/\d/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]);

  const pop = document.getElementById('welcome');
  const closeBtn = document.getElementById('welcome-close');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = false;
  function closePopup() {
    if (closing || pop.hidden) return;
    closing = true;
    document.removeEventListener('keydown', onKey);
    const finish = () => { pop.hidden = true; pop.classList.remove('closing'); document.body.classList.remove('modal-open'); closing = false; };
    if (reduce) { finish(); return; }
    pop.classList.add('closing');           // exit animation (fade + card sinks), then hide
    setTimeout(finish, 260);
  }
  function onKey(e) {
    if (e.key === 'Escape') { closePopup(); return; }
    if (e.key !== 'Tab') return;                       // keep keyboard focus inside the dialog
    const f = [].filter.call(pop.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'), (n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  closeBtn.addEventListener('click', closePopup);
  document.getElementById('welcome-go').addEventListener('click', closePopup);
  pop.addEventListener('click', (e) => { if (e.target === pop) closePopup(); });
  pop.hidden = false;
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onKey);
  closeBtn.focus();
})();

/* ---- Prayer times + live "next prayer" countdown: IONA Masjid (28630 Ryan Rd, Warren, MI) ----
   Times are calculated on the device with the ISNA method (Fajr/Isha 15°, standard Asr). The UTC offset is
   read from the America/Detroit zone for each date, so daylight saving is handled automatically.
   The countdown always targets the next upcoming event in this order:
   Fajr -> Sunrise -> Dhuhr -> Asr -> Maghrib -> Isha -> (tomorrow's) Fajr. */
(function () {
  const LAT = 42.51, LNG = -83.03, TZ = 'America/Detroit';
  const rad = Math.PI / 180, fix = (x, n) => ((x % n) + n) % n;
  const sin = (d) => Math.sin(d * rad), cos = (d) => Math.cos(d * rad), tan = (d) => Math.tan(d * rad);
  const DT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const pad = (n) => String(n).padStart(2, '0');

  function detroitParts(date) {
    const p = {};
    DT.formatToParts(date).forEach((x) => { if (x.type !== 'literal') p[x.type] = +x.value; });
    return p;
  }

  function compute(y, m, d) {
    const noonUTC = Date.UTC(y, m - 1, d, 12);
    const w = detroitParts(new Date(noonUTC));
    const tz = (Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - noonUTC) / 3600000;
    const D = noonUTC / 86400000 - 10957.5; // days since J2000
    const g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix(Math.atan2(cos(e) * sin(L), cos(L)) / rad / 15, 24);
    const eqtN = (((q / 15 - RA) + 12) % 24 + 24) % 24 - 12;
    const decl = Math.asin(sin(e) * sin(L)) / rad;
    const noon = 12 + tz - LNG / 15 - eqtN;
    const T = (ang) => Math.acos((-sin(ang) - sin(decl) * sin(LAT)) / (cos(decl) * cos(LAT))) / rad / 15;
    const asrAng = -Math.atan(1 / (1 + tan(Math.abs(LAT - decl)))) / rad;
    return { tz, fajr: noon - T(15), sunrise: noon - T(0.833), dhuhr: noon, asr: noon + T(asrAng), maghrib: noon + T(0.833), isha: noon + T(15) };
  }
  const cache = {};
  const dayInfo = (y, m, d) => cache[y + '-' + m + '-' + d] || (cache[y + '-' + m + '-' + d] = compute(y, m, d));

  const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  // absolute instants (ms) of each event for one Detroit calendar day, rounded to the minute like the displayed times
  function events(y, m, d) {
    const c = dayInfo(y, m, d), base = Date.UTC(y, m - 1, d);
    return ORDER.map((k) => ({ k, t: base + Math.round(c[k] * 60) * 60000 - c.tz * 3600000 }));
  }
  function clock12(h) {
    const mins = Math.round(fix(h, 24) * 60) % 1440, hh = Math.floor(mins / 60), mm = mins % 60;
    return { t: (hh % 12 || 12) + ':' + pad(mm), s: hh < 12 ? 'AM' : 'PM' };
  }

  // ---- localisation ----
  const DIG = { bn: '০১২৩৪৫৬৭৮৯', ar: '٠١٢٣٤٥٦٧٨٩' };
  const NAMES = {
    en: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    bn: { fajr: 'ফজর', sunrise: 'সূর্যোদয়', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' },
    ar: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  };
  const CAP = { en: 'Next', bn: 'পরবর্তী', ar: 'التالي' };
  let lang = 'en';
  const num = (s) => DIG[lang] ? s.replace(/\d/g, (c) => DIG[lang][+c]) : s;

  // ---- dates: English MM/DD/YYYY · Bangla (Bangladesh revised calendar) · Hijri (Umm al-Qura) in Arabic ----
  // Moon-sighting adjustment: set HIJRI_OFFSET to -1 / +1, or test with ?hijri=-1 in the page URL.
  const HIJRI_OFFSET = (() => { const m = /[?&]hijri=(-?\d)/.exec(location.search); return m ? +m[1] : 0; })();
  const BN_MONTHS = ['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];
  const BN_STARTS = [[1,14,9],[2,13,10],[3,15,11],[4,14,0],[5,15,1],[6,15,2],[7,16,3],[8,16,4],[9,16,5],[10,16,6],[11,15,7],[12,15,8]];
  function banglaDate(y, m, d) {
    const t = m * 100 + d;
    let st = [12, 15, 8], sy = y - 1;
    BN_STARTS.forEach((s) => { if (s[0] * 100 + s[1] <= t) { st = s; sy = y; } });
    const day = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, st[0] - 1, st[1])) / 86400000) + 1;
    const year = t >= 414 ? y - 593 : y - 594;
    const bd = (n) => String(n).replace(/\d/g, (c) => DIG.bn[+c]);
    return bd(day) + ' ' + BN_MONTHS[st[2]] + ' ' + bd(year);
  }
  const HIJRI = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
  function dateLabel(p) {
    if (lang === 'bn') return banglaDate(p.year, p.month, p.day);
    if (lang === 'ar') return HIJRI.format(new Date(Date.UTC(p.year, p.month - 1, p.day, 12) + HIJRI_OFFSET * 86400000));
    return pad(p.month) + '/' + pad(p.day) + '/' + p.year;
  }

  // ---- DOM ----
  const el = { cap: document.getElementById('dd-next-cap'), name: document.getElementById('dd-next-name'), time: document.getElementById('dd-next-time'), date: document.getElementById('dd-date') };
  const cells = {};
  document.querySelectorAll('#wl-prayer-row li').forEach((li) => { cells[li.dataset.p] = li; });
  const setText = (n, v) => { if (n && n.textContent !== v) n.textContent = v; };
  let lastNext = '', lastLang = '', lastDay = '';

  function tick() {
    const nowMs = Date.now(), p = detroitParts(new Date(nowMs));
    let nx = events(p.year, p.month, p.day).find((e) => e.t > nowMs);
    if (!nx) { // after Isha: count down to tomorrow's Fajr
      const n = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
      nx = events(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate())[0];
    }
    const s = Math.max(0, Math.ceil((nx.t - nowMs) / 1000));
    setText(el.time, num(pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60)));

    const day = p.year + '-' + p.month + '-' + p.day;
    if (nx.k !== lastNext || lang !== lastLang || day !== lastDay) {
      setText(el.cap, CAP[lang]); setText(el.name, NAMES[lang][nx.k]); setText(el.date, num(dateLabel(p)));
      if (day !== lastDay) { // popup grid: today's times (English), refreshed once per day
        const c = dayInfo(p.year, p.month, p.day);
        ORDER.forEach((k) => { const f = clock12(c[k]), li = cells[k]; if (li) li.querySelector('.pt').innerHTML = f.t + '<small>' + f.s + '</small>'; });
      }
      ORDER.forEach((k) => { if (cells[k]) cells[k].classList.toggle('next', k === nx.k); });
      lastNext = nx.k; lastLang = lang; lastDay = day;
    }
  }

  window.__onLangChange = (l) => { lang = l; tick(); };
  tick();
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
})();

/* ---- WhatsApp: open the chat directly ----
   Android: intent link opens the app with no chooser (falls back to WhatsApp Web).
   iPhone: plain https://wa.me link (universal link) opens the app straight from a tap.
   Desktop: WhatsApp Web. */
(function () {
  const link = document.getElementById('wa-link');
  if (!link) return;
  const NUM = '19473764749'; // +1 947 376 4749
  link.addEventListener('click', (e) => {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
      e.preventDefault();
      const fb = encodeURIComponent('https://wa.me/' + NUM);
      window.location.href = 'intent://send/?phone=' + NUM + '#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=' + fb + ';end';
    } else if (!/iPhone|iPad|iPod/i.test(ua) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform))) {
      e.preventDefault();
      window.open('https://web.whatsapp.com/send?phone=' + NUM, '_blank', 'noopener');
    }
    // iOS: let the normal link run (same tab, no script in the way)
  });
})();
