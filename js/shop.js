/* Deshi Drop — shop layer: sticky header bars, cart drawer, account page (sign up / sign in / social).
   Prototype note: everything is stored in this browser (localStorage). A real store would keep carts,
   users and orders on the server (WooCommerce) — the UI and flow here carry over unchanged. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DD = () => window.__DD;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode / quota */ } }
  };
  const SS = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ------------------------------------------------------------------ i18n (EN / BN / AR) */
  const T = {
    en: {
      back_shop: 'Back to shop', close: 'Close', add_to_cart: 'Add to cart', added: 'added to cart', view_cart: 'View cart',
      open_cart: 'Open cart', my_account: 'My account', item: 'item', items: 'items',
      free_lbl: 'FREE', promo_more: 'Add {n} more lb of meat to get a free {item}', promo_more_buy: 'Add {n} more to get 1 free',
      cart_title: 'Your Cart', cart_empty: 'Your cart is empty', cart_empty_sub: 'Add fresh meat, produce and groceries to get started.',
      cart_start: 'Start Shopping', cart_subtotal: 'Subtotal', cart_note: 'Delivery fee is calculated at checkout (from $9.99).',
      cart_checkout: 'Checkout', cart_clear: 'Clear cart', remove: 'Remove', each: 'each', dec: 'Decrease quantity', inc: 'Increase quantity',
      co_title: 'Confirm Order', co_address: 'Delivery address', co_phone: 'Phone', co_notes: 'Notes (optional)', co_place: 'Place order', co_back: 'Back to cart',
      co_proto: 'Prototype: your order is saved on this device only and payment is not connected yet.', co_total: 'Total (before delivery)',
      co_done: 'Order placed!', co_done_sub: 'Your order {id} has been saved. You can see it in your account.', co_orders: 'View my orders',
      e_addr: 'Please enter your delivery address.', e_phone: 'Please enter a valid phone number.', need_signin: 'Please sign in to place your order.',
      acct_title: 'My Account', acct_eyebrow: 'Deshi Drop account', acct_h1: 'Welcome back', acct_sub: 'Sign in or create an account to order faster and track your orders.',
      tab_signin: 'Sign In', tab_signup: 'Sign Up', f_name: 'Full name', f_email: 'Email', f_phone: 'Phone (optional)', f_pass: 'Password', f_pass2: 'Confirm password',
      show: 'Show', hide: 'Hide', forgot: 'Forgot password?', terms: 'I agree to the Terms and Privacy Policy', btn_signin: 'Sign In', btn_signup: 'Create Account',
      or_with: 'or continue with', continue_with: 'Continue with {p}', sw_signup: 'New here? Create an account', sw_signin: 'Already have an account? Sign in',
      e_name: 'Please enter your name.', e_email: 'Enter a valid email address.', e_pass: 'Password must be at least 8 characters.', e_pass2: 'Passwords do not match.',
      e_terms: 'Please accept the terms to continue.', e_exists: 'An account with this email already exists. Try signing in.', e_bad: 'Email or password is incorrect.',
      e_social_acct: 'This account was created with {p}. Please use that button to sign in.', e_social: 'Sign-in with {p} was cancelled or failed. Please try again.',
      e_need_pw: 'Enter your password.', forgot_msg: 'Password reset by email needs the live store backend. For now, create a new account or message us on WhatsApp.',
      welcome: 'Welcome, {name}', signed_via: 'Signed in with {p}', p_email: 'email', orders_h: 'My orders', orders_none: 'No orders yet. Your orders will appear here.',
      sign_out: 'Sign out', keep_shopping: 'Continue shopping', signed_out: 'You have been signed out.', created: 'Account created. Welcome!', signed_in: 'Signed in. Welcome back!',
      demo_note: 'Demo sign-in: add your {p} app ID in js/config.js to use real {p} accounts.', status_received: 'Received', order_n: 'Order', addr: 'Delivery to'
    },
    bn: {
      back_shop: 'দোকানে ফিরুন', close: 'বন্ধ করুন', add_to_cart: 'কার্টে যোগ করুন', added: 'কার্টে যোগ হয়েছে', view_cart: 'কার্ট দেখুন',
      open_cart: 'কার্ট খুলুন', my_account: 'আমার অ্যাকাউন্ট', item: 'টি পণ্য', items: 'টি পণ্য',
      free_lbl: 'ফ্রি', promo_more: 'আর {n} পাউন্ড মাংস নিলে {item} ফ্রি', promo_more_buy: 'আর {n}টি নিলে ১টি ফ্রি',
      cart_title: 'আপনার কার্ট', cart_empty: 'আপনার কার্ট খালি', cart_empty_sub: 'তাজা মাংস, সবজি ও মুদি পণ্য যোগ করে শুরু করুন।',
      cart_start: 'কেনাকাটা শুরু করুন', cart_subtotal: 'সাবটোটাল', cart_note: 'ডেলিভারি ফি চেকআউটে হিসাব হবে (৯.৯৯ ডলার থেকে)।',
      cart_checkout: 'চেকআউট', cart_clear: 'কার্ট খালি করুন', remove: 'সরান', each: 'প্রতিটি', dec: 'পরিমাণ কমান', inc: 'পরিমাণ বাড়ান',
      co_title: 'অর্ডার নিশ্চিত করুন', co_address: 'ডেলিভারির ঠিকানা', co_phone: 'ফোন', co_notes: 'নোট (ঐচ্ছিক)', co_place: 'অর্ডার করুন', co_back: 'কার্টে ফিরুন',
      co_proto: 'প্রোটোটাইপ: আপনার অর্ডার শুধু এই ডিভাইসে সংরক্ষিত হবে এবং পেমেন্ট এখনও যুক্ত হয়নি।', co_total: 'মোট (ডেলিভারি ছাড়া)',
      co_done: 'অর্ডার সম্পন্ন!', co_done_sub: 'আপনার অর্ডার {id} সংরক্ষিত হয়েছে। অ্যাকাউন্টে দেখতে পারবেন।', co_orders: 'আমার অর্ডার দেখুন',
      e_addr: 'ডেলিভারির ঠিকানা লিখুন।', e_phone: 'সঠিক ফোন নম্বর দিন।', need_signin: 'অর্ডার করতে সাইন ইন করুন।',
      acct_title: 'আমার অ্যাকাউন্ট', acct_eyebrow: 'দেশি ড্রপ অ্যাকাউন্ট', acct_h1: 'স্বাগতম', acct_sub: 'দ্রুত অর্ডার করতে ও অর্ডার ট্র্যাক করতে সাইন ইন বা অ্যাকাউন্ট খুলুন।',
      tab_signin: 'সাইন ইন', tab_signup: 'সাইন আপ', f_name: 'পূর্ণ নাম', f_email: 'ইমেইল', f_phone: 'ফোন (ঐচ্ছিক)', f_pass: 'পাসওয়ার্ড', f_pass2: 'পাসওয়ার্ড নিশ্চিত করুন',
      show: 'দেখান', hide: 'লুকান', forgot: 'পাসওয়ার্ড ভুলে গেছেন?', terms: 'আমি শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত', btn_signin: 'সাইন ইন', btn_signup: 'অ্যাকাউন্ট খুলুন',
      or_with: 'অথবা এর মাধ্যমে চালিয়ে যান', continue_with: '{p} দিয়ে চালিয়ে যান', sw_signup: 'নতুন? অ্যাকাউন্ট খুলুন', sw_signin: 'আগেই অ্যাকাউন্ট আছে? সাইন ইন করুন',
      e_name: 'আপনার নাম লিখুন।', e_email: 'সঠিক ইমেইল দিন।', e_pass: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।', e_pass2: 'পাসওয়ার্ড মিলছে না।',
      e_terms: 'চালিয়ে যেতে শর্তে সম্মত হন।', e_exists: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। সাইন ইন করুন।', e_bad: 'ইমেইল বা পাসওয়ার্ড ভুল।',
      e_social_acct: 'এই অ্যাকাউন্ট {p} দিয়ে খোলা হয়েছে। অনুগ্রহ করে সেই বোতাম দিয়ে সাইন ইন করুন।', e_social: '{p} দিয়ে সাইন ইন বাতিল বা ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
      e_need_pw: 'পাসওয়ার্ড লিখুন।', forgot_msg: 'ইমেইলে পাসওয়ার্ড রিসেট করতে লাইভ স্টোর ব্যাকএন্ড লাগবে। আপাতত নতুন অ্যাকাউন্ট খুলুন বা হোয়াটসঅ্যাপে মেসেজ করুন।',
      welcome: 'স্বাগতম, {name}', signed_via: '{p} দিয়ে সাইন ইন করা হয়েছে', p_email: 'ইমেইল', orders_h: 'আমার অর্ডার', orders_none: 'এখনও কোনো অর্ডার নেই। আপনার অর্ডার এখানে দেখা যাবে।',
      sign_out: 'সাইন আউট', keep_shopping: 'কেনাকাটা চালিয়ে যান', signed_out: 'আপনি সাইন আউট করেছেন।', created: 'অ্যাকাউন্ট তৈরি হয়েছে। স্বাগতম!', signed_in: 'সাইন ইন হয়েছে। আবার স্বাগতম!',
      demo_note: 'ডেমো সাইন ইন: আসল {p} অ্যাকাউন্ট ব্যবহার করতে js/config.js-এ আপনার {p} অ্যাপ আইডি দিন।', status_received: 'গৃহীত', order_n: 'অর্ডার', addr: 'ডেলিভারির ঠিকানা'
    },
    ar: {
      back_shop: 'العودة إلى المتجر', close: 'إغلاق', add_to_cart: 'أضف إلى السلة', added: 'أُضيف إلى السلة', view_cart: 'عرض السلة',
      open_cart: 'فتح السلة', my_account: 'حسابي', item: 'منتج', items: 'منتجات',
      free_lbl: 'مجاني', promo_more: 'أضف {n} رطل لحم إضافي لتحصل على {item} مجانًا', promo_more_buy: 'أضف {n} للحصول على ١ مجانًا',
      cart_title: 'سلة التسوق', cart_empty: 'سلتك فارغة', cart_empty_sub: 'أضف اللحوم والخضروات الطازجة والبقالة للبدء.',
      cart_start: 'ابدأ التسوق', cart_subtotal: 'المجموع الفرعي', cart_note: 'تُحتسب رسوم التوصيل عند إتمام الطلب (ابتداءً من 9.99$).',
      cart_checkout: 'إتمام الطلب', cart_clear: 'إفراغ السلة', remove: 'إزالة', each: 'للقطعة', dec: 'تقليل الكمية', inc: 'زيادة الكمية',
      co_title: 'تأكيد الطلب', co_address: 'عنوان التوصيل', co_phone: 'الهاتف', co_notes: 'ملاحظات (اختياري)', co_place: 'إرسال الطلب', co_back: 'العودة إلى السلة',
      co_proto: 'نموذج أولي: يُحفظ طلبك على هذا الجهاز فقط والدفع غير متصل بعد.', co_total: 'الإجمالي (قبل التوصيل)',
      co_done: 'تم إرسال الطلب!', co_done_sub: 'تم حفظ طلبك {id}. يمكنك رؤيته في حسابك.', co_orders: 'عرض طلباتي',
      e_addr: 'يرجى إدخال عنوان التوصيل.', e_phone: 'يرجى إدخال رقم هاتف صالح.', need_signin: 'يرجى تسجيل الدخول لإرسال طلبك.',
      acct_title: 'حسابي', acct_eyebrow: 'حساب ديشي دروب', acct_h1: 'أهلًا بعودتك', acct_sub: 'سجّل الدخول أو أنشئ حسابًا لتطلب أسرع وتتابع طلباتك.',
      tab_signin: 'تسجيل الدخول', tab_signup: 'إنشاء حساب', f_name: 'الاسم الكامل', f_email: 'البريد الإلكتروني', f_phone: 'الهاتف (اختياري)', f_pass: 'كلمة المرور', f_pass2: 'تأكيد كلمة المرور',
      show: 'إظهار', hide: 'إخفاء', forgot: 'نسيت كلمة المرور؟', terms: 'أوافق على الشروط وسياسة الخصوصية', btn_signin: 'تسجيل الدخول', btn_signup: 'إنشاء الحساب',
      or_with: 'أو تابع عبر', continue_with: 'المتابعة عبر {p}', sw_signup: 'جديد هنا؟ أنشئ حسابًا', sw_signin: 'لديك حساب؟ سجّل الدخول',
      e_name: 'يرجى إدخال اسمك.', e_email: 'أدخل بريدًا إلكترونيًا صالحًا.', e_pass: 'يجب ألا تقل كلمة المرور عن 8 أحرف.', e_pass2: 'كلمتا المرور غير متطابقتين.',
      e_terms: 'يرجى الموافقة على الشروط للمتابعة.', e_exists: 'يوجد حساب بهذا البريد بالفعل. جرّب تسجيل الدخول.', e_bad: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      e_social_acct: 'أُنشئ هذا الحساب عبر {p}. يرجى استخدام ذلك الزر لتسجيل الدخول.', e_social: 'تم إلغاء تسجيل الدخول عبر {p} أو فشل. حاول مرة أخرى.',
      e_need_pw: 'أدخل كلمة المرور.', forgot_msg: 'إعادة تعيين كلمة المرور عبر البريد تتطلب خادم المتجر الفعلي. حاليًا أنشئ حسابًا جديدًا أو راسلنا على واتساب.',
      welcome: 'مرحبًا، {name}', signed_via: 'تم تسجيل الدخول عبر {p}', p_email: 'البريد الإلكتروني', orders_h: 'طلباتي', orders_none: 'لا توجد طلبات بعد. ستظهر طلباتك هنا.',
      sign_out: 'تسجيل الخروج', keep_shopping: 'متابعة التسوق', signed_out: 'تم تسجيل خروجك.', created: 'تم إنشاء الحساب. أهلًا بك!', signed_in: 'تم تسجيل الدخول. أهلًا بعودتك!',
      demo_note: 'تسجيل دخول تجريبي: أضف معرّف تطبيق {p} في js/config.js لاستخدام حسابات {p} الحقيقية.', status_received: 'تم الاستلام', order_n: 'طلب', addr: 'التوصيل إلى'
    }
  };

  Object.assign(T.en, {
    confirm_email: 'Account created! Check your email and click the confirmation link, then sign in.', reset_sent: 'If that email has an account, a password reset link is on its way.',
    e_backend: 'Something went wrong. Please try again.', e_unconfirmed: 'Please confirm your email first — check your inbox.', e_taken: 'An account with this email already exists. Try signing in.',
    new_pw_h: 'Choose a new password', new_pw_btn: 'Save new password', pw_updated: 'Password updated. You are signed in.', tiktok_na: 'TikTok sign-in is not available yet.',
    status_new: 'Received', status_confirmed: 'Confirmed', status_packing: 'Being packed', status_out_for_delivery: 'Out for delivery', status_delivered: 'Delivered', status_cancelled: 'Cancelled',
    co_card_small: 'Card orders under ${min} add a ${fee} processing fee.', co_paycod: 'Cash on delivery', co_nopay: 'Ordering is paused for a moment while we finish setting up payments. Please check back soon or message us on WhatsApp.', co_cardonly: 'Pay securely by debit or credit card', free_n: '{n} free', co_paycard: 'Debit / credit card', co_card_note: 'We place a temporary hold on your card for your order total plus up to {pct}% (in case the weight changes) and charge only the exact final amount after your order is weighed. The rest is released.', pay_card_btn: 'Pay by card', pay_held: 'Card hold placed', pay_paid: 'Paid by card', pay_unpaid_card: 'Awaiting card payment', pay_refunded: 'Refunded / released', card_ok: 'Thank you! Your card was verified. We will charge the exact amount after weighing.', card_cancel: 'Card payment was not completed. You can pay from My Orders.', e_card: 'Could not open the card page. Your order is saved — pay from My Orders.', co_pay: 'Payment: cash on delivery', co_delivery_note: 'Delivery from $9.99 — free on your first order or 100+ LB. Your final total is shown once the order is placed.',
    co_done_live: 'Order {id} received. Total {total} (delivery {fee}). Pay cash on delivery — we will contact you to confirm.', fee_free: 'free', orders_loading: 'Loading your orders…',
    e_stock: 'One of the items is no longer available. Please check your cart.', e_signin_again: 'Please sign in again to place your order.', role_admin: 'Admin', role_staff: 'Staff', role_driver: 'Driver'
  });
  Object.assign(T.bn, {
    confirm_email: 'অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইলে গিয়ে নিশ্চিতকরণ লিংকে ক্লিক করুন, তারপর সাইন ইন করুন।', reset_sent: 'ওই ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।',
    e_backend: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।', e_unconfirmed: 'আগে আপনার ইমেইল নিশ্চিত করুন — ইনবক্স দেখুন।', e_taken: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। সাইন ইন করুন।',
    new_pw_h: 'নতুন পাসওয়ার্ড দিন', new_pw_btn: 'নতুন পাসওয়ার্ড সংরক্ষণ', pw_updated: 'পাসওয়ার্ড বদলানো হয়েছে। আপনি সাইন ইন আছেন।', tiktok_na: 'টিকটক সাইন ইন এখনও চালু হয়নি।',
    status_new: 'গৃহীত', status_confirmed: 'নিশ্চিত', status_packing: 'প্যাক হচ্ছে', status_out_for_delivery: 'ডেলিভারির পথে', status_delivered: 'পৌঁছে গেছে', status_cancelled: 'বাতিল',
    co_card_small: '${min}-এর কম কার্ড অর্ডারে ${fee} প্রসেসিং ফি যোগ হয়।', co_paycod: 'ডেলিভারির সময় নগদ', co_nopay: 'পেমেন্ট চালুর কাজ চলছে, তাই অর্ডার সাময়িক বন্ধ। একটু পরে আবার দেখুন বা WhatsApp-এ মেসেজ করুন।', co_cardonly: 'ডেবিট বা ক্রেডিট কার্ডে নিরাপদে পেমেন্ট করুন', free_n: '{n}টি ফ্রি', co_paycard: 'ডেবিট / ক্রেডিট কার্ড', co_card_note: 'আমরা আপনার কার্ডে অর্ডারের মোট টাকা ও ওজন বদলালে সর্বোচ্চ {pct}% বেশি সাময়িকভাবে হোল্ড করব এবং অর্ডার ওজনের পর ঠিক চূড়ান্ত অঙ্কটুকুই চার্জ করব। বাকিটা ছেড়ে দেওয়া হবে।', pay_card_btn: 'কার্ডে পেমেন্ট করুন', pay_held: 'কার্ডে হোল্ড করা হয়েছে', pay_paid: 'কার্ডে পরিশোধিত', pay_unpaid_card: 'কার্ড পেমেন্টের অপেক্ষায়', pay_refunded: 'ফেরত / ছেড়ে দেওয়া', card_ok: 'ধন্যবাদ! আপনার কার্ড যাচাই হয়েছে। ওজনের পর সঠিক অঙ্ক চার্জ করা হবে।', card_cancel: 'কার্ড পেমেন্ট সম্পন্ন হয়নি। আমার অর্ডার থেকে পেমেন্ট করতে পারবেন।', e_card: 'কার্ড পেজ খোলা যায়নি। আপনার অর্ডার সংরক্ষিত — আমার অর্ডার থেকে পেমেন্ট করুন।', co_pay: 'পেমেন্ট: ডেলিভারির সময় নগদ', co_delivery_note: 'ডেলিভারি $৯.৯৯ থেকে — প্রথম অর্ডারে বা ১০০+ পাউন্ডে ফ্রি। অর্ডার করার পর চূড়ান্ত মোট দেখানো হবে।',
    co_done_live: 'অর্ডার {id} গৃহীত হয়েছে। মোট {total} (ডেলিভারি {fee})। ডেলিভারির সময় নগদ দিন — নিশ্চিত করতে আমরা যোগাযোগ করব।', fee_free: 'ফ্রি', orders_loading: 'আপনার অর্ডার লোড হচ্ছে…',
    e_stock: 'একটি পণ্য আর পাওয়া যাচ্ছে না। কার্ট দেখে নিন।', e_signin_again: 'অর্ডার করতে আবার সাইন ইন করুন।', role_admin: 'অ্যাডমিন', role_staff: 'স্টাফ', role_driver: 'ড্রাইভার'
  });
  Object.assign(T.ar, {
    confirm_email: 'تم إنشاء الحساب! تحقق من بريدك الإلكتروني واضغط على رابط التأكيد، ثم سجّل الدخول.', reset_sent: 'إذا كان لهذا البريد حساب، فقد أُرسل إليه رابط إعادة تعيين كلمة المرور.',
    e_backend: 'حدث خطأ ما. حاول مرة أخرى.', e_unconfirmed: 'يرجى تأكيد بريدك الإلكتروني أولًا — تحقق من صندوق الوارد.', e_taken: 'يوجد حساب بهذا البريد بالفعل. جرّب تسجيل الدخول.',
    new_pw_h: 'اختر كلمة مرور جديدة', new_pw_btn: 'حفظ كلمة المرور الجديدة', pw_updated: 'تم تحديث كلمة المرور. أنت مسجّل الدخول.', tiktok_na: 'تسجيل الدخول عبر تيك توك غير متاح بعد.',
    status_new: 'تم الاستلام', status_confirmed: 'مؤكد', status_packing: 'قيد التجهيز', status_out_for_delivery: 'في الطريق إليك', status_delivered: 'تم التسليم', status_cancelled: 'ملغي',
    co_card_small: 'تُضاف رسوم معالجة ${fee} على طلبات البطاقة التي تقل عن ${min}.', co_paycod: 'نقدًا عند التسليم', co_nopay: 'الطلب متوقف مؤقتًا حتى ننهي إعداد الدفع. تحقق لاحقًا أو راسلنا على واتساب.', co_cardonly: 'ادفع بأمان ببطاقة الخصم أو الائتمان', free_n: '{n} مجانًا', co_paycard: 'بطاقة خصم / ائتمان', co_card_note: 'سنحجز مؤقتًا على بطاقتك إجمالي طلبك مع زيادة تصل إلى {pct}% (تحسبًا لتغيّر الوزن) ونخصم المبلغ النهائي الدقيق فقط بعد وزن طلبك. يُفرج عن الباقي.', pay_card_btn: 'ادفع بالبطاقة', pay_held: 'تم حجز المبلغ على البطاقة', pay_paid: 'مدفوع بالبطاقة', pay_unpaid_card: 'بانتظار الدفع بالبطاقة', pay_refunded: 'تم الاسترداد / الإفراج', card_ok: 'شكرًا! تم التحقق من بطاقتك. سنخصم المبلغ الدقيق بعد الوزن.', card_cancel: 'لم يكتمل الدفع بالبطاقة. يمكنك الدفع من طلباتي.', e_card: 'تعذّر فتح صفحة البطاقة. طلبك محفوظ — ادفع من طلباتي.', co_pay: 'الدفع: نقدًا عند التسليم', co_delivery_note: 'التوصيل من ٩٫٩٩$ — مجاني لطلبك الأول أو لأكثر من ١٠٠ رطل. يظهر الإجمالي النهائي بعد تقديم الطلب.',
    co_done_live: 'تم استلام الطلب {id}. الإجمالي {total} (التوصيل {fee}). الدفع نقدًا عند التسليم — سنتصل بك للتأكيد.', fee_free: 'مجاني', orders_loading: 'جارٍ تحميل طلباتك…',
    e_stock: 'أحد المنتجات لم يعد متوفرًا. يرجى مراجعة السلة.', e_signin_again: 'يرجى تسجيل الدخول مرة أخرى لإتمام الطلب.', role_admin: 'مدير', role_staff: 'موظف', role_driver: 'سائق'
  });
  const BE = () => (window.DDB && window.DDB.enabled ? window.DDB : null);   // real backend (null = offline demo mode)
  const lang = () => { const l = document.documentElement.lang; return T[l] ? l : 'en'; };
  const t = (k, v) => {
    let s = (T[lang()] && T[lang()][k]) || T.en[k] || k;
    if (window.__ddFee) s = window.__ddFee(s, lang());
    if (v) Object.keys(v).forEach((x) => { s = s.split('{' + x + '}').join(v[x]); });
    return s;
  };
  const baseTitle = document.title;

  /* ------------------------------------------------------------------ header: sticky bars + smooth condense */
  const hdr = $('top');
  let lastY = window.scrollY, acc = 0, ticking = false;
  function onScroll() {
    const y = window.scrollY, dy = y - lastY; lastY = y;
    if (y > 60) hdr.classList.add('scrolled'); else if (y < 20) hdr.classList.remove('scrolled');
    if (window.innerWidth < 760) {                       // phones: social bar tucks away on scroll down, returns on scroll up
      acc = (dy > 0) === (acc > 0) ? acc + dy : dy;
      if (y > 160 && acc > 24) hdr.classList.add('tuck');
      else if (acc < -16 || y <= 100) hdr.classList.remove('tuck');
    } else hdr.classList.remove('tuck');
  }
  if (hdr) {
    window.addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }, { passive: true });
    const setH = () => document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px');
    if (window.ResizeObserver) new ResizeObserver(setH).observe(hdr); else window.addEventListener('resize', setH);
    setH(); onScroll();
  }

  /* ------------------------------------------------------------------ toast */
  let toastTimer = null;
  function toast(msg, actLabel, actFn) {
    const el = $('shop-toast');
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (actLabel ? '<button type="button">' + esc(actLabel) + '</button>' : '');
    if (actLabel) el.querySelector('button').onclick = () => { el.classList.remove('show'); actFn(); };
    el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  /* ------------------------------------------------------------------ cart */
  const CART_KEY = 'dd_cart';
  let cart = LS.get(CART_KEY, {});                       // { englishProductName: qty }
  let cview = 'cart', lastOrder = null;
  const cents = (p) => Math.round(parseFloat(String(p.salePrice || p.price).replace(/[^0-9.]/g, '')) * 100) || 0;
  const money = (c) => '$' + (c / 100).toFixed(2);
  const pidOf = (name) => DD().products.findIndex((p) => p.name === name);

  function cleanCart() {
    const out = {};
    Object.keys(cart).forEach((n) => { const q = Math.min(99, parseInt(cart[n], 10) || 0); if (q > 0 && pidOf(n) > -1) out[n] = q; });
    cart = out;
  }
  const lines = () => Object.keys(cart).map((n) => { const pid = pidOf(n), p = DD().products[pid], u = cents(p); return { pid, p, qty: cart[n], unit: u, total: u * cart[n] }; });
  // free items from offers (the server adds the same ones when the order is placed)
  const isLb = (p) => p.unit ? p.unit === 'lb' : /\(per lb\)/i.test(p.name);
  function promoState() {
    const ls = lines(), now = Date.now(), free = [], hints = [];
    const byName = (n) => ls.find((l) => l.p.name === n);
    const prod = (n) => DD().products.find((p) => p.name === n);
    (window.__PROMOS || []).forEach((pr) => {
      if (pr.active === false || (pr.from && Date.parse(pr.from) > now) || (pr.until && Date.parse(pr.until) < now)) return;
      const fp = prod(pr.freeName || pr.name); if (!fp || fp.in_stock === false) return;
      if (pr.kind === 'buy_get') {
        const l = byName(pr.name), q = l ? l.qty : 0, buy = Math.max(1, pr.buy || 1), n = Math.floor(q / buy) * (pr.free || 1);
        if (n > 0) free.push({ p: fp, qty: Math.min(99, n) });
        else if (l && q > 0) hints.push(t('promo_more_buy', { n: buy - q }));
      } else if (pr.kind === 'free_item') {
        const lb = ls.reduce((a, l) => a + (isLb(l.p) ? l.qty : 0), 0), need = pr.minLb || 100;
        if (lb >= need) free.push({ p: fp, qty: pr.free || 1 });
        else if (lb >= need * 0.5) hints.push(t('promo_more', { n: need - lb, item: DD().pName(fp, lang()) }));
      }
    });
    return { free, hints };
  }
  const count = () => Object.keys(cart).reduce((a, n) => a + cart[n], 0);
  const subtotal = () => lines().reduce((a, l) => a + l.total, 0);
  function persist() { LS.set(CART_KEY, cart); updateBadges(); try { document.dispatchEvent(new Event('ddcart')); } catch (e) { /* old browser */ } }
  window.__ddCartInfo = () => { let n = 0, t = 0; try { n = count(); t = subtotal(); } catch (e) { /* cart not ready */ } return { n: n, total: money(t) }; };
  function updateBadges(bump) {
    const n = count();
    document.querySelectorAll('[data-cart-count]').forEach((b) => {
      b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0;
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
  }
  function addItem(name) { cart[name] = Math.min(99, (cart[name] || 0) + 1); persist(); updateBadges(true); if (isOpen()) renderCart(); }
  function setQty(name, q) { if (q <= 0) delete cart[name]; else cart[name] = Math.min(99, q); persist(); renderCart(); }

  function thumb(p) {
    const photos = window.__PRODUCT_PHOTOS__ || {};
    if (p.image_url && window.__ddSafeImg && window.__ddSafeImg(p.image_url)) return '<img alt="" src="' + window.__ddSafeImg(p.image_url) + '">';
    if (p.photo && photos[p.photo]) return '<img alt="" src="' + photos[p.photo] + '">';
    return (DD().icons[p.icon] || DD().fallbackIcon).replace('<svg ', '<svg width="40" height="40" ');
  }
  const ICON_BAG = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>';

  const drawer = $('cart-drawer'), scrim = $('cart-scrim');
  let opener = null;
  const isOpen = () => drawer.classList.contains('open');

  function renderCart() {
    cleanCart();
    const L = lang(), ls = lines(), n = count();
    const focusKey = (document.activeElement && drawer.contains(document.activeElement)) ? (document.activeElement.dataset.act || '') + '|' + (document.activeElement.dataset.pid || '') : '';
    let head = '<div class="cd-head"><h2 id="cart-title">' + esc(cview === 'checkout' ? t('co_title') : t('cart_title')) +
      (cview === 'cart' && n ? '<small>' + n + ' ' + esc(t(n === 1 ? 'item' : 'items')) + '</small>' : '') + '</h2>' +
      '<button class="cd-x" type="button" data-act="close" aria-label="' + esc(t('close')) + '">&times;</button></div>';
    let body = '', foot = '';

    if (cview === 'done') {
      body = '<div class="cd-done"><div class="tick"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h3>' + esc(t('co_done')) + '</h3><p>' + esc(lastOrder && lastOrder.live ? t('co_done_live', { id: lastOrder.id, total: money(lastOrder.total), fee: lastOrder.fee ? money(Math.round(lastOrder.fee * 100)) : t('fee_free') }) : t('co_done_sub', { id: lastOrder ? lastOrder.id : '' })) + '</p>' +
        '<button class="cd-btn" type="button" data-act="orders">' + esc(t('co_orders')) + '</button>' +
        '<button class="cd-btn ghost" type="button" data-act="shop">' + esc(t('keep_shopping')) + '</button></div>';
    } else if (cview === 'checkout' && ls.length) {
      const u = currentUser() || {};
      body = '<form class="co-form" id="co-form" novalidate>' +
        (() => { const fr = promoState().free, used = {};
          const rows = ls.map((l) => { const x = fr.filter((f) => f.p.name === l.p.name).reduce((a, f) => a + f.qty, 0); if (x) used[l.p.name] = 1; return '<div><span>' + (l.qty + x) + ' × ' + esc(DD().pName(l.p, L)) + (x ? ' <em class="free-note">(' + esc(t('free_n', { n: x })) + ')</em>' : '') + '</span><span>' + money(l.total) + '</span></div>'; });
          fr.filter((f) => !used[f.p.name]).forEach((f) => rows.push('<div><span>' + f.qty + ' × ' + esc(DD().pName(f.p, L)) + ' <em class="free-note">(' + esc(t('free_lbl')) + ')</em></span><span>' + money(0) + '</span></div>'));
          return '<div class="co-sum">' + rows.join(''); })() +
        '<div><span>' + esc(t('co_total')) + '</span><span>' + money(subtotal()) + '</span></div></div>' +
        field('co-addr', t('co_address'), 'text', { auto: 'street-address', val: u.address || '' }) +
        field('co-phone', t('co_phone'), 'tel', { auto: 'tel', val: u.phone || '', mode: 'tel' }) +
        '<div class="fld"><label for="co-notes">' + esc(t('co_notes')) + '</label><textarea id="co-notes" rows="2"></textarea></div>' +
        (BE() && cardOn() && codOn() ? '<fieldset class="pay-opt"><label class="po"><input type="radio" name="co-pay" value="cod" checked> <span>' + esc(t('co_paycod')) + '</span></label><label class="po"><input type="radio" name="co-pay" value="card"> <span>' + esc(t('co_paycard')) + ' · Visa, Mastercard, Amex, Discover</span></label><p class="co-proto" id="co-cardnote" hidden>' + esc(t('co_card_note', { pct: cardPct() }) + cardSmallNote()) + '</p></fieldset><p class="co-proto">' + esc(t('co_delivery_note')) + '</p>'
          : BE() && cardOn() ? '<fieldset class="pay-opt"><label class="po"><input type="radio" name="co-pay" value="card" checked> <span>' + esc(t('co_paycard')) + ' · Visa, Mastercard, Amex, Discover</span></label><p class="co-proto" id="co-cardnote">' + esc(t('co_card_note', { pct: cardPct() }) + cardSmallNote()) + '</p></fieldset><p class="co-proto">' + esc(t('co_delivery_note')) + '</p>'
          : BE() && !codOn() ? '<p class="co-proto" id="co-nopay"><b>' + esc(t('co_nopay')) + '</b></p>'
          : BE() ? '<p class="co-proto"><b>' + esc(t('co_pay')) + '</b><br>' + esc(t('co_delivery_note')) + '</p>' : '<p class="co-proto">' + esc(t('co_proto')) + '</p>') + '</form>';
      foot = '<button class="cd-btn" type="submit" form="co-form"' + (BE() && !cardOn() && !codOn() ? ' disabled' : '') + '>' + esc(t('co_place')) + ' · ' + money(subtotal()) + '</button>' +
        '<button class="cd-btn ghost" type="button" data-act="back">' + esc(t('co_back')) + '</button>';
    } else if (!ls.length) {
      body = '<div class="cd-empty">' + ICON_BAG + '<h3>' + esc(t('cart_empty')) + '</h3><p>' + esc(t('cart_empty_sub')) + '</p>' +
        '<button class="cd-btn" type="button" data-act="shop">' + esc(t('cart_start')) + '</button></div>';
    } else {
      body = '<ul class="cd-items">' + ls.map((l) => {
        const nm = esc(DD().pName(l.p, L));
        return '<li class="ci"><div class="ci-img">' + thumb(l.p) + '</div><div><div class="ci-name">' + nm + '</div>' +
          '<div class="ci-unit">' + money(l.unit) + ' ' + esc(t('each')) + '</div>' +
          '<div class="ci-bottom"><div class="qty"><button type="button" data-act="dec" data-pid="' + l.pid + '" aria-label="' + esc(t('dec')) + ': ' + nm + '">−</button>' +
          '<output aria-live="polite">' + l.qty + '</output>' +
          '<button type="button" data-act="inc" data-pid="' + l.pid + '" aria-label="' + esc(t('inc')) + ': ' + nm + '">+</button></div>' +
          '<span class="ci-total">' + money(l.total) + '</span></div>' +
          '<button class="ci-rm" type="button" data-act="rm" data-pid="' + l.pid + '">' + esc(t('remove')) + '</button></div></li>';
      }).join('') + '</ul>' + (() => { const ps = promoState(); return ps.free.map((f) => '<div class="ci-free"><b>' + esc(t('free_lbl')) + '</b> ' + f.qty + ' × ' + esc(DD().pName(f.p, L)) + '</div>').join('') + ps.hints.map((h) => '<div class="ci-hint">' + esc(h) + '</div>').join(''); })();
      foot = '<div class="cd-row"><span>' + esc(t('cart_subtotal')) + '</span><b>' + money(subtotal()) + '</b></div>' +
        '<p class="cd-note">' + esc(t('cart_note')) + '</p>' +
        '<button class="cd-btn" type="button" data-act="checkout">' + esc(t('cart_checkout')) + '</button>' +
        '<button class="cd-link" type="button" data-act="clear">' + esc(t('cart_clear')) + '</button>';
    }
    drawer.innerHTML = head + '<div class="cd-body">' + body + '</div>' + (foot ? '<div class="cd-foot">' + foot + '</div>' : '');
    const f = $('co-form'); if (f) { f.addEventListener('submit', placeOrder); addrSuggest($('co-addr')); }
    if (focusKey) { const [a, p] = focusKey.split('|'); const el = drawer.querySelector('[data-act="' + a + '"]' + (p ? '[data-pid="' + p + '"]' : '')); if (el) el.focus(); }
  }

  function openCart(view) {
    if (view) cview = view; else if (cview === 'done') cview = 'cart';
    opener = document.activeElement;
    $('shop-toast').classList.remove('show');
    renderCart();
    drawer.classList.add('open'); scrim.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    requestAnimationFrame(() => { const x = drawer.querySelector('.cd-x'); if (x) x.focus({ preventScroll: true }); });
  }
  function closeCart() {
    if (!isOpen()) return;
    drawer.classList.remove('open'); scrim.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
    if (cview !== 'cart' && cview !== 'checkout') cview = 'cart';
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  /* Metro Detroit address suggestions (free Photon/OpenStreetMap search, limited to the Detroit area; typing a full address by hand always works) */
  const BBOX = '-83.80,42.00,-82.70,42.80';       // Wayne, Oakland, Macomb, Washtenaw, Livingston (west, south, east, north)
  function addrSuggest(inp) {
    if (!inp || !window.fetch) return;
    const ul = document.createElement('ul'); ul.className = 'addr-sg'; ul.hidden = true; ul.setAttribute('role', 'listbox');
    inp.closest('.fld').appendChild(ul); inp.setAttribute('autocomplete', 'off');
    let timer = 0, seq = 0, ctl = null, items = [], cur = -1;
    const hide = () => { ul.hidden = true; cur = -1; };
    const mk = (num, street, city, zip) => { const st = [num, street].filter(Boolean).join(' '); return { main: st, sub: [city, 'MI', zip].filter(Boolean).join(' '), full: [st, city, 'MI' + (zip ? ' ' + zip : '')].filter(Boolean).join(', '), has: !!(num && zip) }; };
    const show = () => { ul.innerHTML = items.map((x, i) => '<li role="option" data-i="' + i + '"' + (i === cur ? ' class="on"' : '') + '>' + esc(x.main) + '<small>' + esc(x.sub) + '</small></li>').join(''); ul.hidden = !items.length; };
    const pick = (i) => { if (!items[i]) return; inp.value = items[i].full; hide(); inp.dispatchEvent(new Event('input', { bubbles: true })); };
    async function query(q) {
      const my = ++seq; if (ctl) ctl.abort(); ctl = window.AbortController ? new AbortController() : null;
      const opt = ctl ? { signal: ctl.signal } : {}, m = q.match(/^(\d+[A-Za-z]?)\s+(.+)$/), num = m ? m[1].toLowerCase() : '', rest = m ? m[2] : q;
      const get = (u) => fetch(u, opt).then((r) => r.json()).catch(() => null);
      const [ph, nm] = await Promise.all([
        get('https://photon.komoot.io/api/?limit=8&lang=en&lat=42.33&lon=-83.05&bbox=' + BBOX + '&q=' + encodeURIComponent(q + ' Michigan')),
        get('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=us&bounded=1&viewbox=-83.80,42.80,-82.70,42.00&q=' + encodeURIComponent(q + ', Michigan'))]);
      if (my !== seq) return;
      const out = [];
      ((nm || [])).forEach((r) => { const a = r.address || {}; if ((a.state || 'Michigan') !== 'Michigan') return;
        const road = a.road || a.pedestrian || a.footway || ''; if (!road) return;
        out.push(mk(a.house_number, road, a.city || a.town || a.village || a.suburb || a.township || a.county || '', a.postcode)); });
      (((ph || {}).features) || []).forEach((f) => { const p = f.properties || {}; if ((p.state || 'Michigan') !== 'Michigan') return;
        const road = p.street || (p.housenumber ? '' : p.name); if (!road) return;
        out.push(mk(p.housenumber, road, p.city || p.town || p.village || p.district || p.county || '', p.postcode)); });
      /* keep the house number the person typed: if the map has the street but not that exact number, suggest the street with their number */
      const seen = {}; items = out.map((x) => { if (num && !x.main.toLowerCase().startsWith(num + ' ')) { const r = out.find((y) => y === x); return mk(num, x.main.replace(/^\d+[A-Za-z]?\s+/, ''), x.sub.split(' MI')[0], (x.sub.match(/\d{5}$/) || [''])[0]); } return x; })
        .filter((x) => x.main && !seen[x.full] && (seen[x.full] = 1))
        .sort((x, y) => (y.has ? 1 : 0) - (x.has ? 1 : 0)).slice(0, 6);
      cur = -1; show();
    }
    inp.addEventListener('input', () => { clearTimeout(timer); const q = inp.value.trim(); if (q.length < 3) { hide(); return; } timer = setTimeout(() => query(q), 280); });
    inp.addEventListener('keydown', (e) => {
      if (ul.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(items.length - 1, cur + 1); show(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(0, cur - 1); show(); }
      else if (e.key === 'Enter' && cur > -1) { e.preventDefault(); pick(cur); }
      else if (e.key === 'Escape') { e.stopPropagation(); hide(); }
    });
    ul.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    inp.addEventListener('blur', () => setTimeout(hide, 150));
  }

  function startCheckout() {
    if (!currentUser()) {
      SS.set('dd_after_login', '1'); closeCart(); location.hash = '#/account'; toast(t('need_signin')); return;
    }
    cview = 'checkout'; renderCart();
  }
  function placeOrder(e) {
    e.preventDefault();
    const a = $('co-addr'), ph = $('co-phone'); let bad = false;
    const check = (el, ok, msg) => { const w = el.closest('.fld'); w.classList.toggle('bad', !ok); w.querySelector('.f-err').textContent = ok ? '' : msg; el.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !bad) { el.focus(); bad = true; } };
    check(a, a.value.trim().length >= 6, t('e_addr'));
    check(ph, ph.value.replace(/\D/g, '').length >= 7, t('e_phone'));
    if (bad) return;
    const s = session(), ls = lines();
    if (BE()) { placeLive(a.value.trim(), ph.value.trim(), $('co-notes').value.trim(), ls, e.target.closest('form')); return; }
    const order = { id: 'DD-' + Date.now().toString(36).toUpperCase().slice(-6), ts: Date.now(), total: subtotal(), address: a.value.trim(), phone: ph.value.trim(), notes: $('co-notes').value.trim(),
      items: ls.map((l) => ({ name: l.p.name, qty: l.qty, unit: l.unit })).concat(promoState().free.map((f) => ({ name: f.p.name, qty: f.qty, unit: 0 }))) };
    const all = LS.get('dd_orders', {}); (all[s.key] = all[s.key] || []).unshift(order); LS.set('dd_orders', all);
    const users = LS.get('dd_users', {}); if (users[s.key]) { users[s.key].address = order.address; users[s.key].phone = order.phone; LS.set('dd_users', users); }
    lastOrder = order; cart = {}; persist(); cview = 'done'; renderCart();
  }

  const codOn = () => !!(window.__DD_SETTINGS && window.__DD_SETTINGS.cod_enabled === true);
  const cardOn = () => !!(window.__DD_SETTINGS && window.__DD_SETTINGS.card_enabled === true);
  const cardPct = () => { const p = window.__DD_SETTINGS && Number(window.__DD_SETTINGS.card_hold_buffer_pct); return p >= 0 ? p : 15; };
  function cardSmallNote() {
    const S0 = window.__DD_SETTINGS || {}, below = S0.card_small_below == null ? 50 : Number(S0.card_small_below), pct = S0.card_small_pct == null ? 2.5 : Number(S0.card_small_pct);
    if (!(below > 0) || !(pct > 0)) return '';
    return ' ' + t('co_card_small', { min: below % 1 ? below.toFixed(2) : String(below), fee: (Math.round(below * pct) / 100).toFixed(2) });
  }
  async function payByCard(orderId) {
    try { const r = await BE().startCheckout(orderId); if (r && r.url) { location.href = r.url; return true; } } catch (err) { /* handled below */ }
    toast(t('e_card')); return false;
  }
  async function placeLive(address, phone, notes, ls, form) {
    const btn = document.querySelector('button[form="co-form"]'); if (btn) btn.disabled = true;
    const pr = document.querySelector('input[name="co-pay"]:checked'), pay = pr && pr.value === 'card' && cardOn() ? 'card' : 'cod';
    if (!codOn() && pay === 'cod') { toast(t('co_nopay')); if (btn) btn.disabled = false; return; }
    try {
      const s = session();
      const r = await BE().placeOrder({ items: ls.map((l) => ({ name: l.p.name, qty: l.qty })), name: (s && s.name) || '', phone, address, notes, pay: pay });
      lastOrder = { id: r.code, live: true, total: Math.round(Number(r.total) * 100), fee: Number(r.delivery_fee) };
      BE().saveProfile({ phone, address }).catch(() => {});
      beAt = 0; cart = {}; persist();
      if (pay === 'card') { if (await payByCard(r.id)) return; cview = 'cart'; renderCart(); closeCart(); if (location.hash !== '#/account') location.hash = '#/account'; return; }
      cview = 'done'; renderCart();
    } catch (err) {
      const m = String(err && err.message || '');
      toast(/not available|stock|unknown product/i.test(m) ? t('e_stock') : /sign|auth|jwt/i.test(m) ? t('e_signin_again') : t('e_backend') + (m ? ' (' + m + ')' : ''));
      if (btn) btn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ fields (shared by checkout + account) */
  function field(id, label, type, o) {
    o = o || {};
    const pw = type === 'password';
    const input = '<input id="' + id + '" name="' + id + '" type="' + type + '"' + (o.auto ? ' autocomplete="' + o.auto + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') +
      (o.val ? ' value="' + esc(o.val) + '"' : '') + ' aria-describedby="' + id + '-err">';
    return '<div class="fld"><label for="' + id + '">' + esc(label) + '</label>' +
      (pw ? '<div class="pw-wrap">' + input + '<button class="pw-tog" type="button" data-act="pw" data-for="' + id + '" aria-label="' + esc(t('show')) + '">' + esc(t('show')) + '</button></div>' : input) +
      '<div class="f-err" id="' + id + '-err" role="alert"></div></div>';
  }
  function setErr(id, msg) {
    const el = $(id); if (!el) return;
    const w = el.closest('.fld'); w.classList.toggle('bad', !!msg); w.querySelector('.f-err').textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  /* ------------------------------------------------------------------ accounts (browser-only prototype) */
  const USERS = 'dd_users', SESS = 'dd_session';
  const session = () => LS.get(SESS, null);
  const currentUser = () => { const s = session(); return s ? (LS.get(USERS, {})[s.key] || s) : null; };
  const PN = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' };
  const hex = (buf) => Array.prototype.map.call(new Uint8Array(buf), (b) => ('0' + b.toString(16)).slice(-2)).join('');
  async function hashPw(pw, salt, method) {
    if (method !== 'f' && window.crypto && crypto.subtle) {
      try {
        const enc = new TextEncoder(), key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
        return 'p:' + hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256));
      } catch (e) { /* fall through */ }
    }
    let h = 2166136261; const s = salt + pw;                       // weak fallback for very old browsers only
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 'f:' + h.toString(16);
  }
  const rnd = () => hex((window.crypto || window.msCrypto).getRandomValues(new Uint8Array(12)));
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  function startSession(u, demo) {
    mode = 'signin'; msgHtml = '';
    LS.set(SESS, { key: u.key, name: u.name, email: u.email || '', provider: u.provider, picture: u.picture || '', demo: !!demo });
    updateBadges();
    if (SS.get('dd_after_login')) { SS.del('dd_after_login'); location.hash = '#/'; setTimeout(() => openCart(), 400); return; }
    renderAccount();
  }

  let mode = 'signin', msgHtml = '', beAt = 0;
  function renderAccount() {
    const root = $('acct-root'); if (!root) return;
    const s = session();
    if (BE() && mode === 'recover' && s) {
      root.innerHTML = '<div class="acct-hero"><h1>' + esc(t('new_pw_h')) + '</h1></div><section class="acct-card"><form class="acct-form" id="auth-form" novalidate>' + (msgHtml || '<div id="form-msg"></div>') +
        field('a-pass', t('f_pass'), 'password', { auto: 'new-password' }) + field('a-pass2', t('f_pass2'), 'password', { auto: 'new-password' }) +
        '<button class="cd-btn" type="submit">' + esc(t('new_pw_btn')) + '</button></form></section>'; return;
    }
    if (s) {
      if (BE() && Date.now() - beAt > 20000) { beAt = Date.now(); BE().loadOrders().then(() => { if (wasAcc && session()) root.innerHTML = dashboardHTML(session()); }).catch(() => {}); }
      root.innerHTML = dashboardHTML(s); return;
    }
    const su = mode === 'signup';
    root.innerHTML =
      '<div class="acct-hero"><div class="eyebrow">' + esc(t('acct_eyebrow')) + '</div><h1>' + esc(t('acct_h1')) + '</h1><p>' + esc(t('acct_sub')) + '</p></div>' +
      '<section class="acct-card"><div class="seg" role="tablist">' +
      '<button type="button" role="tab" data-act="mode" data-mode="signin" aria-selected="' + !su + '">' + esc(t('tab_signin')) + '</button>' +
      '<button type="button" role="tab" data-act="mode" data-mode="signup" aria-selected="' + su + '">' + esc(t('tab_signup')) + '</button></div>' +
      '<form class="acct-form" id="auth-form" novalidate>' +
      (msgHtml || '<div id="form-msg"></div>') +
      (su ? field('a-name', t('f_name'), 'text', { auto: 'name' }) : '') +
      field('a-email', t('f_email'), 'email', { auto: su ? 'email' : 'username', mode: 'email' }) +
      (su ? field('a-phone', t('f_phone'), 'tel', { auto: 'tel', mode: 'tel' }) : '') +
      field('a-pass', t('f_pass'), 'password', { auto: su ? 'new-password' : 'current-password' }) +
      (su ? field('a-pass2', t('f_pass2'), 'password', { auto: 'new-password' }) +
        '<div class="fld"><label class="chk"><input type="checkbox" id="a-terms"><span>' + esc(t('terms')) + '</span></label><div class="f-err" id="a-terms-err" role="alert"></div></div>'
        : '<div class="row-between"><span></span><button type="button" class="link-btn" data-act="forgot">' + esc(t('forgot')) + '</button></div>') +
      '<button class="cd-btn" type="submit">' + esc(su ? t('btn_signup') : t('btn_signin')) + '</button></form>' +
      '<div class="divider"><span>' + esc(t('or_with')) + '</span></div>' +
      '<div class="social-login">' +
      socialBtn('google', '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>') +
      socialBtn('facebook', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.5 19v-6h2l.4-2.5h-2.4V9c0-.7.3-1.2 1.3-1.2H16V5.6c-.2 0-1-.1-1.8-.1-1.9 0-3.1 1.1-3.1 3.2v1.8H9V13h2.1v6z"/></svg>') +
      socialBtn('tiktok', '<svg viewBox="0 0 24 24" fill="#000" aria-hidden="true"><path d="M14 3c.4 2.2 1.9 3.8 4.2 4v2.6c-1.5.1-2.9-.3-4.2-1.2v6.4a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.7a2.6 2.6 0 1 0 1.8 2.5V3h2.6z"/></svg>') +
      '</div><p class="switch-line"><button type="button" class="link-btn" data-act="mode" data-mode="' + (su ? 'signin' : 'signup') + '">' + esc(su ? t('sw_signin') : t('sw_signup')) + '</button></p></section>';
    msgHtml = '';
  }
  const socialBtn = (p, svg) => '<button type="button" class="sl-btn" data-act="social" data-p="' + p + '">' + svg + '<span>' + esc(t('continue_with', { p: PN[p] })) + '</span></button>';
  const msg = (kind, text) => '<div id="form-msg" class="form-msg ' + kind + '" role="alert">' + esc(text) + '</div>';
  function showMsg(kind, text) { const m = $('form-msg'); if (m) m.outerHTML = msg(kind, text); }

  function dashboardHTML(s) {
    const L = lang(), orders = BE() ? (BE().orders || []) : ((LS.get('dd_orders', {})[s.key]) || []);
    const loc = { en: 'en-US', bn: 'bn-BD', ar: 'ar-u-ca-gregory' }[L];
    const prov = s.provider === 'email' ? t('p_email') : PN[s.provider] || s.provider;
    const av = s.picture ? '<img alt="" src="' + esc(s.picture) + '" referrerpolicy="no-referrer">' : esc((s.name || '?').trim().charAt(0).toUpperCase());
    return '<section class="acct-card"><div class="profile"><div class="avatar">' + av + '</div><div><h2>' + esc(t('welcome', { name: s.name })) + '</h2>' +
      (s.email ? '<p>' + esc(s.email) + '</p>' : '') + '<span class="badge">' + esc(t('signed_via', { p: prov })) + '</span>' + (s.role && s.role !== 'customer' ? ' <span class="badge">' + esc(t('role_' + s.role)) + '</span>' : '') + '</div></div>' +
      (s.demo ? '<p class="demo-tag">' + esc(t('demo_note', { p: PN[s.provider] || '' })) + '</p>' : '') +
      '<div class="acct-sec"><h3>' + esc(t('orders_h')) + '</h3>' +
      (orders.length ? '<ul class="orders">' + orders.map((o) => '<li><details class="order"><summary><span><b>' + esc(t('order_n')) + ' ' + esc(o.id) + '</b><small>' +
        esc(new Date(o.ts).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' })) + ' · ' + esc(o.status ? t('status_' + o.status) : t('status_received')) + '</small></span><span class="o-tot">' + money(o.total) + '</span></summary>' +
        '<ul>' + o.items.map((i) => { const p = DD().products.find((x) => x.name === i.name); return '<li><span>' + i.qty + ' × ' + esc(p ? DD().pName(p, L) : i.name) + '</span><span>' + money(i.qty * i.unit) + '</span></li>'; }).join('') + '</ul>' +
        '<div class="o-addr">' + esc(t('addr')) + ': ' + esc(o.address) + '</div>' + (o.pay === 'card' ? '<div class="o-pay">' + esc(t(o.payStatus === 'paid' ? 'pay_paid' : o.payStatus === 'authorized' ? 'pay_held' : o.payStatus === 'unpaid' ? 'pay_unpaid_card' : 'pay_refunded')) + '</div>' + (o.payStatus === 'unpaid' && o.status !== 'cancelled' && o.uuid ? '<button type="button" class="cd-btn" data-act="paycard" data-id="' + esc(o.uuid) + '">' + esc(t('pay_card_btn')) + '</button>' : '') : '') + '</details></li>').join('') + '</ul>'
        : '<div class="empty-note">' + esc(t('orders_none')) + '</div>') + '</div>' +
      '<div class="acct-actions"><a class="cd-btn" href="#/">' + esc(t('keep_shopping')) + '</a><button type="button" class="btn-out" data-act="signout">' + esc(t('sign_out')) + '</button></div></section>';
  }

  async function submitAuth(e) {
    e.preventDefault();
    if (BE() && mode === 'recover') return submitRecover(e);
    const su = mode === 'signup', users = LS.get(USERS, {});
    const email = $('a-email').value.trim(), pw = $('a-pass').value; let bad = false;
    const flag = (id, m) => { setErr(id, m); if (m && !bad) { $(id).focus(); bad = true; } };
    if (su) flag('a-name', $('a-name').value.trim().length < 2 ? t('e_name') : '');
    flag('a-email', validEmail(email) ? '' : t('e_email'));
    flag('a-pass', su ? (pw.length < 8 ? t('e_pass') : '') : (pw ? '' : t('e_need_pw')));
    if (su) {
      flag('a-pass2', $('a-pass2').value !== pw ? t('e_pass2') : '');
      const okT = $('a-terms').checked; $('a-terms-err').textContent = okT ? '' : t('e_terms'); if (!okT && !bad) { $('a-terms').focus(); bad = true; }
    }
    if (bad) return;
    const key = email.toLowerCase(), btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      if (BE()) {
        try {
          if (su) {
            const r = await BE().signUp($('a-name').value.trim(), email, pw, $('a-phone').value.trim());
            if (r.needsConfirm) { mode = 'signin'; msgHtml = msg('ok', t('confirm_email')); renderAccount(); return; }
            toast(t('created'));
          } else { await BE().signIn(email, pw); toast(t('signed_in')); }
          afterLogin();
        } catch (err) {
          const m = String(err.message || '');
          showMsg('err', /invalid login/i.test(m) ? t('e_bad') : /not confirmed/i.test(m) ? t('e_unconfirmed') : /already|registered/i.test(m) ? t('e_taken') : t('e_backend') + ' (' + m + ')');
        }
        return;
      }
      if (su) {
        if (users[key]) { showMsg('err', t('e_exists')); return; }
        const salt = rnd();
        users[key] = { key, name: $('a-name').value.trim(), email, phone: $('a-phone').value.trim(), provider: 'email', salt, hash: await hashPw(pw, salt), created: Date.now() };
        LS.set(USERS, users); toast(t('created')); startSession(users[key]);
      } else {
        const u = users[key];
        if (u && !u.hash) { showMsg('err', t('e_social_acct', { p: PN[u.provider] || '' })); return; }
        if (!u || (await hashPw(pw, u.salt, u.hash.charAt(0))) !== u.hash) { showMsg('err', t('e_bad')); return; }
        toast(t('signed_in')); startSession(u);
      }
    } finally { btn.disabled = false; }
  }

  async function submitRecover(e) {
    const pw = $('a-pass').value; let bad = false;
    setErr('a-pass', pw.length < 8 ? t('e_pass') : ''); setErr('a-pass2', $('a-pass2').value !== pw ? t('e_pass2') : '');
    if (pw.length < 8 || $('a-pass2').value !== pw) return;
    try { await BE().updatePassword(pw); mode = 'signin'; msgHtml = ''; toast(t('pw_updated')); renderAccount(); }
    catch (err) { showMsg('err', t('e_backend') + ' (' + (err.message || '') + ')'); }
  }
  function afterLogin() {
    mode = 'signin'; msgHtml = ''; beAt = 0; updateBadges();
    if (SS.get('dd_after_login')) { SS.del('dd_after_login'); location.hash = '#/'; setTimeout(() => openCart(), 400); return; }
    renderAccount();
  }
  // sign-in / sign-out that happens outside our own forms (Google/Facebook return, session expiry, other tab)
  document.addEventListener('ddauth', (e) => {
    const d = e.detail || {};
    if (d.event === 'PASSWORD_RECOVERY') { mode = 'recover'; if (location.hash !== '#/account') location.hash = '#/account'; renderAccount(); return; }
    if (d.event === 'SIGNED_IN' && d.fresh) { afterLogin(); if (!wasAcc && !SS.get('dd_after_login')) location.hash = '#/account'; return; }
    updateBadges(); if (wasAcc) renderAccount();
    if (d.event === 'DATA' && isOpen()) renderCart();
  });

  /* ---- social sign-in: real SDKs when configured in js/config.js, otherwise a clearly-labelled demo ---- */
  const CFG = (window.DD_CONFIG && window.DD_CONFIG.auth) || {};
  const loadScript = (src) => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = () => fail(new Error('script')); document.head.appendChild(s); });
  async function googleLogin() {
    await loadScript('https://accounts.google.com/gsi/client');
    return new Promise((ok, fail) => {
      window.google.accounts.oauth2.initTokenClient({
        client_id: CFG.google.clientId, scope: 'openid email profile',
        callback: async (r) => {
          if (r.error) return fail(new Error(r.error));
          try { const u = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); ok({ id: u.sub, name: u.name, email: u.email, picture: u.picture }); } catch (err) { fail(err); }
        },
        error_callback: (er) => fail(new Error((er && er.type) || 'cancelled'))
      }).requestAccessToken();
    });
  }
  async function facebookLogin() {
    if (!window.FB) await loadScript('https://connect.facebook.net/en_US/sdk.js');
    window.FB.init({ appId: CFG.facebook.appId, cookie: true, xfbml: false, version: CFG.facebook.version || 'v21.0' });
    const r = await new Promise((ok) => window.FB.login(ok, { scope: 'public_profile,email' }));
    if (!r.authResponse) throw new Error('cancelled');
    const u = await new Promise((ok) => window.FB.api('/me', { fields: 'id,name,email,picture' }, ok));
    return { id: u.id, name: u.name, email: u.email || '', picture: u.picture && u.picture.data && u.picture.data.url };
  }
  function tiktokLogin() {                                           // needs a server to finish (see js/config.js)
    const c = CFG.tiktok, st = rnd(); SS.set('dd_tt_state', st);
    location.href = 'https://www.tiktok.com/v2/auth/authorize/?client_key=' + encodeURIComponent(c.clientKey) + '&scope=user.info.basic&response_type=code&redirect_uri=' + encodeURIComponent(c.redirectUri) + '&state=' + st;
    return new Promise(() => {});
  }
  async function socialLogin(p, btn) {
    const c = CFG[p] || {};
    const live = p === 'google' ? c.clientId : p === 'facebook' ? c.appId : (c.clientKey && c.redirectUri);
    btn.disabled = true;
    try {
      const prof = live ? await (p === 'google' ? googleLogin() : p === 'facebook' ? facebookLogin() : tiktokLogin())
        : { id: 'demo', name: 'Demo ' + PN[p] + ' User', email: 'demo.' + p + '@example.com' };
      const key = (prof.email || p + ':' + prof.id).toLowerCase(), users = LS.get(USERS, {});
      users[key] = Object.assign({}, users[key], { key, name: prof.name || PN[p] + ' user', email: prof.email || '', picture: prof.picture || '', provider: p });
      LS.set(USERS, users); toast(t('signed_in')); startSession(users[key], !live);
    } catch (err) { showMsg('err', t('e_social', { p: PN[p] })); }
    finally { btn.disabled = false; }
  }

  /* ------------------------------------------------------------------ routing hook (called from js/quran.js route) */
  let wasAcc = false, homeScroll = 0;
  window.__ddApplyExtra = function (q, hash) {
    const isAcc = !q && /^#\/account(\/|\?|$)/.test(hash);
    if (isAcc && !wasAcc) homeScroll = window.scrollY;
    $('view-account').hidden = !isAcc;
    if (!q) $('view-home').hidden = isAcc;
    document.body.classList.toggle('acct-open', isAcc);
    if (isAcc) {
      const pop = $('welcome'); if (pop && !pop.hidden) { pop.hidden = true; document.body.classList.remove('modal-open'); }
      renderAccount(); window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); document.title = t('acct_title') + ' — Deshi Drop';
    } else if (wasAcc) {
      document.title = baseTitle; if (!q) window.scrollTo({ top: homeScroll, left: 0, behavior: 'instant' });
    }
    wasAcc = isAcc;
    document.querySelectorAll('.mobile-tabbar [data-tab]').forEach((tb) => {
      const k = tb.dataset.tab;
      if (k === 'account') tb.classList.toggle('active', isAcc);
      else if (isAcc) tb.classList.remove('active');
      if (isAcc) tb.removeAttribute('aria-current');
    });
    if (isAcc) { const a = document.querySelector('.mobile-tabbar [data-tab="account"]'); if (a) a.setAttribute('aria-current', 'page'); }
  };

  /* ------------------------------------------------------------------ events */
  document.addEventListener('click', (e) => {
    // tab bar Home/Search while the account page is open → go back to the shop (runs before quran.js's handler)
    const tb = e.target.closest('.mobile-tabbar a[data-tab]');
    if (tb && wasAcc && (tb.dataset.tab === 'home' || tb.dataset.tab === 'search')) {
      e.preventDefault(); e.stopImmediatePropagation(); location.hash = '#/';
      if (tb.dataset.tab === 'search') setTimeout(() => { const i = document.querySelector('#view-home .search-box input'); if (i) i.focus({ preventScroll: true }); }, 80);
      return;
    }
    const add = e.target.closest('.add-btn[data-pid]');
    if (add) {
      const p = DD().products[+add.dataset.pid]; if (!p) return;
      addItem(p.name);
      add.classList.add('added'); add.textContent = '✓'; setTimeout(() => { add.classList.remove('added'); add.textContent = '+'; }, 900);
      toast(DD().pName(p, lang()) + ' — ' + t('added'), t('view_cart'), () => openCart('cart'));
      return;
    }
    if (e.target.closest('#hdr-cart, .mobile-tabbar [data-tab="cart"], [data-open-cart]')) { e.preventDefault(); openCart('cart'); return; }
    if (e.target === scrim) { closeCart(); return; }

    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, pid = +b.dataset.pid, name = DD() && DD().products[pid] && DD().products[pid].name;
    if (act === 'close') closeCart();
    else if (act === 'paycard') { b.disabled = true; payByCard(b.dataset.id).then((ok) => { if (!ok) b.disabled = false; }); }
    else if (act === 'inc') setQty(name, (cart[name] || 0) + 1);
    else if (act === 'dec') setQty(name, (cart[name] || 0) - 1);
    else if (act === 'rm') setQty(name, 0);
    else if (act === 'clear') { cart = {}; persist(); renderCart(); }
    else if (act === 'checkout') startCheckout();
    else if (act === 'back') { cview = 'cart'; renderCart(); }
    else if (act === 'shop') { closeCart(); if (wasAcc) location.hash = '#/'; else { const s = $('shop'); if (s) s.scrollIntoView({ behavior: 'smooth' }); } }
    else if (act === 'orders') { closeCart(); cview = 'cart'; if (location.hash !== '#/account') location.hash = '#/account'; }
    else if (act === 'mode') { mode = b.dataset.mode; msgHtml = ''; renderAccount(); }
    else if (act === 'forgot') {
      if (!BE()) { msgHtml = msg('ok', t('forgot_msg')); renderAccount(); return; }
      const em = ($('a-email') || {}).value ? $('a-email').value.trim() : '';
      if (!validEmail(em)) { setErr('a-email', t('e_email')); $('a-email').focus(); return; }
      BE().resetPassword(em).then(() => { msgHtml = msg('ok', t('reset_sent')); renderAccount(); }).catch((err) => showMsg('err', t('e_backend') + ' (' + (err.message || '') + ')'));
    }
    else if (act === 'signout') { if (BE()) { BE().signOut().then(() => { beAt = 0; mode = 'signin'; renderAccount(); toast(t('signed_out')); }); } else { LS.set(SESS, null); mode = 'signin'; renderAccount(); toast(t('signed_out')); } }
    else if (act === 'social') { if (BE()) { if (b.dataset.p === 'tiktok') toast(t('tiktok_na')); else BE().oauth(b.dataset.p).catch((err) => toast(t('e_backend') + ' (' + (err.message || '') + ')')); } else socialLogin(b.dataset.p, b); }
    else if (act === 'pw') {
      const i = $(b.dataset.for), show = i.type === 'password'; i.type = show ? 'text' : 'password';
      b.textContent = t(show ? 'hide' : 'show'); b.setAttribute('aria-label', b.textContent);
    }
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'auth-form') submitAuth(e); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { closeCart(); return; }
    if (e.key !== 'Tab') return;
    const f = [].filter.call(drawer.querySelectorAll('button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])'), (n) => !n.disabled && n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------------------ language + boot */
  function labelAdd() {
    document.querySelectorAll('.add-btn[data-pid]').forEach((b) => {
      const p = DD().products[+b.dataset.pid]; if (p) b.setAttribute('aria-label', t('add_to_cart') + ': ' + DD().pName(p, lang()));
    });
  }
  function applyStatic() {
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    const hc = $('hdr-cart'), ha = $('hdr-account');
    if (hc) hc.setAttribute('aria-label', t('open_cart')); if (ha) ha.setAttribute('aria-label', t('my_account'));
    document.querySelectorAll('[data-open-cart]').forEach((b) => b.setAttribute('aria-label', t('open_cart')));
  }
  document.addEventListener('ddlang', () => {
    applyStatic(); labelAdd();
    if (isOpen()) renderCart();
    if (wasAcc) { renderAccount(); document.title = t('acct_title') + ' — Deshi Drop'; }
  });

  document.addEventListener('change', (e) => { if (e.target && e.target.name === 'co-pay') { const n = $('co-cardnote'); if (n) n.hidden = e.target.value !== 'card'; } });
  const cr = /[?&]card=(ok|cancel)\b/.exec(location.search);
  if (cr) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } beAt = 0; setTimeout(() => toast(t(cr[1] === 'ok' ? 'card_ok' : 'card_cancel')), 900); }

  cleanCart(); persist(); applyStatic(); labelAdd();
})();
