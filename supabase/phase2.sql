-- Deshi Drop — phase 2: card payments (Stripe, "hold now, charge the final amount after weighing").
-- Run ONCE in Supabase -> SQL Editor AFTER schema.sql and phase3.sql. Safe to run again.
-- Card payments stay OFF until you switch on the setting card_enabled (Dashboard -> Settings).

alter table orders add column if not exists stripe_session_id  text;
alter table orders add column if not exists stripe_payment_intent text;
alter table orders add column if not exists authorized_amount  numeric(10,2);
alter table orders add column if not exists captured_amount    numeric(10,2);
create index if not exists orders_pi_idx on orders(stripe_payment_intent);

insert into settings (key, value) values ('card_enabled', 'false'::jsonb), ('card_hold_buffer_pct', '15'::jsonb) on conflict (key) do nothing;

-- Staff may work on orders but can never touch money fields, and never mark a CARD order paid (only Stripe / the admin capture does).
create or replace function orders_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.user_id is distinct from old.user_id or new.code is distinct from old.code or new.subtotal is distinct from old.subtotal
       or new.delivery_fee is distinct from old.delivery_fee or new.total is distinct from old.total or new.created_at is distinct from old.created_at
       or new.stripe_session_id is distinct from old.stripe_session_id or new.stripe_payment_intent is distinct from old.stripe_payment_intent
       or new.authorized_amount is distinct from old.authorized_amount or new.captured_amount is distinct from old.captured_amount
       or new.pay_method is distinct from old.pay_method or (old.pay_method = 'card' and new.pay_status is distinct from old.pay_status) then
      raise exception 'only an admin can change order totals, owner, code or card payment details' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Orders can now be placed with p_pay = 'card' (when card_enabled is on). The order starts unpaid; the Stripe webhook marks it authorized.
create or replace function place_order(p_items jsonb, p_name text, p_phone text, p_address text, p_notes text default null, p_pay text default 'cod')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); prof profiles%rowtype; prod products%rowtype; r record; l jsonb;
  v_name text; v_pct int; v_unit numeric; v_sub numeric := 0; v_lb numeric := 0; v_fee numeric;
  v_lines jsonb := '[]'::jsonb; v_code text; v_id uuid; v_try int := 0;
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

  v_sub := round(v_sub, 2);
  v_fee := setting_num('delivery_fee', 9.99);
  if setting_bool('first_order_free', true) and not exists (select 1 from orders where user_id = uid and status <> 'cancelled') then v_fee := 0; end if;
  if v_lb >= setting_num('free_delivery_lb', 100) then v_fee := 0; end if;

  loop
    v_code := gen_order_code();
    begin
      insert into orders (code, user_id, customer_name, phone, address, notes, status, pay_method, pay_status, subtotal, delivery_fee, total)
      values (v_code, uid, v_name, btrim(p_phone), btrim(p_address), nullif(btrim(coalesce(p_notes, '')), ''), 'new', coalesce(p_pay, 'cod')::pay_method, 'unpaid', v_sub, v_fee, v_sub + v_fee)
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

  return jsonb_build_object('id', v_id, 'code', v_code, 'subtotal', v_sub, 'delivery_fee', v_fee, 'total', v_sub + v_fee, 'status', 'new', 'pay_method', coalesce(p_pay, 'cod'),
    'hold_amount', round((v_sub + v_fee) * (1 + setting_num('card_hold_buffer_pct', 15) / 100), 2),
    'items', (select jsonb_agg(jsonb_build_object('name', x ->> 'name', 'qty', (x ->> 'qty')::numeric, 'unit_price', (x ->> 'unit_price')::numeric))
              from jsonb_array_elements(v_lines) x));
end $$;

grant execute on function place_order(jsonb, text, text, text, text, text) to authenticated;
