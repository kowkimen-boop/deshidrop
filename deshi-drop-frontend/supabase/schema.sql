-- =====================================================================================================
-- Deshi Drop — database schema for Supabase (PostgreSQL)
-- Paste this WHOLE file into  Supabase → SQL Editor → New query → Run.   Safe to run more than once.
-- Then run seed.sql (your current products, deals and website text).
--
-- What this creates
--   • Roles: customer · driver · staff · admin  (stored in profiles.role, enforced by the database itself)
--   • Tables: profiles, products, deals, site_content, settings, orders, order_items, expenses, audit_log
--   • Row-level security on EVERY table (people only see what their role allows)
--   • Server-side functions: place_order (prices are calculated here, never trusted from the browser),
--     driver_set_status, admin_set_role
--   • A public storage bucket called "media" for product / site pictures (only admins can upload)
-- =====================================================================================================

-- ---------------------------------------------------------------------------------- enums
do $$ begin create type user_role    as enum ('customer','driver','staff','admin');                                         exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('new','confirmed','packing','out_for_delivery','delivered','cancelled');       exception when duplicate_object then null; end $$;
do $$ begin create type pay_method   as enum ('cod','card');                                                                exception when duplicate_object then null; end $$;
do $$ begin create type pay_status   as enum ('unpaid','authorized','paid','refunded','failed');                             exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------------- tables
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'customer',
  full_name   text,
  phone       text,
  address     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id           bigint generated always as identity primary key,
  name         text not null unique,            -- English name; this is also the key the cart uses
  name_bn      text,
  name_ar      text,
  category     text,
  category_bn  text,
  category_ar  text,
  sub          text,                            -- e.g. Beef / Chicken
  price        numeric(10,2) not null check (price >= 0),
  unit         text not null default 'lb' check (unit in ('lb','piece','each','pack')),
  tag          text,                            -- Popular / Fresh / New
  photo_key    text,                            -- built-in photo shipped with the website
  image_url    text,                            -- uploaded picture (Storage); overrides photo_key
  icon         text,
  halal        boolean not null default false,
  in_stock     boolean not null default true,
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists deals (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  pct         int not null check (pct between 1 and 90),
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort        int not null default 0
);

create table if not exists site_content (
  key         text primary key,
  en          text,
  bn          text,
  ar          text,
  updated_at  timestamptz not null default now()
);

create table if not exists settings (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,           -- DD-XXXXXX, shown to the customer
  user_id       uuid references profiles(id) on delete set null,
  customer_name text,
  phone         text,
  address       text,
  notes         text,
  status        order_status not null default 'new',
  pay_method    pay_method not null default 'cod',
  pay_status    pay_status not null default 'unpaid',
  subtotal      numeric(10,2) not null default 0,
  delivery_fee  numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  driver_id     uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  delivered_at  timestamptz
);

create table if not exists order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  bigint references products(id) on delete set null,
  name        text not null,
  qty         numeric(10,2) not null check (qty > 0),
  unit_price  numeric(10,2) not null,
  list_price  numeric(10,2) not null,
  photo_key   text,
  image_url   text
);

create table if not exists expenses (
  id          bigint generated always as identity primary key,
  spent_on    date not null default current_date,
  kind        text not null default 'expense' check (kind in ('expense','investment')),
  category    text,
  amount      numeric(10,2) not null check (amount >= 0),
  note        text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  user_id     uuid,
  action      text not null,
  table_name  text,
  row_id      text,
  detail      jsonb
);

create index if not exists orders_user_idx    on orders(user_id);
create index if not exists orders_driver_idx  on orders(driver_id);
create index if not exists orders_status_idx  on orders(status, created_at desc);
create index if not exists items_order_idx    on order_items(order_id);
create index if not exists deals_product_idx  on deals(product_id);
create index if not exists expenses_date_idx  on expenses(spent_on);
create index if not exists audit_at_idx       on audit_log(at desc);

