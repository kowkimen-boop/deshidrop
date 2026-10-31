-- Deshi Drop — phase 8: quantity shortcuts + minimum order per product + lamb & goat. Run ONCE in Supabase -> SQL Editor, AFTER phase7.sql. Safe to run again.

-- 1) Minimum quantity per product (0 = no minimum). Set it per product in Dashboard -> Products -> edit.
alter table products add column if not exists min_qty numeric(8,2) not null default 0;

-- 2) Quick-add buttons on the shop (Dashboard -> Settings). 0 hides a button.
insert into settings (key, value) values ('qty_quick_on', 'true'::jsonb), ('qty_quick_1', '5'::jsonb), ('qty_quick_2', '10'::jsonb), ('qty_quick_3', '25'::jsonb) on conflict (key) do nothing;

-- 3) Orders: up to 999 per item, and the product minimum is enforced on the server too.
create or replace function place_order(p_items jsonb, p_name text, p_phone text, p_address text, p_notes text default null, p_pay text default 'cod')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); prof profiles%rowtype; prod products%rowtype; r record; l jsonb;
  v_name text; v_pct int; v_unit numeric; v_sub numeric := 0; v_lb numeric := 0; v_fee numeric;
  v_lines jsonb := '[]'::jsonb; v_code text; v_id uuid; v_try int := 0;
  v_card numeric := 0; pr promos%rowtype; fprod products%rowtype; v_q numeric; v_free numeric;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into prof from profiles where id = uid;
  if not found or not prof.active then raise exception 'account is not active' using errcode = '42501'; end if;

  -- abuse protection: limit orders per account per hour, and cap text sizes
  if (select count(*) from orders where user_id = uid and created_at > now() - interval '1 hour') >= setting_num('max_orders_per_hour', 8) then
    raise exception 'too many orders in the last hour, please try again later' using errcode = '54000';
  end if;
  if length(coalesce(p_address, '')) > 300 or length(coalesce(p_notes, '')) > 600 or length(coalesce(p_name, '')) > 120 or length(coalesce(p_phone, '')) > 40 then
    raise exception 'text too long';
  end if;

  if coalesce(p_pay, 'cod') not in ('cod', 'card') then raise exception 'invalid payment method'; end if;
  if coalesce(p_pay, 'cod') = 'card' and not setting_bool('card_enabled', false) then raise exception 'card payments are not enabled yet'; end if;
  if coalesce(p_pay, 'cod') = 'cod' and not setting_bool('cod_enabled', false) then raise exception 'cash on delivery is turned off, please pay by card'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'cart is empty or invalid';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(name text, qty numeric)
             where x.qty is null or x.qty < 1 or x.qty > 999 or x.qty <> trunc(x.qty)) then
    raise exception 'invalid quantity (whole numbers from 1 to 999)';
  end if;
  if length(btrim(coalesce(p_address, ''))) < 6 then raise exception 'delivery address is required'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7 then raise exception 'phone number is required'; end if;
  v_name := coalesce(nullif(btrim(p_name), ''), nullif(prof.full_name, ''), 'Customer');

  for r in select x.name, sum(x.qty) as qty from jsonb_to_recordset(p_items) as x(name text, qty numeric) group by x.name loop
    if r.qty is null or r.qty <= 0 or r.qty > 999 then raise exception 'invalid quantity for %', r.name; end if;
    select * into prod from products where name = r.name and active;
    if not found then raise exception 'unknown product: %', coalesce(r.name, '(none)'); end if;
    if not prod.in_stock then raise exception 'out of stock: %', prod.name; end if;
    if coalesce(prod.min_qty, 0) > 0 and r.qty < prod.min_qty then raise exception 'minimum order for % is % %', prod.name, prod.min_qty, prod.unit; end if;
    select coalesce(max(d.pct), 0) into v_pct from deals d
     where d.product_id = prod.id and d.active and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now());
    v_unit := case when v_pct > 0 then round(prod.price * (100 - v_pct)) / 100 else prod.price end;
    v_sub := v_sub + v_unit * r.qty;
    if prod.unit = 'lb' then v_lb := v_lb + r.qty; end if;
    v_lines := v_lines || jsonb_build_object('product_id', prod.id, 'name', prod.name, 'qty', r.qty, 'unit_price', v_unit,
                                              'list_price', prod.price, 'photo_key', prod.photo_key, 'image_url', prod.image_url);
  end loop;

  -- free-item offers (table promos): "buy N get some free" and "free item when the order has X lb or more"
  for pr in select * from promos where active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) order by id loop
    v_free := 0;
    if pr.kind = 'buy_get' then
      select coalesce(sum((x ->> 'qty')::numeric), 0) into v_q from jsonb_array_elements(v_lines) x
       where (x ->> 'product_id')::bigint = pr.product_id and coalesce((x ->> 'unit_price')::numeric, 0) > 0;
      v_free := floor(v_q / greatest(pr.buy_qty, 1)) * pr.free_qty;
    elsif pr.kind = 'free_item' and v_lb >= pr.min_lb then
      v_free := pr.free_qty;
    end if;
    v_free := least(v_free, 99);
    if v_free > 0 then
      select * into fprod from products where id = coalesce(pr.free_product_id, pr.product_id) and active and in_stock;
      if found then
        v_lines := v_lines || jsonb_build_object('product_id', fprod.id, 'name', fprod.name, 'qty', v_free, 'unit_price', 0,
                                                  'list_price', fprod.price, 'photo_key', fprod.photo_key, 'image_url', fprod.image_url);
      end if;
    end if;
  end loop;

  v_sub := round(v_sub, 2);
  v_fee := setting_num('delivery_fee', 9.99);
  if setting_bool('first_order_free', true) and not exists (select 1 from orders where user_id = uid and status <> 'cancelled') then v_fee := 0; end if;
  if v_lb >= setting_num('free_delivery_lb', 100) then v_fee := 0; end if;
  -- small card orders: a card_small_pct % fee on the card_small_below amount (default 2.5% of $50 = $1.25) when items + delivery are under that amount
  if coalesce(p_pay, 'cod') = 'card' and v_sub + v_fee < setting_num('card_small_below', 50) then
    v_card := round(setting_num('card_small_below', 50) * setting_num('card_small_pct', 2.5) / 100, 2);
  end if;

  loop
    v_code := gen_order_code();
    begin
      insert into orders (code, user_id, customer_name, phone, address, notes, status, pay_method, pay_status, subtotal, delivery_fee, card_fee, total)
      values (v_code, uid, v_name, btrim(p_phone), btrim(p_address), nullif(btrim(coalesce(p_notes, '')), ''), 'new', coalesce(p_pay, 'cod')::pay_method, 'unpaid', v_sub, v_fee, v_card, v_sub + v_fee + v_card)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 10 then raise; end if;
    end;
  end loop;

  for l in select value from jsonb_array_elements(v_lines) loop
    insert into order_items (order_id, product_id, name, qty, unit_price, list_price, photo_key, image_url)
    values (v_id, (l ->> 'product_id')::bigint, l ->> 'name', (l ->> 'qty')::numeric, (l ->> 'unit_price')::numeric,
            (l ->> 'list_price')::numeric, l ->> 'photo_key', l ->> 'image_url');
  end loop;

  update profiles set phone = coalesce(nullif(phone, ''), btrim(p_phone)), address = coalesce(nullif(address, ''), btrim(p_address)) where id = uid;

  return jsonb_build_object('id', v_id, 'code', v_code, 'subtotal', v_sub, 'delivery_fee', v_fee, 'card_fee', v_card, 'total', v_sub + v_fee + v_card, 'status', 'new', 'pay_method', coalesce(p_pay, 'cod'),
    'hold_amount', round((v_sub + v_fee + v_card) * (1 + setting_num('card_hold_buffer_pct', 15) / 100), 2),
    'items', (select jsonb_agg(jsonb_build_object('name', x ->> 'name', 'qty', (x ->> 'qty')::numeric, 'unit_price', (x ->> 'unit_price')::numeric))
              from jsonb_array_elements(v_lines) x));
