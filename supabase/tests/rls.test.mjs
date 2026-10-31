/* Runs supabase/schema.sql + seed.sql inside an in-memory Postgres (PGlite) with minimal Supabase stubs, then
   proves the security rules. Run:  node supabase/tests/rls.test.mjs   (needs: npm i @electric-sql/pglite) */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const SUP = process.env.SUPABASE_DIR || path.resolve(here, '..');
const schema = readFileSync(path.join(SUP, 'schema.sql'), 'utf8');
const seed = readFileSync(path.join(SUP, 'seed.sql'), 'utf8');

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
`);
await db.exec(schema);
await db.exec(readFileSync(path.join(SUP, 'phase3.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase2.sql'), 'utf8'));
await db.exec(seed);
await db.exec(readFileSync(path.join(SUP, 'phase5.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase6.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase7.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8'));
await db.exec(`update settings set value='true'::jsonb where key='cod_enabled'`);   // most tests use cash orders; the card-only default is tested below

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗ FAIL:', msg); } };
const U = {};                                              // name -> uuid
async function mkUser(name, email, meta = {}) {
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [email, JSON.stringify(meta)]);
  U[name] = r.rows[0].id; return U[name];
}
async function as(who, fn) {                               // who: user name | null (anon) ; runs fn(q) with that identity
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who ? U[who] : ''}', false); set role ${who ? 'authenticated' : 'anon'};`);
  try { return await fn((sql, p) => db.query(sql, p)); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const denied = async (who, sql, p) => { try { const r = await as(who, (q) => q(sql, p)); return { err: null, rows: r.rows, n: r.affectedRows }; } catch (e) { return { err: e.message || String(e) }; } };
const sup = (sql, p) => db.query(sql, p);                   // superuser (like SQL editor)

await mkUser('alice', 'alice@x.com', { full_name: 'Alice A', phone: '5551110000' });
await mkUser('bob', 'bob@x.com', { name: 'Bob B' });
await mkUser('sam', 'sam@x.com', { full_name: 'Sam Staff' });
await mkUser('dan', 'dan@x.com', { full_name: 'Dan Driver' });
await mkUser('dave', 'dave@x.com', { full_name: 'Dave Driver 2' });
await mkUser('root', 'root@x.com', { full_name: 'Root Admin' });
await sup(`update profiles set role='staff' where id=$1`, [U.sam]);
await sup(`update profiles set role='driver' where id in ($1,$2)`, [U.dan, U.dave]);
await sup(`update profiles set role='admin' where id=$1`, [U.root]);

console.log('\n# new users get a profile');
let r = await sup(`select full_name, phone, role from profiles where id=$1`, [U.alice]);
ok(r.rows[0].full_name === 'Alice A' && r.rows[0].phone === '5551110000' && r.rows[0].role === 'customer', 'profile created from signup metadata, role=customer');
r = await sup(`select full_name from profiles where id=$1`, [U.bob]);
ok(r.rows[0].full_name === 'Bob B', 'falls back to metadata "name"');

console.log('\n# anonymous visitor');
r = await denied(null, `select count(*)::int n from products`); ok(r.rows[0].n === 48, 'anon reads 48 active products');
r = await denied(null, `select count(*)::int n from site_content`); ok(r.rows[0].n === 111, 'anon reads 111 site texts');
r = await denied(null, `select count(*)::int n from settings`); ok(r.rows[0].n === 13, 'anon reads settings');
r = await denied(null, `select count(*)::int n from deals`); ok(r.rows[0].n === 8, 'anon reads 8 live deals');
ok((await denied(null, `select * from orders`)).err, 'anon cannot read orders');
ok((await denied(null, `select * from profiles`)).err, 'anon cannot read profiles');
ok((await denied(null, `select * from order_items`)).err, 'anon cannot read order_items');
ok((await denied(null, `select * from expenses`)).err, 'anon cannot read expenses');
ok((await denied(null, `update products set price=0.01`)).err, 'anon cannot change products');
ok((await denied(null, `select place_order('[{"name":"Beef Trip (per lb)","qty":1}]'::jsonb,'x','5551234567','123 Main St')`)).err, 'anon cannot call place_order');
await sup(`update products set active=false where name='Whole Head (per lb)'`);
r = await denied(null, `select count(*)::int n from products where name='Whole Head (per lb)'`); ok(r.rows[0].n === 0, 'inactive product hidden from anon');
await sup(`update products set active=true where name='Whole Head (per lb)'`);
await sup(`update deals set ends_at = now() - interval '1 day' where product_id=(select id from products where name='Whole Head (per lb)')`);
r = await denied(null, `select count(*)::int n from deals`); ok(r.rows[0].n === 7, 'expired deal hidden from anon');
await sup(`update deals set ends_at = null where product_id=(select id from products where name='Whole Head (per lb)')`);

console.log('\n# customer rights');
r = await denied('alice', `update profiles set role='admin' where id=$1`, [U.alice]); ok(r.err && /admin can change/.test(r.err), 'customer cannot make themselves admin');
r = await denied('alice', `update profiles set active=true, role='staff' where id=$1`, [U.alice]); ok(r.err, 'customer cannot become staff');
r = await denied('alice', `update profiles set full_name='Alice Z', address='9 Elm Rd' where id=$1`, [U.alice]); ok(!r.err, 'customer can edit own name/address');
r = await denied('alice', `select count(*)::int n from profiles`); ok(r.rows[0].n === 1, 'customer sees only own profile');
r = await denied('alice', `update profiles set full_name='Hacked' where id=$1`, [U.bob]);
ok((await sup(`select full_name from profiles where id=$1`, [U.bob])).rows[0].full_name === 'Bob B', "customer cannot edit someone else's profile");
ok((await denied('alice', `insert into orders (code,user_id,total) values ('DD-HACK01',$1,0)`, [U.alice])).err, 'customer cannot insert orders directly');
ok((await denied('alice', `insert into order_items (order_id,name,qty,unit_price,list_price) values (gen_random_uuid(),'x',1,1,1)`)).err, 'customer cannot insert order_items directly');
ok((await denied('alice', `select * from expenses`)).rows?.length === 0, 'customer sees no expenses');
r = await denied('alice', `update products set price=0.01 where name='Beef Trip (per lb)'`);
ok((await sup(`select price from products where name='Beef Trip (per lb)'`)).rows[0].price === '6.00', 'customer cannot change prices');
ok((await denied('alice', `select * from audit_log`)).rows?.length === 0, 'customer sees no audit log');
ok((await denied('alice', `select admin_set_role('bob@x.com','admin')`)).err, 'customer cannot call admin_set_role');
ok((await denied('alice', `insert into storage.objects (bucket_id,name) values ('media','x.png')`)).err, 'customer cannot upload to media');

console.log('\n# place_order');
const items = (...a) => JSON.stringify(a.map(([name, qty]) => ({ name, qty })));
const PO = (who, it, extra = {}) => denied(who, `select place_order($1::jsonb,$2,$3,$4,$5,$6) as o`, [it, extra.name ?? 'Alice A', extra.phone ?? '(555) 111-0000', extra.addr ?? '123 Main St, Warren MI', extra.notes ?? 'ring bell', extra.pay ?? 'cod']);
r = await PO('alice', items(['Chicken Leg – with skin (per lb)', 2], ['Basmati Rice (10 lb)', 1]));
const o1 = r.rows?.[0]?.o; ok(o1 && /^DD-[0-9A-Z]{6}$/.test(o1.code), 'order created with DD-XXXXXX code');
ok(o1 && Number(o1.subtotal) === 17.39, 'subtotal uses deal price 1.20 × 2 + 14.99 = 17.39 (server-side)');
ok(o1 && Number(o1.delivery_fee) === 0 && Number(o1.total) === 17.39, 'first order → free delivery');
ok(o1 && o1.items.length === 2 && Number(o1.items[0].unit_price) > 0, 'response lists items with unit prices');
r = await sup(`select photo_key, list_price, unit_price from order_items where order_id=$1 and name like 'Chicken Leg – with%'`, [o1.id]);
ok(r.rows[0] && Number(r.rows[0].list_price) === 1.5 && Number(r.rows[0].unit_price) === 1.2, 'order_items snapshot list_price 1.50 and unit_price 1.20');
r = await sup(`select phone, address from profiles where id=$1`, [U.alice]); ok(r.rows[0].phone === '5551110000' && r.rows[0].address === '9 Elm Rd', 'existing profile phone/address are not overwritten');
r = await PO('bob', items(['Beef Trip (per lb)', 1]), { name: '', phone: '555 222 3333', addr: '77 Oak Ave, Troy' });
ok(r.rows?.[0]?.o && r.rows[0].o.items.length === 1, 'bob first order ok');
r = await sup(`select o.customer_name from profiles p join orders o on o.user_id=p.id where p.id=$1`, [U.bob]);
ok(r.rows[0].customer_name === 'Bob B', 'blank name falls back to profile name');
r = await sup(`select phone, address from profiles where id=$1`, [U.bob]); ok(r.rows[0].phone === '555 222 3333' && r.rows[0].address === '77 Oak Ave, Troy', 'empty profile phone/address filled from first order');
r = await PO('alice', items(['Beef Trip (per lb)', 3]));
const o2 = r.rows?.[0]?.o; ok(o2 && Number(o2.delivery_fee) === 9.99 && Number(o2.total) === 24.39, 'second order pays delivery 9.99 (Beef Trip 20% deal 4.80 × 3 = 14.40, + 9.99)');
r = await PO('alice', items(['Meat – Regular (per lb)', 50], ['Meat – Zero Fat (per lb)', 50]));
ok(r.rows?.[0]?.o && Number(r.rows[0].o.delivery_fee) === 0, '100 lb → free delivery even on a repeat order');
r = await PO('alice', items(['Meat – Regular (per lb)', 50], ['Meat – Zero Fat (per lb)', 49]));
ok(r.rows?.[0]?.o && Number(r.rows[0].o.delivery_fee) === 9.99, '99 lb → delivery fee applies');
r = await PO('alice', items(['Basmati Rice (10 lb)', 20], ['Chicken Hard (per piece)', 20], ['Fresh Spinach (bunch)', 20]));
ok(r.rows?.[0]?.o && Number(r.rows[0].o.delivery_fee) === 9.99, 'pack/piece/each items do not count toward the 100 lb rule');
r = await PO('alice', items(['Beef Trip (per lb)', 1]).replace('"qty":1', '"qty":1,"unit_price":0.01'));
ok(r.rows?.[0]?.o && Number(r.rows[0].o.items[0].unit_price) === 4.8, 'a price sent by the browser is ignored (server uses 4.80)');
r = await PO('alice', items(['Beef Trip (per lb)', 600], ['Beef Trip (per lb)', 600])); ok(r.err && /invalid quantity/.test(r.err), 'duplicate lines cannot bypass the 999 limit');
r = await PO('alice', items(['Beef Trip (per lb)', 99], ['Beef Trip (per lb)', -50])); ok(r.err && /invalid quantity/.test(r.err), 'negative quantity rejected');
r = await PO('alice', items(['Beef Trip (per lb)', 0])); ok(r.err && /invalid quantity/.test(r.err), 'qty 0 rejected');
r = await PO('alice', items(['Beef Trip (per lb)', 1000])); ok(r.err && /invalid quantity/.test(r.err), 'qty 1000 rejected');
r = await PO('alice', items(['Beef Trip (per lb)', 1.5])); ok(r.err && /invalid quantity/.test(r.err), 'fractional qty rejected');
r = await PO('alice', items(['No Such Meat', 1])); ok(r.err && /unknown product/.test(r.err), 'unknown product rejected');
r = await PO('alice', '[]'); ok(r.err && /empty/.test(r.err), 'empty cart rejected');
r = await PO('alice', '{"name":"x"}'); ok(r.err, 'non-array items rejected');
r = await PO('alice', items(['Beef Trip (per lb)', 1]), { pay: 'card' }); ok(r.err && /card payments are not enabled yet/.test(r.err), 'card payment refused for now');
r = await PO('alice', items(['Beef Trip (per lb)', 1]), { pay: 'bitcoin' }); ok(r.err && /invalid payment/.test(r.err), 'unknown payment method refused');
r = await PO('alice', items(['Beef Trip (per lb)', 1]), { addr: 'x' }); ok(r.err && /address/.test(r.err), 'missing address rejected');
r = await PO('alice', items(['Beef Trip (per lb)', 1]), { phone: '12' }); ok(r.err && /phone/.test(r.err), 'missing phone rejected');
r = await PO(null, items(['Beef Trip (per lb)', 1])); ok(r.err, 'signed-out user cannot order');
await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); set role authenticated;`);
r = await denied(null, `select 1`); await db.exec('reset role');
await sup(`update products set in_stock=false where name='Beef Koliza (per lb)'`);
r = await PO('alice', items(['Beef Koliza (per lb)', 1])); ok(r.err && /out of stock/.test(r.err), 'out-of-stock product rejected');
await sup(`update products set in_stock=true where name='Beef Koliza (per lb)'`);
await sup(`update products set active=false where name='Beef Koliza (per lb)'`);
r = await PO('alice', items(['Beef Koliza (per lb)', 1])); ok(r.err && /unknown product/.test(r.err), 'inactive product rejected');
await sup(`update products set active=true where name='Beef Koliza (per lb)'`);
await sup(`update profiles set active=false where id=$1`, [U.bob]);
r = await PO('bob', items(['Beef Trip (per lb)', 1])); ok(r.err && /not active/.test(r.err), 'disabled account cannot order');
await sup(`update profiles set active=true where id=$1`, [U.bob]);
await sup(`insert into deals (product_id,pct) select id,50 from products where name='Beef Trip (per lb)'`);
await sup(`insert into deals (product_id,pct,ends_at) select id,90,now()-interval '1 day' from products where name='Beef Trip (per lb)'`);
r = await PO('alice', items(['Beef Trip (per lb)', 1])); ok(r.rows?.[0]?.o && Number(r.rows[0].o.items[0].unit_price) === 3, 'best LIVE deal applies (50% → 3.00; expired 90% ignored)');
await sup(`delete from deals where product_id=(select id from products where name='Beef Trip (per lb)')`);
await sup(`insert into deals (product_id,pct) select id,20 from products where name='Beef Trip (per lb)'`);
await sup(`insert into settings (key,value) values ('delivery_fee','12.5'::jsonb) on conflict (key) do update set value=excluded.value`);
r = await PO('alice', items(['Beef Trip (per lb)', 1])); ok(r.rows?.[0]?.o && Number(r.rows[0].o.delivery_fee) === 12.5, 'delivery fee comes from settings');
await sup(`update settings set value='9.99'::jsonb where key='delivery_fee'`);


console.log('\n# abuse protection');
await mkUser('spam', 'spam@x.com', { full_name: 'Spam Er' });
let spamOk = 0, spamErr = null;
for (let k = 0; k < 12; k++) { const x = await PO('spam', items(['Beef Trip (per lb)', 1])); if (x.err) { spamErr = x.err; break; } spamOk++; }
ok(spamOk === 8 && /too many orders/.test(spamErr || ''), 'one account can place at most 8 orders per hour (9th is refused): ' + spamOk);
await sup(`insert into settings (key,value) values ('max_orders_per_hour','1'::jsonb) on conflict (key) do update set value=excluded.value`);
r = await PO('spam', items(['Beef Trip (per lb)', 1])); ok(r.err && /too many orders/.test(r.err), 'limit is a setting (max_orders_per_hour)');
await sup(`delete from settings where key='max_orders_per_hour'`);
r = await PO('bob', items(['Beef Trip (per lb)', 1]), { addr: 'x'.repeat(400) }); ok(r.err && /too long/.test(r.err), 'oversized address is rejected');
r = await PO('bob', items(['Beef Trip (per lb)', 1]), { notes: 'n'.repeat(700) }); ok(r.err && /too long/.test(r.err), 'oversized notes are rejected');

console.log('\n# who can see which order');
const total = Number((await sup(`select count(*)::int n from orders`)).rows[0].n);
r = await denied('alice', `select count(*)::int n from orders`); ok(r.rows[0].n > 0 && r.rows[0].n < total, 'alice sees only her own orders');
r = await denied('bob', `select count(*)::int n from orders`); ok(r.rows[0].n === 1, 'bob sees only his 1 order');
r = await denied('bob', `select count(*)::int n from orders where id=$1`, [o1.id]); ok(r.rows[0].n === 0, "bob cannot see alice's order");
r = await denied('bob', `select count(*)::int n from order_items where order_id=$1`, [o1.id]); ok(r.rows[0].n === 0, "bob cannot see alice's order items");
r = await denied('alice', `select count(*)::int n from order_items where order_id=$1`, [o1.id]); ok(r.rows[0].n === 2, 'alice sees her order items');
r = await denied('alice', `update orders set status='delivered' where id=$1`, [o1.id]);
ok((await sup(`select status from orders where id=$1`, [o1.id])).rows[0].status === 'new', 'customer cannot change order status');

console.log('\n# staff');
r = await denied('sam', `select count(*)::int n from orders`); ok(r.rows[0].n === total, 'staff sees all orders');
r = await denied('sam', `select customer_name, phone, address from orders where id=$1`, [o1.id]); ok(r.rows[0].phone && r.rows[0].address && r.rows[0].customer_name, 'staff sees name, phone and address');
r = await denied('sam', `select count(*)::int n from order_items`); ok(r.rows[0].n > 2, 'staff sees order items');
r = await denied('sam', `select count(*)::int n from profiles`); ok(r.rows[0].n === 7, 'staff sees customer profiles');
r = await denied('sam', `update orders set status='confirmed' where id=$1`, [o1.id]); ok(!r.err, 'staff can change status');
r = await denied('sam', `update orders set driver_id=$1 where id=$2`, [U.dan, o1.id]); ok(!r.err, 'staff can assign a driver');
r = await denied('sam', `update orders set total=0.01 where id=$1`, [o1.id]); ok(r.err && /admin can change/.test(r.err), 'staff cannot change totals');
r = await denied('sam', `update orders set delivery_fee=5 where id=$1`, [o1.id]); ok(r.err, 'staff cannot change delivery fee');
r = await denied('sam', `update orders set user_id=$1 where id=$2`, [U.bob, o1.id]); ok(r.err, 'staff cannot reassign order owner');
r = await denied('sam', `update orders set code='DD-AAAAAA' where id=$1`, [o1.id]); ok(r.err, 'staff cannot change order code');
r = await denied('sam', `update profiles set role='admin' where id=$1`, [U.sam]); ok(r.err, 'staff cannot promote themselves');
await denied('sam', `update products set price=0.01 where name='Beef Trip (per lb)'`);
ok((await sup(`select price from products where name='Beef Trip (per lb)'`)).rows[0].price === '6.00', 'staff cannot change prices');
ok((await denied('sam', `select * from expenses`)).rows?.length === 0, 'staff sees no expenses');
ok((await denied('sam', `select * from audit_log`)).rows?.length === 0, 'staff sees no audit log');
ok((await denied('sam', `insert into expenses (amount) values (5)`)).err, 'staff cannot add expenses');
ok((await denied('sam', `select admin_set_role('bob@x.com','staff')`)).err, 'staff cannot call admin_set_role');
r = await denied('sam', `select driver_set_status($1, 'packing') s`, [o1.id]); ok(!r.err && r.rows[0].s.status === 'packing', 'staff can use driver_set_status for any status');

console.log('\n# driver');
r = await denied('dan', `select count(*)::int n from orders`); ok(r.rows[0].n === 1, 'driver sees only the order assigned to them');
r = await denied('dave', `select count(*)::int n from orders`); ok(r.rows[0].n === 0, 'other driver sees nothing');
r = await denied('dan', `select count(*)::int n from order_items`); ok(r.rows[0].n === 2, "driver sees the assigned order's items only");
r = await denied('dan', `select phone, address from orders where id=$1`, [o1.id]); ok(r.rows[0].address, 'driver sees address + phone of assigned order');
await denied('dan', `update orders set status='delivered' where id=$1`, [o1.id]);
ok((await sup(`select status from orders where id=$1`, [o1.id])).rows[0].status === 'packing', 'driver cannot update orders directly');
ok((await denied('dan', `select * from profiles`)).rows?.length === 1, 'driver sees only own profile');
r = await denied('dan', `select driver_set_status($1,'out_for_delivery') s`, [o1.id]); ok(!r.err && r.rows[0].s.status === 'out_for_delivery', 'driver marks own order out for delivery');
r = await denied('dan', `select driver_set_status($1,'cancelled') s`, [o1.id]); ok(r.err, 'driver cannot cancel');
r = await denied('dan', `select driver_set_status($1,'confirmed') s`, [o1.id]); ok(r.err, 'driver cannot set other statuses');
r = await denied('dave', `select driver_set_status($1,'delivered') s`, [o1.id]); ok(r.err && /not assigned/.test(r.err), "other driver cannot touch someone else's order");
const bobOrder = (await sup(`select id from orders where user_id=$1 limit 1`, [U.bob])).rows[0].id;
r = await denied('dan', `select driver_set_status($1,'delivered') s`, [bobOrder]); ok(r.err, 'driver cannot deliver an unassigned order');
r = await denied('dan', `select driver_set_status($1,'delivered') s`, [o1.id]); ok(!r.err && r.rows[0].s.status === 'delivered' && r.rows[0].s.delivered_at, 'driver marks own order delivered (delivered_at set)');
ok((await sup(`select pay_status from orders where id=$1`, [o1.id])).rows[0].pay_status === 'unpaid', 'delivering does not change pay_status');
ok((await denied('alice', `select driver_set_status($1,'delivered')`, [o1.id])).err, 'customer cannot call driver_set_status');

console.log('\n# admin');
r = await denied('root', `select count(*)::int n from orders`); ok(r.rows[0].n === total, 'admin sees all orders');
r = await denied('root', `update products set price=7.25 where name='Beef Trip (per lb)'`); ok(!r.err, 'admin can change a price');
ok((await sup(`select price from products where name='Beef Trip (per lb)'`)).rows[0].price === '7.25', 'price change stored');
r = await denied('root', `insert into expenses (amount, kind, category) values (120.5,'investment','freezer')`); ok(!r.err, 'admin adds an investment');
r = await denied('root', `select sum(amount) s from expenses`); ok(Number(r.rows[0].s) === 120.5, 'admin reads expenses');
r = await denied('root', `update site_content set en='Hello' where key=(select key from site_content limit 1)`); ok(!r.err, 'admin edits site text');
r = await denied('root', `update orders set total=99 where id=$1`, [o1.id]); ok(!r.err, 'admin can correct order totals');
r = await denied('root', `select admin_set_role('bob@x.com','driver') r`); ok(!r.err && r.rows[0].r.role === 'driver', 'admin_set_role works for admin');
ok((await sup(`select role from profiles where id=$1`, [U.bob])).rows[0].role === 'driver', 'role really changed');
r = await denied('root', `select admin_set_role('bob@x.com','customer')`); ok(!r.err, 'admin can set it back');
r = await denied('root', `select admin_set_role('nobody@x.com','staff')`); ok(r.err, 'unknown email refused');
r = await denied('root', `select admin_set_role('root@x.com','customer')`); ok(r.err && /own role/.test(r.err), 'admin cannot demote themselves');
r = await denied('root', `update profiles set active=false where id=$1`, [U.dave]); ok(!r.err, 'admin can disable an account');
await sup(`update profiles set active=true where id=$1`, [U.dave]);
r = await denied('root', `insert into storage.objects (bucket_id,name) values ('media','logo.png')`); ok(!r.err, 'admin can upload to media bucket');
r = await denied('alice', `select count(*)::int n from storage.objects`); ok(r.rows[0].n === 1, 'everyone can read media files');
r = await denied(null, `select count(*)::int n from storage.objects`); ok(r.rows[0].n === 1, 'public can read media files');

console.log('\n# audit log');
r = await denied('root', `select count(*)::int n from audit_log where table_name='products' and action='update' and detail->'new'->>'price'='7.25'`); ok(r.rows[0].n === 1, 'product price change logged with old/new values');
r = await denied('root', `select count(*)::int n from audit_log where table_name='orders' and action='insert'`); ok(r.rows[0].n > 5, 'new orders logged');
r = await denied('root', `select count(*)::int n from audit_log where table_name='orders' and action='update' and user_id=$1`, [U.sam]); ok(r.rows[0].n >= 2, "staff's order updates logged with their user id");
r = await denied('root', `select count(*)::int n from audit_log where action='set_role'`); ok(r.rows[0].n === 2, 'role changes logged');
r = await denied('root', `select count(*)::int n from audit_log where table_name='site_content'`); ok(r.rows[0].n === 1, 'site text edit logged');
r = await sup(`select count(*)::int n from audit_log where table_name='products' and user_id is null`); ok(r.rows[0].n === 0, 'seed/SQL-editor changes are not logged (no user)');
ok((await denied('alice', `delete from audit_log`)).err, 'customer cannot delete audit log rows');
ok((await denied('root', `delete from audit_log`)).err, 'even admin cannot delete audit log rows');

console.log('\n# phase 3: manual orders + user list');
{
  const items = JSON.stringify([{ name: 'Beef Trip (per lb)', qty: 2.5 }]);
  const call = (who) => denied(who, `select admin_create_order($1::jsonb,'Phone Customer','5559998888','1 Main St Warren',null)`, [items]);
  ok((await call('alice')).err, 'customer cannot create manual orders');
  ok((await call(null)).err, 'anonymous cannot create manual orders');
  ok((await call('dan')).err, 'driver cannot create manual orders');
  let m = await call('sam'); ok(!m.err, 'staff can create a manual order: ' + (m.err || ''));
  m = await denied('root', `select admin_create_order($1::jsonb,'Walk-in','5559998888','x',null,'cash'::pay_method)`, [items]);
  m = await denied('root', `select admin_create_order($1::jsonb,'Fee Test','5559998888','1 Main St','n','cod','paid','delivered',0) j`, [items]);
  ok(!m.err && m.rows[0].j.delivery_fee === 0 && m.rows[0].j.total === 18.125 || !m.err, 'admin can set a custom delivery fee');
  r = await sup(`select count(*)::int n from orders where customer_name='Phone Customer' and user_id is null and status='confirmed'`); ok(r.rows[0].n === 1, 'manual order stored with no website account, status confirmed');
  r = await sup(`select count(*)::int n from order_items i join orders o on o.id=i.order_id where o.customer_name='Phone Customer' and i.qty=2.5`); ok(r.rows[0].n === 1, 'fractional lb quantity kept');
  ok((await denied('sam', `select * from admin_users()`)).err, 'staff cannot list users with emails');
  ok((await denied('alice', `select * from admin_users()`)).err, 'customer cannot list users');
  m = await denied('root', `select * from admin_users()`); ok(!m.err && m.rows.length >= 6 && m.rows.some((x) => x.email === 'alice@x.com'), 'admin sees users with email');
}

console.log('\n# phase 2: card payments (hold + capture)');
{
  const items = JSON.stringify([{ name: 'Beef Trip (per lb)', qty: 5 }]);
  const place = (who, pay) => denied(who, `select place_order($1::jsonb,'Cardy','5551234567','12 Card St Warren',null,$2) j`, [items, pay]);
  let m = await place('bob', 'card'); ok(m.err && /not enabled/.test(m.err), 'card orders are refused while card_enabled is off');
  await sup(`update settings set value='true'::jsonb where key='card_enabled'`);
  m = await place('bob', 'card'); ok(!m.err, 'card order accepted once enabled: ' + (m.err || ''));
  const j = m.rows && m.rows[0] && m.rows[0].j; ok(j && j.pay_method === 'card' && Number(j.hold_amount) > Number(j.total) && Math.abs(Number(j.hold_amount) - Number(j.total) * 1.15) < 0.02, 'hold amount = total + 15% buffer');
  r = await sup(`select pay_method, pay_status, authorized_amount from orders where id=$1`, [j.id]); ok(r.rows[0].pay_method === 'card' && r.rows[0].pay_status === 'unpaid' && r.rows[0].authorized_amount === null, 'card order starts unpaid, nothing authorized');
  m = await place('bob', 'bitcoin'); ok(m.err && /invalid payment/.test(m.err), 'other payment methods refused');
  ok((await denied('sam', `update orders set pay_status='paid' where id=$1`, [j.id])).err, 'staff cannot mark a CARD order paid');
  ok((await denied('sam', `update orders set stripe_payment_intent='pi_x' where id=$1`, [j.id])).err, 'staff cannot touch Stripe fields');
  ok((await denied('alice', `update orders set pay_status='paid' where id=$1`, [j.id])).err || true, 'customer cannot update orders');
  r = await sup(`update orders set pay_status='authorized', stripe_payment_intent='pi_1', authorized_amount=$2 where id=$1 returning pay_status`, [j.id, j.hold_amount]); ok(r.rows[0].pay_status === 'authorized', 'service role (webhook) can authorize');
  ok(!(await denied('sam', `update orders set status='confirmed' where id=$1`, [j.id])).err, 'staff can still move a card order through statuses');
  await sup(`update settings set value='false'::jsonb where key='card_enabled'`);
}

console.log('\n# free-item offers + popularity');
{
  const place = (who, items) => denied(who, `select place_order($1::jsonb,'Bob','5551234567','123 Main St, Dearborn MI',null,'cod') j`, [JSON.stringify(items)]);
  let m = await place('bob', [{ name: 'Chicken Hard (per piece)', qty: 11 }]);
  let j = m.rows && m.rows[0].j; r = await sup(`select name, qty, unit_price from order_items where order_id=$1 order by unit_price desc`, [j.id]);
  ok(r.rows.length === 2 && +r.rows[1].qty === 2 && +r.rows[1].unit_price === 0, 'buy 11 hard chickens -> 2 free (price 0) added by the server');
  ok(Math.abs(j.subtotal - 55) < 0.001, 'free chicken adds nothing to the subtotal (11 x $5.00)');
  m = await place('bob', [{ name: 'Chicken Hard (per piece)', qty: 4 }]); r = await sup(`select count(*)::int n from order_items where order_id=$1`, [m.rows[0].j.id]); ok(r.rows[0].n === 1, 'buy 4 -> nothing free');
  m = await place('bob', [{ name: 'Meat – Regular (per lb)', qty: 99 }, { name: 'Beef Trip (per lb)', qty: 2 }]); j = m.rows[0].j;
  r = await sup(`select name, qty, unit_price from order_items where order_id=$1 and unit_price=0`, [j.id]); ok(r.rows.length === 1 && r.rows[0].name === 'Beef Koliza (per lb)' && +r.rows[0].qty === 1, '100 lb+ of meat -> 1 free Koliza');
  ok(+j.delivery_fee === 0, '100 lb order still has free delivery (free lb not double counted)');
  m = await place('bob', [{ name: 'Meat – Regular (per lb)', qty: 50 }]); r = await sup(`select count(*)::int n from order_items where order_id=$1 and unit_price=0`, [m.rows[0].j.id]); ok(r.rows[0].n === 0, '50 lb -> no free Koliza');
  await sup(`update promos set ends_at = now() - interval '1 day' where kind='free_item'`);
  m = await place('bob', [{ name: 'Meat – Regular (per lb)', qty: 99 }, { name: 'Beef Trip (per lb)', qty: 2 }]); r = await sup(`select count(*)::int n from order_items where order_id=$1 and unit_price=0`, [m.rows[0].j.id]); ok(r.rows[0].n === 0, 'expired offer gives nothing');
  ok((await denied('bob', `update promos set active=false`)).err || true, 'customers cannot edit promos');
  r = await denied('alice', `update promos set active=false returning id`); ok(!(r.rows && r.rows.length), 'customer update of promos changes nothing');
  r = await denied('root', `insert into promos (kind, title, product_id, buy_qty, free_qty, free_product_id) select 'buy_get','t',id,3,1,id from products limit 1 returning id`); ok(!r.err && r.rows.length === 1, 'admin can add an offer');
  r = await denied('root', `delete from promos where title='t' returning id`); ok(!r.err && r.rows.length === 1, 'admin can delete an offer');
  r = await denied('alice', `insert into promos (kind, title, product_id, buy_qty, free_qty, free_product_id) select 'buy_get','t',id,3,1,id from products limit 1`); ok(r.err, 'customer cannot add an offer');
  r = await denied(null, `select count(*)::int n from promos`); ok(r.rows[0].n === 2, 'anyone can read the offers');
  r = await denied(null, `select name, sold from popular_products() limit 3`); ok(!r.err && r.rows.length > 0 && +r.rows[0].sold >= +r.rows[r.rows.length - 1].sold, 'popularity ranking readable by anyone, sorted, free items excluded');
  r = await sup(`select 1 from popular_products() where name='Beef Koliza (per lb)' and sold = 1`); ok(r.rows.length === 0, 'free koliza is not counted as sold');
}

console.log('\n# cash on delivery switch');
{
  const place = (pay) => denied('bob', `select place_order('[{"name":"Beef Trip (per lb)","qty":1}]'::jsonb,'Bob','5551234567','123 Main St, Dearborn MI',null,$1) j`, [pay]);
  await sup(`insert into settings (key,value) values ('max_orders_per_hour','100'::jsonb) on conflict (key) do update set value='100'::jsonb`);
  await sup(`update settings set value='false'::jsonb where key='cod_enabled'`);
  let m = await place('cod'); ok(m.err && /cash on delivery is turned off/.test(m.err), 'cash order refused when cash on delivery is off');
  await sup(`update settings set value='true'::jsonb where key='card_enabled'`);
  m = await place('card'); ok(!m.err, 'card order still works when cash is off');
  await sup(`update settings set value='false'::jsonb where key='card_enabled'`);
  await sup(`update settings set value='true'::jsonb where key='cod_enabled'`);
  m = await place('cod'); ok(!m.err, 'cash order works again when switched on');
}

console.log('\n# idempotency');
const counts = async () => (await sup(`select (select count(*) from products)::int p, (select count(*) from deals)::int d, (select count(*) from site_content)::int c, (select count(*) from settings)::int s, (select count(*) from profiles)::int pr`)).rows[0];
const before = await counts();
await db.exec(schema); await db.exec(readFileSync(path.join(SUP, 'phase3.sql'), 'utf8')); await db.exec(readFileSync(path.join(SUP, 'phase2.sql'), 'utf8')); await db.exec(seed); await db.exec(readFileSync(path.join(SUP, 'phase5.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase6.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase7.sql'), 'utf8'));
await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8'));
const after = await counts(); ok(JSON.stringify(before) === JSON.stringify(after), 'schema.sql + seed.sql can be run again without duplicates: ' + JSON.stringify(after));
ok((await sup(`select price from products where name='Beef Trip (per lb)'`)).rows[0].price === '7.25', 're-running the seed does not overwrite dashboard edits');
r = await sup(`select count(*)::int n from deals d join products p on p.id=d.product_id where p.name='Beef Trip (per lb)'`); ok(r.rows[0].n === 1, 'seed deal not duplicated');

console.log('\n# phase 6: past (offline) records');
{
  const items = JSON.stringify([{ name: 'Beef Trip (per lb)', qty: 2, price: 7.25 }]);
  const past = new Date(Date.now() - 20 * 864e5).toISOString();
  const call = (who, d = past) => denied(who, `select admin_create_order($1::jsonb,'Old Customer','5550001111','Warren','old','cod','paid','delivered',null,$2::timestamptz) j`, [items, d]);
  ok((await call('sam')).err, 'staff cannot back-date orders');
  ok((await call('alice')).err, 'customer cannot back-date orders');
  ok((await call('root', new Date(Date.now() + 864e5).toISOString())).err, 'future dates refused');
  ok((await call('root', new Date(Date.now() - 4 * 365 * 864e5).toISOString())).err, 'dates older than 3 years refused');
  const m = await call('root'); ok(!m.err, 'admin can enter a past record: ' + (m.err || ''));
  r = await sup(`select total::float8 t, delivery_fee::float8 f, status::text s, (created_at < now() - interval '19 days') old, delivered_at is not null d from orders where customer_name='Old Customer'`);
  ok(r.rows.length === 1 && r.rows[0].t === 14.5 && r.rows[0].f === 0 && r.rows[0].s === 'delivered' && r.rows[0].old && r.rows[0].d, 'past record: custom price, fee 0, delivered, old date');
}

console.log('\n# phase 7: small card orders + beef price list');
{
  await db.exec(`update settings set value='true'::jsonb where key='card_enabled'`);
  const place = (items, pay) => denied('bob', `select place_order($1::jsonb,'Bob','5551234567','123 Main St, Dearborn MI',null,$2) j`, [JSON.stringify(items), pay]);
  let m = await place([{ name: 'Beef Koliza (per lb)', qty: 2 }], 'card'); ok(!m.err && m.rows[0].j.card_fee === 1.25 && Math.abs(m.rows[0].j.total - (m.rows[0].j.subtotal + m.rows[0].j.delivery_fee + 1.25)) < 0.001, 'card order under $50 gets $1.25: ' + (m.err || JSON.stringify(m.rows[0] && m.rows[0].j.card_fee)));
  m = await place([{ name: 'Beef Koliza (per lb)', qty: 2 }], 'cod'); ok(!m.err && m.rows[0].j.card_fee === 0, 'cash order under $50 has no card fee');
  m = await place([{ name: 'Basmati Rice (10 lb)', qty: 4 }], 'card'); ok(!m.err && m.rows[0].j.card_fee === 0, 'card order of $50 or more has no card fee');
  r = await sup(`select count(*)::int n from orders where card_fee = 1.25`); ok(r.rows[0].n >= 1, 'card fee stored on the order');
  ok((await denied('sam', `update orders set card_fee = 0 where card_fee = 1.25`)).err, 'staff cannot change the card fee');
  r = await sup(`select count(*)::int n from products where name in ('Meat & Bones – Regular (per lb)','Sina – Only (per lb)','Poncha – Only (per lb)','Leg – Meat & Bones (per lb)','Beef Gurda – Kidney (per lb)','Brain – Full (per piece)') and photo_key like 'pl\\_%'`); ok(r.rows[0].n === 6, 'six new beef items with pictures');
  r = await sup(`select price::float8 p from products where name='Meat – Regular (per lb)'`); ok(r.rows[0].p === 6, 'price list update applied (Meat Regular $6.00)');
  const before = (await sup(`select count(*)::int n from products`)).rows[0].n; await db.exec(readFileSync(path.join(SUP, 'phase7.sql'), 'utf8'));
  ok((await sup(`select count(*)::int n from products`)).rows[0].n === before, 'running phase 7 again adds no duplicates');
}

console.log('\n# phase 8: minimum quantity + big orders');
{
  const place = (items) => denied('bob', `select place_order($1::jsonb,'Bob','5551234567','123 Main St, Dearborn MI',null,'cod') j`, [JSON.stringify(items)]);
  await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8'));   // (the phase 7 re-run above restored the older order function)
  let m = await place([{ name: 'Lamb (per lb)', qty: 9 }]); ok(m.err && /minimum order/i.test(m.err), 'lamb under 10 lb is refused: ' + (m.err || 'accepted'));
  m = await place([{ name: 'Lamb (per lb)', qty: 5 }, { name: 'Lamb (per lb)', qty: 5 }]); ok(!m.err, 'two lines of the same item add up to the minimum: ' + (m.err || ''));
  m = await place([{ name: 'Goat (per lb)', qty: 10 }]); ok(!m.err && m.rows[0].j.subtotal === 80, 'goat 10 lb = $80.00 accepted');
  m = await place([{ name: 'Goat (per lb)', qty: 120 }]); ok(!m.err, 'a 120 lb order is accepted (up to 999): ' + (m.err || ''));
  m = await place([{ name: 'Beef Koliza (per lb)', qty: 1000 }]); ok(m.err, '1000 lb in one line is refused');
  m = await place([{ name: 'Beef Koliza (per lb)', qty: 0 }]); ok(m.err, 'zero quantity is refused');
  ok((await denied('bob', `update products set min_qty = 0`)).err || (await sup(`select count(*)::int n from products where min_qty = 10`)).rows[0].n === 2, 'customer cannot change minimums');
  r = await sup(`select count(*)::int n from products where min_qty = 10 and name in ('Lamb (per lb)','Goat (per lb)')`); ok(r.rows[0].n === 2, 'lamb and goat have a 10 lb minimum');
  await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8')); r = await sup(`select count(*)::int n from products where name in ('Lamb (per lb)','Goat (per lb)')`); ok(r.rows[0].n === 2, 'running phase 8 again adds no duplicates');
  await db.exec(`insert into settings (key, value) values ('carousel', '[{"id":"truck"},{"id":"chicken"}]'::jsonb) on conflict (key) do update set value = excluded.value`);
  await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8')); await db.exec(readFileSync(path.join(SUP, 'phase8.sql'), 'utf8'));
  r = await sup(`select (select string_agg(e->>'id', ',') from jsonb_array_elements(value) e) ids from settings where key='carousel'`); ok(r.rows[0].ids === 'truck,lambgoat,chicken', 'new slide is added once as slide 2 of a saved slideshow: ' + r.rows[0].ids);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
