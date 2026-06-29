# Sick Bed

People list themselves as unwell by suburb with a selfie. Others send a grocery-based gift bundle with a personal note.

## Architecture

Single Node/Express service (`sickbed-web`) — serves the frontend, handles listings + orders via Supabase. The selfie is stored and shown as-is (no background removal or compositing).

## One-time setup

### 1. Supabase

Create a project at supabase.com, then run `supabase_schema.sql` in the SQL editor (Project → SQL Editor → New query → paste → Run) for a fresh setup.

If you already have a `listings` table from an earlier version, run `supabase_migration_001.sql` instead — it adds the new verification fields (full name, nickname, school, address, illness) without losing existing data.

Grab from Project Settings → API:
- `Project URL` → `SUPABASE_URL`
- `service_role` key (NOT the anon key) → `SUPABASE_SERVICE_KEY`

### 2. Render

Push this repo to GitHub, then in Render:

- **New → Web Service** → point at the repo
- Build Command: `npm install`
- Start Command: `npm start`
- Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

**Never commit these to GitHub** — they only go in the Render dashboard's environment variable settings.

### 2. Stripe

You need a Stripe account with **live mode** enabled (real payouts require identity/business verification in the Stripe dashboard if you haven't done that yet).

Grab from Stripe Dashboard → Developers → API keys (make sure you're toggled to **live mode**, not test):
- Publishable key (`pk_live_...`) → `STRIPE_PUBLISHABLE_KEY`
- Secret key (`sk_live_...`) → `STRIPE_SECRET_KEY`

### 3. Render

Push this repo to GitHub, then in Render:

- **New → Web Service** → point at the repo
- Build Command: `npm install`
- Start Command: `npm start`
- Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

**Never commit these to GitHub** — they only go in the Render dashboard's environment variable settings.

### Notes

- Listing requires: full name, nickname, school, suburb, address, and a live selfie. Illness is optional.
- The public board only ever shows nickname, suburb, photo, and illness (if given) — full name, school, and address are stored for verification/delivery only, never displayed.
- Payments are live — every charge through the gift page is a real card transaction via Stripe.
- A listing with no wishlist items shows no gift form at all — there's nothing to pay for, so no order can be placed for them.
- v1 fulfilment is manual: paid orders land in `/sickbed-admin.html` for you to action by hand.
