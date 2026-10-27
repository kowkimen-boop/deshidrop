-- Deshi Drop — phase 6: past (offline) records. Run ONCE in Supabase → SQL Editor, AFTER phase5.sql. Safe to run again.
-- Lets the admin enter an old order with its real date (and the price actually charged) from Dashboard → New order.

drop function if exists admin_create_order(jsonb, text, text, text, text, pay_method, pay_status, order_status, numeric);
create or replace function admin_create_order(
  p_items jsonb, p_name text, p_phone text, p_address text, p_notes text default null,
  p_pay pay_method default 'cod', p_pay_status pay_status default 'unpaid', p_status order_status default 'confirmed', p_fee numeric default null, p_date timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  prod products%rowtype; r record; v_pct int; v_unit numeric; v_sub numeric := 0; v_fee numeric; v_code text; v_id uuid; v_try int := 0;
  v_lines jsonb := '[]'::jsonb; l jsonb; v_past boolean := false; v_at timestamptz := now(); v_ovr numeric;
begin
  if not is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  -- an old (offline) record: admin only, date must be in the past (up to 3 years back)
  if p_date is not null then
    if not is_admin() then raise exception 'only the admin can enter past records' using errcode = '42501'; end if;
    if p_date > now() + interval '5 minutes' or p_date < now() - interval '3 years' then raise exception 'the date must be in the past (within 3 years)'; end if;
    v_past := true; v_at := p_date;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then raise exception 'add at least one item'; end if;
  if length(btrim(coalesce(p_name, ''))) < 1 then raise exception 'customer name is required'; end if;
  if length(coalesce(p_address, '')) > 300 or length(coalesce(p_notes, '')) > 600 or length(coalesce(p_name, '')) > 120 or length(coalesce(p_phone, '')) > 40 then raise exception 'text too long'; end if;
  for r in select x.name, sum(x.qty) as qty, max(x.price) as price from jsonb_to_recordset(p_items) as x(name text, qty numeric, price numeric) group by x.name loop
    if r.qty is null or r.qty <= 0 or r.qty > 999 then raise exception 'invalid quantity for %', r.name; end if;
    select * into prod from products where name = r.name;
    if not found then raise exception 'unknown product: %', coalesce(r.name, '(none)'); end if;
    if v_past then
      -- offline record: no website deals; the price actually charged can be typed in (otherwise today's list price)
      v_ovr := r.price;
      if v_ovr is not null and (v_ovr < 0 or v_ovr > 100000) then raise exception 'invalid price for %', r.name; end if;
      v_unit := round(coalesce(v_ovr, prod.price), 2);
    else
      select coalesce(max(d.pct), 0) into v_pct from deals d
       where d.product_id = prod.id and d.active and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now());
      v_unit := case when v_pct > 0 then round(prod.price * (100 - v_pct)) / 100 else prod.price end;
    end if;
    v_sub := v_sub + v_unit * r.qty;
    v_lines := v_lines || jsonb_build_object('product_id', prod.id, 'name', prod.name, 'qty', r.qty, 'unit_price', v_unit, 'list_price', prod.price, 'photo_key', prod.photo_key, 'image_url', prod.image_url);
  end loop;
  v_sub := round(v_sub, 2);
  v_fee := case when is_admin() and p_fee is not null and p_fee >= 0 and p_fee < 1000 then p_fee when v_past then 0 else setting_num('delivery_fee', 9.99) end;
  loop
    v_code := gen_order_code();
    begin
      insert into orders (code, user_id, customer_name, phone, address, notes, status, pay_method, pay_status, subtotal, delivery_fee, total, created_at, updated_at, delivered_at)
      values (v_code, null, btrim(p_name), nullif(btrim(coalesce(p_phone,'')), ''), nullif(btrim(coalesce(p_address,'')), ''), nullif(btrim(coalesce(p_notes, '')), ''),
              p_status, p_pay, p_pay_status, v_sub, v_fee, v_sub + v_fee, v_at, v_at, case when p_status = 'delivered' then v_at end) returning id into v_id;
      exit;
    exception when unique_violation then v_try := v_try + 1; if v_try > 10 then raise; end if;
    end;
  end loop;
  for l in select value from jsonb_array_elements(v_lines) loop
    insert into order_items (order_id, product_id, name, qty, unit_price, list_price, photo_key, image_url)
    values (v_id, (l ->> 'product_id')::bigint, l ->> 'name', (l ->> 'qty')::numeric, (l ->> 'unit_price')::numeric, (l ->> 'list_price')::numeric, l ->> 'photo_key', l ->> 'image_url');
  end loop;
  return jsonb_build_object('id', v_id, 'code', v_code, 'subtotal', v_sub, 'delivery_fee', v_fee, 'total', v_sub + v_fee);
end $$;


revoke execute on function admin_create_order(jsonb, text, text, text, text, pay_method, pay_status, order_status, numeric, timestamptz) from public, anon;
grant execute on function admin_create_order(jsonb, text, text, text, text, pay_method, pay_status, order_status, numeric, timestamptz) to authenticated;
