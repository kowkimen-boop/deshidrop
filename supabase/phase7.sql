-- Deshi Drop — phase 7: beef price-list items + small card-order fee. Run ONCE in Supabase -> SQL Editor, AFTER phase6.sql. Safe to run again.

-- 1) Card orders under $50 (items + delivery) get a fee of 2.5% of $50 = $1.25. Orders at or above $50 pay nothing extra.
--    Change in Dashboard -> Settings, or in the settings table: card_small_below (50) and card_small_pct (2.5). Set card_small_pct to 0 to switch it off.
alter table orders add column if not exists card_fee numeric(10,2) not null default 0;
insert into settings (key, value) values ('card_small_below', '50'::jsonb), ('card_small_pct', '2.5'::jsonb) on conflict (key) do nothing;

create or replace function orders_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.user_id is distinct from old.user_id or new.code is distinct from old.code or new.subtotal is distinct from old.subtotal
       or new.delivery_fee is distinct from old.delivery_fee or new.card_fee is distinct from old.card_fee or new.total is distinct from old.total or new.created_at is distinct from old.created_at
       or new.stripe_session_id is distinct from old.stripe_session_id or new.stripe_payment_intent is distinct from old.stripe_payment_intent
       or new.authorized_amount is distinct from old.authorized_amount or new.captured_amount is distinct from old.captured_amount
       or new.pay_method is distinct from old.pay_method or (old.pay_method = 'card' and new.pay_status is distinct from old.pay_status) then
      raise exception 'only an admin can change order totals, owner, code or card payment details' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

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
             where x.qty is null or x.qty < 1 or x.qty > 99 or x.qty <> trunc(x.qty)) then
    raise exception 'invalid quantity (whole numbers from 1 to 99)';
  end if;
  if length(btrim(coalesce(p_address, ''))) < 6 then raise exception 'delivery address is required'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7 then raise exception 'phone number is required'; end if;
  v_name := coalesce(nullif(btrim(p_name), ''), nullif(prof.full_name, ''), 'Customer');

  for r in select x.name, sum(x.qty) as qty from jsonb_to_recordset(p_items) as x(name text, qty numeric) group by x.name loop
    if r.qty > 99 then raise exception 'invalid quantity for %', r.name; end if;
    select * into prod from products where name = r.name and active;
    if not found then raise exception 'unknown product: %', coalesce(r.name, '(none)'); end if;
    if not prod.in_stock then raise exception 'out of stock: %', prod.name; end if;
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

-- 2) Beef price list. An item whose name already exists is left alone (no duplicate).
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Meat & Bones – Regular (per lb)$q0$, $q0$হাড়সহ গরুর মাংস – সাধারণ (প্রতি পাউন্ড)$q0$, $q0$لحم بقري بالعظم – عادي (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 4.5, $q0$lb$q0$, null, $q0$pl_mb_regular$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Sina – Only (per lb)$q0$, $q0$সিনা – শুধু (প্রতি পাউন্ড)$q0$, $q0$صدر بقري فقط (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 4.5, $q0$lb$q0$, null, $q0$pl_sina$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Poncha – Only (per lb)$q0$, $q0$পোঁচা – শুধু (প্রতি পাউন্ড)$q0$, $q0$بونشا فقط (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 4.5, $q0$lb$q0$, null, $q0$pl_poncha$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Leg – Meat & Bones (per lb)$q0$, $q0$রান – হাড়সহ মাংস (প্রতি পাউন্ড)$q0$, $q0$فخذ بقري بالعظم (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 4.5, $q0$lb$q0$, null, $q0$pl_leg$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Beef Gurda – Kidney (per lb)$q0$, $q0$গরুর গুর্দা (প্রতি পাউন্ড)$q0$, $q0$كلى بقري (للرطل)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 3.5, $q0$lb$q0$, null, $q0$pl_gurda$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;
insert into products (name, name_bn, name_ar, category, category_bn, category_ar, sub, price, unit, tag, photo_key, icon, halal, sort) values ($q0$Brain – Full (per piece)$q0$, $q0$মগজ – পুরো (প্রতি পিস)$q0$, $q0$مخ بقري كامل (للقطعة)$q0$, $q0$Meat$q0$, $q0$মাংস$q0$, $q0$لحوم$q0$, $q0$Beef$q0$, 10, $q0$piece$q0$, null, $q0$pl_brain$q0$, $q0$beef$q0$, true, 5) on conflict (name) do nothing;

-- Two existing items whose price on the new list is different:
update products set price = 6.00 where name = 'Meat – Regular (per lb)' and price <> 6.00;
update products set price = 7.30 where name = 'Meat – Zero Fat (per lb)' and price <> 7.30;
