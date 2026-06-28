-- Sick Bed — Supabase schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ============================================================
-- LISTINGS — people who have listed themselves as unwell
-- ============================================================
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,           -- legal name incl. middle name — never shown publicly
  nickname text not null,            -- shown publicly on the board
  school text not null,              -- verification only — never shown publicly
  suburb text not null,
  address text not null,             -- delivery address — never shown publicly
  illness text,                      -- optional: flu_cold | stomach_bug | covid | broken_bones | man_flu
  wishlist jsonb not null default '[]', -- up to 10 product keys, e.g. ["lasagne", "pizza"]
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_listings_created_at on listings (created_at desc);

-- ============================================================
-- ORDERS — gift orders sent to a listed person
-- ============================================================
create sequence if not exists orders_code_seq start 1042;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default ('SB-' || nextval('orders_code_seq')::text),
  listing_id uuid references listings(id) on delete set null,
  recipient_name text not null,
  recipient_suburb text not null,
  delivery_address text,             -- collected separately, not shown to sender
  items jsonb not null default '[]', -- [{ key, name, price }]
  sender text not null,
  note text default '',
  delivery_fee numeric not null default 5,
  total numeric not null,
  status text not null default 'new' check (status in ('new', 'actioned')),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_status on orders (status);

-- ============================================================
-- Row Level Security
-- The Node service uses the Supabase service role key, which
-- bypasses RLS, so these tables can stay locked down to anon/public.
-- ============================================================
alter table listings enable row level security;
alter table orders enable row level security;
-- No policies added: only the service role (server-side) can read/write.
