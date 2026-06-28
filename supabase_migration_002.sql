-- Sick Bed — migration 002: add wishlist column to listings
-- Run this in the Supabase SQL editor.

alter table listings add column if not exists wishlist jsonb not null default '[]';