-- ---------------------------------------------------------------------------------- role helpers
-- security definer = they read profiles without being blocked by the very policies that call them.
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;
create or replace function is_admin()  returns boolean language sql stable security definer set search_path = public as $$ select coalesce(my_role() = 'admin', false) $$;
create or replace function is_staff()  returns boolean language sql stable security definer set search_path = public as $$ select coalesce(my_role() in ('admin','staff'), false) $$;
create or replace function is_driver() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(my_role() = 'driver', false) $$;

create or replace function setting_num(k text, d numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  select value into v from settings where key = k;
  if v is null then return d; end if;
  return (v #>> '{}')::numeric;
exception when others then return d;
end $$;

create or replace function setting_bool(k text, d boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  select value into v from settings where key = k;
  if v is null then return d; end if;
  return (v #>> '{}')::boolean;
exception when others then return d;
end $$;

create or replace function gen_order_code() returns text
language plpgsql volatile as $$
declare chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; s text := ''; i int;
begin
  for i in 1..6 loop s := s || substr(chars, 1 + floor(random() * 36)::int, 1); end loop;
  return 'DD-' || s;
end $$;

-- ---------------------------------------------------------------------------------- new user → profile
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
          new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- people who signed up before this script ran
insert into profiles (id, full_name, phone)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), u.raw_user_meta_data ->> 'phone'
from auth.users u on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------- guards + housekeeping triggers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists products_touch on products;     create trigger products_touch     before update on products     for each row execute function set_updated_at();
drop trigger if exists site_content_touch on site_content; create trigger site_content_touch before update on site_content for each row execute function set_updated_at();
drop trigger if exists settings_touch on settings;     create trigger settings_touch     before update on settings     for each row execute function set_updated_at();
drop trigger if exists orders_touch on orders;         create trigger orders_touch       before update on orders       for each row execute function set_updated_at();

-- Only admins may change someone's role / active flag (SQL editor + service key have no auth.uid(), so they are allowed).
create or replace function profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.id is distinct from old.id or new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'only an admin can change role or status' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_t on profiles;
create trigger profiles_guard_t before update on profiles for each row execute function profiles_guard();

-- Staff can work on orders (status, driver, payment status, address fixes) but never touch money or ownership.
create or replace function orders_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.user_id is distinct from old.user_id or new.code is distinct from old.code or new.subtotal is distinct from old.subtotal
       or new.delivery_fee is distinct from old.delivery_fee or new.total is distinct from old.total or new.created_at is distinct from old.created_at then
      raise exception 'only an admin can change order totals, owner or code' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard_t on orders;
create trigger orders_guard_t before update on orders for each row execute function orders_guard();

-- Audit trail: who changed what. (Changes made from the SQL editor / seed have no user and are not logged.)
create or replace function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); jn jsonb; jo jsonb; d jsonb; rid text;
begin
  if uid is null then return null; end if;
  if tg_op = 'INSERT' then
    jn := to_jsonb(new); d := jsonb_build_object('new', jn); rid := coalesce(jn ->> 'id', jn ->> 'key');
  elsif tg_op = 'DELETE' then
    jo := to_jsonb(old); d := jsonb_build_object('old', jo); rid := coalesce(jo ->> 'id', jo ->> 'key');
  else
    jn := to_jsonb(new); jo := to_jsonb(old); rid := coalesce(jn ->> 'id', jn ->> 'key');
    select jsonb_build_object('old', coalesce(jsonb_object_agg(n.key, jo -> n.key), '{}'::jsonb), 'new', coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb))
      into d from jsonb_each(jn) n where n.key <> 'updated_at' and (jo -> n.key) is distinct from n.value;
    if d -> 'new' = '{}'::jsonb then return null; end if;
  end if;
  insert into audit_log (user_id, action, table_name, row_id, detail) values (uid, lower(tg_op), tg_table_name, rid, d);
  return null;
end $$;
drop trigger if exists products_audit on products;         create trigger products_audit     after insert or update or delete on products     for each row execute function audit_row();
drop trigger if exists deals_audit on deals;               create trigger deals_audit        after insert or update or delete on deals        for each row execute function audit_row();
drop trigger if exists site_content_audit on site_content; create trigger site_content_audit after insert or update or delete on site_content for each row execute function audit_row();
drop trigger if exists settings_audit on settings;         create trigger settings_audit     after insert or update or delete on settings     for each row execute function audit_row();
drop trigger if exists orders_audit on orders;             create trigger orders_audit       after insert or update or delete on orders       for each row execute function audit_row();

-- ---------------------------------------------------------------------------------- RPC: place_order
-- The browser sends ONLY product names + quantities. Prices, deals, delivery fee and totals are computed here.
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

  if coalesce(p_pay, 'cod') = 'card' then raise exception 'card payments not enabled yet'; end if;
  if coalesce(p_pay, 'cod') <> 'cod' then raise exception 'invalid payment method'; end if;

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
      values (v_code, uid, v_name, btrim(p_phone), btrim(p_address), nullif(btrim(coalesce(p_notes, '')), ''), 'new', 'cod', 'unpaid', v_sub, v_fee, v_sub + v_fee)
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

  return jsonb_build_object('id', v_id, 'code', v_code, 'subtotal', v_sub, 'delivery_fee', v_fee, 'total', v_sub + v_fee, 'status', 'new',
    'items', (select jsonb_agg(jsonb_build_object('name', x ->> 'name', 'qty', (x ->> 'qty')::numeric, 'unit_price', (x ->> 'unit_price')::numeric))
              from jsonb_array_elements(v_lines) x));
end $$;

-- ---------------------------------------------------------------------------------- RPC: driver_set_status
create or replace function driver_set_status(p_order uuid, p_status order_status) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); role_ user_role := my_role(); o orders%rowtype;
begin
  if uid is null or role_ is null or role_ not in ('driver','staff','admin') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into o from orders where id = p_order;
  if not found then raise exception 'order not found'; end if;
  if role_ = 'driver' then
    if o.driver_id is distinct from uid then raise exception 'this order is not assigned to you' using errcode = '42501'; end if;
    if p_status not in ('out_for_delivery','delivered') then raise exception 'drivers can only mark out for delivery or delivered' using errcode = '42501'; end if;
  end if;
  update orders set status = p_status, delivered_at = case when p_status = 'delivered' then now() else delivered_at end where id = p_order;
  return (select jsonb_build_object('id', id, 'code', code, 'status', status, 'delivered_at', delivered_at) from orders where id = p_order);
