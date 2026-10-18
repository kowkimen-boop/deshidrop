/* Deshi Drop — gallery photos shown to EVERY visitor.
   To add a photo: 1) copy the image into the gallery/ folder, 2) add one line to `items` below, 3) upload to GitHub.
   Fields: id (unique), src (path like "gallery/my-photo.jpg"), cat (a category id below), date (YYYY-MM-DD, newest first),
           title / caption: { en, bn, ar }  (bn and ar are optional — English is used when missing).
   Optional: video: "gallery/clip.mp4" (shows a play badge; plays in the viewer, `src` is then the poster image).
   Photos added with the "Add photos" button on the Gallery page are saved on that device only. */
window.DD_GALLERY = {
  categories: [
    { id: 'meat',     en: 'Meat',          bn: 'মাংস',            ar: 'لحوم' },
    { id: 'produce',  en: 'Fresh produce', bn: 'তাজা সবজি',       ar: 'خضار طازجة' },
    { id: 'pantry',   en: 'Pantry & dairy', bn: 'মুদি ও দুগ্ধজাত', ar: 'مؤن وألبان' },
    { id: 'offers',   en: 'Offers',        bn: 'অফার',            ar: 'عروض' },
    { id: 'delivery', en: 'Deliveries',    bn: 'ডেলিভারি',         ar: 'التوصيل' },
    { id: 'store',    en: 'Our store',     bn: 'আমাদের স্টোর',     ar: 'متجرنا' }
  ],
  items: [
    { id: 'price-list', src: 'gallery/price-list.jpg', cat: 'offers', date: '2026-10-17',
      title: { en: 'Zabiha Halal price list', bn: 'জবিহা হালাল মূল্যতালিকা', ar: 'قائمة أسعار الذبيحة الحلال' },
      caption: { en: 'Beef and chicken prices, delivery days and how to order.', bn: 'গরু ও মুরগির দাম, ডেলিভারির দিন ও অর্ডারের উপায়।', ar: 'أسعار لحم البقر والدجاج وأيام التوصيل وطريقة الطلب.' } },
    { id: 'beef-cubes', photo: 'fl_cubes', cat: 'meat', date: '2026-10-16',
      title: { en: 'Premium beef cubes', bn: 'প্রিমিয়াম গরুর কিউব', ar: 'مكعبات لحم بقري فاخرة' },
      caption: { en: 'Perfectly cut and cleaned, ready to cook.', bn: 'নিখুঁতভাবে কাটা ও পরিষ্কার, রান্নার জন্য প্রস্তুত।', ar: 'مقطّعة ومنظّفة بإتقان وجاهزة للطهي.' } },
    { id: 'beef-cuts', photo: 'fl_beef', cat: 'meat', date: '2026-10-15',
      title: { en: 'Beef with bones', bn: 'হাড়সহ গরুর মাংস', ar: 'لحم بقري مع العظم' },
      caption: { en: 'Hand-slaughtered Zabiha Halal beef.', bn: 'হাতে জবাই জবিহা হালাল গরুর মাংস।', ar: 'لحم بقري حلال مذبوح يدويًا.' } },
    { id: 'beef-steak', photo: 'beef', cat: 'meat', date: '2026-10-14',
      title: { en: 'Fresh beef steak cut', bn: 'তাজা গরুর স্টেক কাট', ar: 'شريحة ستيك بقري طازجة' },
      caption: { en: 'Zero-fat meat, trimmed by hand.', bn: 'জিরো ফ্যাট মাংস, হাতে ছাঁটা।', ar: 'لحم بدون دهن مقطّع يدويًا.' } },
    { id: 'chicken-whole', photo: 'onion', cat: 'meat', date: '2026-10-13',
      title: { en: 'Whole fresh chicken', bn: 'গোটা তাজা মুরগি', ar: 'دجاجة كاملة طازجة' },
      caption: { en: 'Farm-fresh and hygienically prepared.', bn: 'খামার-তাজা ও স্বাস্থ্যসম্মতভাবে প্রস্তুত।', ar: 'طازجة من المزرعة ومجهّزة بنظافة.' } },
    { id: 'chicken-breast', photo: 'potato', cat: 'meat', date: '2026-10-12',
      title: { en: 'Chicken breast', bn: 'মুরগির ব্রেস্ট', ar: 'صدر دجاج' },
      caption: { en: 'Lean, tender and ready for the pan.', bn: 'নরম ও চর্বিহীন, রান্নার জন্য তৈরি।', ar: 'طري وقليل الدهن وجاهز للطهي.' } },
    { id: 'chicken-pieces', photo: 'fl_chicken', cat: 'meat', date: '2026-10-11',
      title: { en: 'Chicken, cleaned & ready', bn: 'পরিষ্কার মুরগি, রান্নার প্রস্তুত', ar: 'دجاج منظّف وجاهز' },
      caption: { en: 'Soft and hard chicken available.', bn: 'নরম ও শক্ত মুরগি পাওয়া যায়।', ar: 'دجاج طري وقاسي متوفر.' } },
    { id: 'ground-beef', photo: 'lamb', cat: 'meat', date: '2026-10-10',
      title: { en: 'Seasoned beef patties', bn: 'মসলা মাখানো বিফ প্যাটি', ar: 'أقراص لحم بقري متبّلة' },
      caption: { en: 'Fresh ground beef, shaped by hand.', bn: 'তাজা কিমা, হাতে গড়া।', ar: 'لحم مفروم طازج مشكّل يدويًا.' } },
    { id: 'spinach', photo: 'milk', cat: 'produce', date: '2026-10-09',
      title: { en: 'Fresh spinach', bn: 'তাজা পালং শাক', ar: 'سبانخ طازجة' },
      caption: { en: 'Crisp green bunches, picked for you.', bn: 'সতেজ সবুজ আঁটি, আপনার জন্য বাছাই করা।', ar: 'حزم خضراء مقرمشة مختارة لك.' } },
    { id: 'onions', photo: 'chicken_whole', cat: 'produce', date: '2026-10-08',
      title: { en: 'Yellow onions', bn: 'হলুদ পেঁয়াজ', ar: 'بصل أصفر' },
      caption: { en: 'Kitchen staple, sold by the bag.', bn: 'রান্নাঘরের অপরিহার্য, ব্যাগে বিক্রি।', ar: 'أساس المطبخ يُباع بالكيس.' } },
    { id: 'potatoes', photo: 'chicken_breast', cat: 'produce', date: '2026-10-07',
      title: { en: 'Russet potatoes', bn: 'রাসেট আলু', ar: 'بطاطس روسيت' },
      caption: { en: 'Great for frying, baking and curries.', bn: 'ভাজা, বেক ও তরকারির জন্য দারুণ।', ar: 'ممتازة للقلي والخبز والكاري.' } },
    { id: 'lentils', photo: 'lentils', cat: 'pantry', date: '2026-10-06',
      title: { en: 'Red lentils', bn: 'মসুর ডাল', ar: 'عدس أحمر' },
      caption: { en: 'Pantry staple for daal and soups.', bn: 'ডাল ও স্যুপের জন্য নিত্যপ্রয়োজনীয়।', ar: 'أساسي للدال والشوربة.' } },
    { id: 'milk', photo: 'spinach', cat: 'pantry', date: '2026-10-05',
      title: { en: 'Fresh whole milk', bn: 'তাজা দুধ', ar: 'حليب طازج كامل الدسم' },
      caption: { en: 'Cold, creamy and delivered fresh.', bn: 'ঠান্ডা, ক্রিমি ও তাজা পৌঁছে দেওয়া।', ar: 'بارد وكريمي ويصلك طازجًا.' } },
    { id: 'eggs', photo: 'pepper', cat: 'pantry', date: '2026-10-04',
      title: { en: 'Large eggs', bn: 'বড় ডিম', ar: 'بيض كبير' },
      caption: { en: 'A dozen fresh eggs.', bn: 'এক ডজন তাজা ডিম।', ar: 'دزينة بيض طازج.' } }
  ]
};