end $$;



grant execute on function place_order(jsonb, text, text, text, text, text) to authenticated;

-- 4) Lamb and goat (from the weekend poster): minimum 10 lb.
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort, min_qty) values
 ($q0$Lamb (per lb)$q0$, $q0$ভেড়ার মাংস (প্রতি পাউন্ড)$q0$, $q0$لحم ضأن (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Lamb & Goat$q0$, 6, $q0$lb$q0$, $q0$Min 10 lb$q0$, $q0$pl_lamb$q0$, $q0$lamb$q0$, true, 5, 10),
 ($q0$Goat (per lb)$q0$, $q0$খাসির মাংস (প্রতি পাউন্ড)$q0$, $q0$لحم ماعز (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Lamb & Goat$q0$, 8, $q0$lb$q0$, $q0$Min 10 lb$q0$, $q0$pl_goat$q0$, $q0$lamb$q0$, true, 5, 10)
 on conflict (name) do nothing;
-- (if you added Lamb or Goat yourself earlier, just open it in Dashboard -> Products and set its minimum.)

-- 5) The homepage slide. If you have never saved the slideshow, the website already has it built in.
--    If you have saved a copy from Dashboard -> Slideshow, this adds the new slide as slide 2 (once).
update settings set value = jsonb_build_array(value -> 0) || ($j${"id": "lambgoat", "on": true, "theme": "maroon", "art": "photos", "seal": true, "tag": {"en": "Weekend special · Min 10 LB", "bn": "সপ্তাহান্তের অফার · সর্বনিম্ন ১০ পাউন্ড", "ar": "عرض نهاية الأسبوع · الحد الأدنى ١٠ رطل"}, "h": {"en": "Fresh Lamb $6/lb & Goat $8/lb", "bn": "তাজা ভেড়া $6/পাউন্ড ও খাসি $8/পাউন্ড", "ar": "ضأن طازج $6/رطل وماعز $8/رطل"}, "p": {"en": "Zabiha halal, cut ready to cook. Order 10 LB or more — delivered Saturday & Sunday.", "bn": "জবিহ হালাল, রান্নার উপযোগী কাটা। ১০ পাউন্ড বা তার বেশি অর্ডার করুন — শনি ও রবিবার ডেলিভারি।", "ar": "ذبح حلال، مقطّع جاهز للطهي. اطلب ١٠ أرطال أو أكثر — التوصيل السبت والأحد."}, "cta": {"en": "Order lamb & goat", "bn": "ভেড়া ও খাসি অর্ডার করুন", "ar": "اطلب الضأن والماعز"}, "go": "meat", "anim": "meat", "imgs": ["pl_lamb", "pl_goatface", "pl_sheep"], "pl": {"en": "Lamb $6 · Goat $8", "bn": "ভেড়া $6 · খাসি $8", "ar": "ضأن $6 · ماعز $8"}, "pv": {"en": "per lb", "bn": "প্রতি পাউন্ড", "ar": "للرطل"}}$j$::jsonb) || coalesce((select jsonb_agg(e order by o) from jsonb_array_elements(value) with ordinality as t(e, o) where o > 1), '[]'::jsonb)
 where key = 'carousel' and jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0 and not exists (select 1 from jsonb_array_elements(value) e where e ->> 'id' = 'lambgoat');
