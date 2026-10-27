-- Deshi Drop — phase 5: free-item offers (promos) + "most popular first" ranking.
-- Run ONCE in Supabase -> SQL Editor AFTER schema.sql, phase3.sql and phase2.sql, then run seed.sql again (adds the fish + shrimp products).
-- Safe to run again.

create table if not exists promos (
  id              bigint generated always as identity primary key,
  kind            text not null check (kind in ('buy_get', 'free_item')),
  title           text,
  product_id      bigint references products(id) on delete cascade,        -- buy_get: the product you buy
  buy_qty         int not null default 5 check (buy_qty >= 1),             -- buy_get: buy this many ...
  free_qty        int not null default 1 check (free_qty between 1 and 99),-- ... get this many free (free_item: how many)
  min_lb          numeric not null default 100 check (min_lb >= 0),        -- free_item: needs this many lb of products sold by the lb
  free_product_id bigint references products(id) on delete cascade,        -- the free product (default: same product)
  active          boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz
);
alter table promos enable row level security;
drop policy if exists promos_read  on promos; create policy promos_read  on promos for select to anon, authenticated using (true);
drop policy if exists promos_admin on promos; create policy promos_admin on promos for all to authenticated using (is_admin()) with check (is_admin());
grant select on promos to anon;
grant select, insert, update, delete on promos to authenticated;   -- row rules above still limit changes to admins
drop trigger if exists promos_audit on promos; create trigger promos_audit after insert or update or delete on promos for each row execute function audit_row();

-- Cash on delivery is OFF by default (card only). Turn it on again in Dashboard -> Settings if you ever want it.
insert into settings (key, value) values ('cod_enabled', 'false'::jsonb) on conflict (key) do nothing;

-- the two offers from the posters (change or switch them off in the dashboard)
insert into promos (kind, title, product_id, buy_qty, free_qty, free_product_id)
  select 'buy_get', 'Buy 5 whole hard chicken, get 1 free', id, 5, 1, id from products where name = 'Chicken Hard (per piece)'
   and not exists (select 1 from promos where kind = 'buy_get');
insert into promos (kind, title, min_lb, free_qty, free_product_id, ends_at)
  select 'free_item', 'Free Koliza with 100 lb or more', 100, 1, id, '2026-11-01T00:00:00-04'::timestamptz from products where name = 'Beef Koliza (per lb)'
   and not exists (select 1 from promos where kind = 'free_item');

-- orders now add the free items (price 0) automatically
create or replace function place_order(p_items jsonb, p_name text, p_phone text, p_address text, p_notes text default null, p_pay text default 'cod')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); prof profiles%rowtype; prod products%rowtype; r record; l jsonb;
  v_name text; v_pct int; v_unit numeric; v_sub numeric := 0; v_lb numeric := 0; v_fee numeric;
  v_lines jsonb := '[]'::jsonb; v_code text; v_id uuid; v_try int := 0;
  pr promos%rowtype; fprod products%rowtype; v_q numeric; v_free numeric;
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

-- most popular products = units sold in the last 90 days (cancelled orders and free items don't count). Anyone can read the ranking, nothing else.
create or replace function popular_products()
returns table (name text, sold numeric) language sql stable security definer set search_path = public as $$
  select i.name, sum(i.qty) as sold
    from order_items i join orders o on o.id = i.order_id
   where o.status <> 'cancelled' and o.created_at > now() - interval '90 days' and i.unit_price > 0
   group by i.name order by sold desc limit 200
$$;
grant execute on function popular_products() to anon, authenticated;
