-- =============================================
-- ZYFAY DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PRODUCTS TABLE
-- =============================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text not null, -- 'topup', 'voucher', 'item'
  game_id text, -- e.g. 'mlbb', 'ff', null for vouchers
  game_name text,
  publisher text,
  image_url text,
  tv_code text, -- TokoVoucher product code
  price integer not null default 0, -- harga jual (IDR)
  original_price integer default 0, -- harga modal
  is_active boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}', -- extra data e.g. diamond_amount, bonus
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- GAMES TABLE
-- =============================================
create table if not exists games (
  id text primary key, -- e.g. 'mlbb', 'ff'
  name text not null,
  publisher text,
  image_url text,
  category text default 'mobile', -- 'mobile', 'pc', 'console'
  is_trending boolean default false,
  is_active boolean default true,
  sort_order integer default 0,
  fields jsonb default '[]', -- form fields: [{name, label, placeholder}]
  created_at timestamptz default now()
);

-- =============================================
-- ORDERS TABLE
-- =============================================
create table if not exists orders (
  id text primary key, -- ORD-timestamp
  ref_id uuid default uuid_generate_v4(),
  user_name text,
  user_email text,
  game_id text,
  game_name text,
  product_id uuid references products(id),
  product_name text,
  product_price integer,
  payment_method text,
  payment_status text default 'pending', -- pending, paid, failed, expired
  order_status text default 'pending', -- pending, processing, success, failed
  form_data jsonb default '{}', -- user_id, zone_id, etc
  midtrans_token text,
  midtrans_url text,
  tv_trx_id text,
  tv_sn text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- CHAT SESSIONS TABLE
-- =============================================
create table if not exists chat_sessions (
  id text primary key,
  user_name text,
  user_email text,
  status text default 'waiting', -- waiting, active, resolved
  unread_admin integer default 0,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

-- =============================================
-- CHAT MESSAGES TABLE
-- =============================================
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id text references chat_sessions(id) on delete cascade,
  sender text not null, -- 'user' | 'admin'
  text text not null,
  created_at timestamptz default now()
);

-- =============================================
-- Enable Realtime on chat tables
-- =============================================
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table chat_sessions;
alter publication supabase_realtime add table orders;

-- =============================================
-- SEED DEFAULT GAMES
-- =============================================
insert into games (id, name, publisher, category, is_trending, sort_order, fields) values
('mlbb', 'Mobile Legends', 'Moonton', 'mobile', true, 1, '[{"name":"user_id","label":"User ID","placeholder":"Masukkan User ID"},{"name":"zone_id","label":"Zone ID","placeholder":"Masukkan Zone ID"}]'),
('ff', 'Free Fire', 'Garena', 'mobile', true, 2, '[{"name":"user_id","label":"User ID","placeholder":"Masukkan User ID"}]'),
('pubg', 'PUBG Mobile', 'Tencent Games', 'mobile', true, 3, '[{"name":"user_id","label":"Player ID","placeholder":"Masukkan Player ID"}]'),
('valorant', 'Valorant', 'Riot Games', 'pc', true, 4, '[{"name":"user_id","label":"Riot ID","placeholder":"RiotID#TAG"}]'),
('genshin', 'Genshin Impact', 'HoYoverse', 'mobile', false, 5, '[{"name":"user_id","label":"UID","placeholder":"Masukkan UID"},{"name":"server","label":"Server","placeholder":"Asia / America / Europe"}]'),
('honkai', 'Honkai: Star Rail', 'HoYoverse', 'mobile', false, 6, '[{"name":"user_id","label":"UID","placeholder":"Masukkan UID"},{"name":"server","label":"Server","placeholder":"Asia / America / Europe"}]')
on conflict (id) do nothing;

-- =============================================
-- SEED DEFAULT PRODUCTS (Mobile Legends)
-- =============================================
insert into products (name, game_id, game_name, publisher, category, price, original_price, tv_code, metadata, sort_order) values
('86 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 19000, 16000, 'MLBB-86', '{"diamond":86}', 1),
('172 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 37000, 32000, 'MLBB-172', '{"diamond":172}', 2),
('257 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 55000, 48000, 'MLBB-257', '{"diamond":257}', 3),
('344 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 73000, 65000, 'MLBB-344', '{"diamond":344}', 4),
('514 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 109000, 97000, 'MLBB-514', '{"diamond":514}', 5),
('706 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 149000, 133000, 'MLBB-706', '{"diamond":706,"bonus":50}', 6),
('1060 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 219000, 196000, 'MLBB-1060', '{"diamond":1060,"bonus":100}', 7),
('2195 Diamonds', 'mlbb', 'Mobile Legends', 'Moonton', 'topup', 449000, 402000, 'MLBB-2195', '{"diamond":2195,"bonus":195}', 8)
on conflict do nothing;

-- Row Level Security (buat public read products & games)
alter table products enable row level security;
alter table games enable row level security;
alter table orders enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Public can read active products and games
create policy "public read products" on products for select using (is_active = true);
create policy "public read games" on games for select using (is_active = true);

-- Public can insert orders and chats
create policy "public insert orders" on orders for insert with check (true);
create policy "public read own order" on orders for select using (true);
create policy "public insert chat session" on chat_sessions for insert with check (true);
create policy "public insert chat message" on chat_messages for insert with check (true);
create policy "public read chat messages" on chat_messages for select using (true);
create policy "public read chat sessions" on chat_sessions for select using (true);
create policy "public update chat session" on chat_sessions for update using (true);
