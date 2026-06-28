-- Sick Bed — migration: add verification fields to listings
-- Run this in the Supabase SQL editor. Safe to run even if some
-- columns already exist (uses IF NOT EXISTS throughout).

alter table listings add column if not exists full_name text;
alter table listings add column if not exists nickname text;
alter table listings add column if not exists school text;
alter table listings add column if not exists address text;
alter table listings add column if not exists illness text;

-- Backfill nickname from the old "name" column so existing rows don't break
update listings set nickname = name where nickname is null and name is not null;

-- Once you've confirmed the backfill above looks right, you can optionally
-- drop the old column (not required — leaving it does no harm):
-- alter table listings drop column if exists name;

-- Enforce the new required fields going forward (existing rows are exempt
-- from constraints added this way, only future inserts are checked):
alter table listings alter column full_name set not null;
alter table listings alter column nickname set not null;
alter table listings alter column school set not null;
alter table listings alter column address set not null;