end $$;

-- ---------------------------------------------------------------------------------- RPC: admin_set_role
create or replace function admin_set_role(p_email text, p_role user_role) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare u_id uuid; u_email text;
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select id, email into u_id, u_email from auth.users where lower(email) = lower(btrim(p_email));
  if u_id is null then raise exception 'no account with that email — ask them to sign up first'; end if;
  if u_id = auth.uid() then raise exception 'you cannot change your own role'; end if;
  insert into profiles (id) values (u_id) on conflict (id) do nothing;
  update profiles set role = p_role where id = u_id;
  insert into audit_log (user_id, action, table_name, row_id, detail)
  values (auth.uid(), 'set_role', 'profiles', u_id::text, jsonb_build_object('email', u_email, 'role', p_role));
  return jsonb_build_object('id', u_id, 'email', u_email, 'role', p_role);
end $$;

-- ---------------------------------------------------------------------------------- row level security
alter table profiles     enable row level security;
alter table products     enable row level security;
alter table deals        enable row level security;
alter table site_content enable row level security;
alter table settings     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table expenses     enable row level security;
alter table audit_log    enable row level security;

-- profiles
drop policy if exists profiles_select_own   on profiles; create policy profiles_select_own   on profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_select_staff on profiles; create policy profiles_select_staff on profiles for select to authenticated using (is_staff());
drop policy if exists profiles_update_own   on profiles; create policy profiles_update_own   on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_all    on profiles; create policy profiles_admin_all    on profiles for all    to authenticated using (is_admin()) with check (is_admin());

