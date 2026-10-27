-- Deshi Drop — phase 3 (admin dashboard helpers). Run ONCE in Supabase → SQL Editor, AFTER schema.sql. Safe to run again.

-- Manual / phone order entered by staff or admin. Prices + deals are computed on the server, exactly like a website order.
create or replace function admin_create_order(
  p_items jsonb, p_name text, p_phone text, p_address text, p_notes text default null,
  p_pay pay_method default 'cod', p_pay_status pay_status default 'unpaid', p_status order_status default 'confirmed', p_fee numeric default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  prod products%rowtype; r record; v_pct int; v_unit numeric; v_sub numeric := 0; v_fee numeric; v_code text; v_id uuid; v_try int := 0;
  v_lines jsonb := '[]'::jsonb; l jsonb;
begin
  if not is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then raise exception 'add at least one item'; end if;
  if length(btrim(coalesce(p_name, ''))) < 1 then raise exception 'customer name is required'; end if;
  if length(coalesce(p_address, '')) > 300 or length(coalesce(p_notes, '')) > 600 or length(coalesce(p_name, '')) > 120 or length(coalesce(p_phone, '')) > 40 then raise exception 'text too long'; end if;
  for r in select x.name, sum(x.qty) as qty from jsonb_to_recordset(p_items) as x(name text, qty numeric) group by x.name loop
    if r.qty is null or r.qty <= 0 or r.qty > 999 then raise exception 'invalid quantity for %', r.name; end if;
    select * into prod from products where name = r.name;
    if not found then raise exception 'unknown product: %', coalesce(r.name, '(none)'); end if;
    select coalesce(max(d.pct), 0) into v_pct from deals d
     where d.product_id = prod.id and d.active and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now());
    v_unit := case when v_pct > 0 then round(prod.price * (100 - v_pct)) / 100 else prod.price end;
    v_sub := v_sub + v_unit * r.qty;
    v_lines := v_lines || jsonb_build_object('product_id', prod.id, 'name', prod.name, 'qty', r.qty, 'unit_price', v_unit, 'list_price', prod.price, 'photo_key', prod.photo_key, 'image_url', prod.image_url);
  end loop;
  v_sub := round(v_sub, 2);
  v_fee := case when is_admin() and p_fee is not null and p_fee >= 0 and p_fee < 1000 then p_fee else setting_num('delivery_fee', 9.99) end;
  loop
    v_code := gen_order_code();
    begin
      insert into orders (code, user_id, customer_name, phone, address, notes, status, pay_method, pay_status, subtotal, delivery_fee, total)
      values (v_code, null, btrim(p_name), nullif(btrim(coalesce(p_phone,'')), ''), nullif(btrim(coalesce(p_address,'')), ''), nullif(btrim(coalesce(p_notes, '')), ''),
              p_status, p_pay, p_pay_status, v_sub, v_fee, v_sub + v_fee) returning id into v_id;
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

-- People list with email + lifetime numbers (admin only; emails live in auth.users which the browser cannot read directly).
create or replace function admin_users()
returns table (id uuid, email text, full_name text, phone text, address text, role user_role, active boolean, created_at timestamptz, orders int, spent numeric)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.address, p.role, p.active, p.created_at,
           (select count(*)::int from orders o where o.user_id = p.id and o.status <> 'cancelled'),
           coalesce((select sum(o.total) from orders o where o.user_id = p.id and o.status <> 'cancelled'), 0)
      from profiles p left join auth.users u on u.id = p.id order by p.created_at desc;
end $$;

revoke execute on function admin_create_order(jsonb, text, text, text, text, pay_method, pay_status, order_status, numeric) from public, anon;
revoke execute on function admin_users() from public, anon;
grant execute on function admin_create_order(jsonb, text, text, text, text, pay_method, pay_status, order_status, numeric) to authenticated;
grant execute on function admin_users() to authenticated;