-- shop content: anyone can read the public parts, only admins write
drop policy if exists products_read  on products; create policy products_read  on products for select to anon, authenticated using (active or is_staff());
drop policy if exists products_admin on products; create policy products_admin on products for all    to authenticated using (is_admin()) with check (is_admin());

drop policy if exists deals_read  on deals; create policy deals_read  on deals for select to anon, authenticated
  using ((active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or is_staff());
drop policy if exists deals_admin on deals; create policy deals_admin on deals for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists content_read  on site_content; create policy content_read  on site_content for select to anon, authenticated using (true);
drop policy if exists content_admin on site_content; create policy content_admin on site_content for all    to authenticated using (is_admin()) with check (is_admin());

drop policy if exists settings_read  on settings; create policy settings_read  on settings for select to anon, authenticated using (true);   -- never store secrets in settings
drop policy if exists settings_admin on settings; create policy settings_admin on settings for all    to authenticated using (is_admin()) with check (is_admin());

-- orders: customers see their own, staff see everything, drivers see only what is assigned to them.
-- There is NO insert policy: orders can only be created through place_order().
drop policy if exists orders_select       on orders; create policy orders_select       on orders for select to authenticated using (user_id = auth.uid() or is_staff() or driver_id = auth.uid());
drop policy if exists orders_staff_update on orders; create policy orders_staff_update on orders for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists orders_admin_delete on orders; create policy orders_admin_delete on orders for delete to authenticated using (is_admin());

drop policy if exists items_select on order_items; create policy items_select on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_items.order_id));            -- follows the visibility of the parent order
drop policy if exists items_admin  on order_items; create policy items_admin  on order_items for all to authenticated using (is_admin()) with check (is_admin());

-- money + audit: admin only
drop policy if exists expenses_admin on expenses;  create policy expenses_admin on expenses  for all    to authenticated using (is_admin()) with check (is_admin());
drop policy if exists audit_admin    on audit_log; create policy audit_admin    on audit_log for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------------- grants
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on products, deals, site_content, settings to anon;
grant select on profiles, products, deals, site_content, settings, orders, order_items, expenses, audit_log to authenticated;
grant insert, update, delete on products, deals, site_content, settings, expenses, order_items to authenticated;
grant insert, delete on profiles to authenticated;      -- policies limit this to admins
grant update on profiles, orders to authenticated;
grant delete on orders to authenticated;
grant usage on all sequences in schema public to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function my_role(), is_admin(), is_staff(), is_driver() to anon, authenticated;   -- needed inside the policies
grant execute on function place_order(jsonb, text, text, text, text, text) to authenticated;
grant execute on function driver_set_status(uuid, order_status)           to authenticated;
grant execute on function admin_set_role(text, user_role)                 to authenticated;

-- ---------------------------------------------------------------------------------- storage (pictures)
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_read   on storage.objects; create policy media_read   on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_insert on storage.objects; create policy media_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_update on storage.objects; create policy media_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists media_delete on storage.objects; create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------------------- live updates for the dashboard (if Realtime is available)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table orders; exception when duplicate_object then null; end;
  end if;
end $$;

-- =====================================================================================================
-- MAKE YOURSELF ADMIN  (do this once, AFTER you have signed up on the website with your own email)
-- Remove the two dashes at the start of the lines below, put YOUR email in, and run just those lines:
--
--   update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOU@example.com');
--
-- Staff and drivers: they sign up on the website like customers; then, signed in as admin, run
--   select admin_set_role('driver@example.com', 'driver');     -- or 'staff'
-- (the dashboard will do this for you with one click later).
-- =====================================================================================================
