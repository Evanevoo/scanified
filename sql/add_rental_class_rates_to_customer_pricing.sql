-- Per-customer overrides for rental class rates (TrackAbout-style).
--
-- HOW TO APPLY (Supabase)
-- 1. Dashboard → SQL Editor → New query → paste this file → Run.
-- 2. Dashboard → Settings → Data API → click "Reload schema" (or wait ~1 min) so PostgREST
--    picks up the new column; otherwise PATCH may still fail until cache refreshes.
-- 3. In the app: Customer → save rental class rates again so data syncs to the DB (not
--    only localStorage).
--
-- VERIFY:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'customer_pricing' AND column_name = 'rental_class_rates';

ALTER TABLE customer_pricing
  ADD COLUMN IF NOT EXISTS rental_class_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN customer_pricing.rental_class_rates IS
  'Map of rental_class_id -> { daily, weekly, monthly } numeric overrides; null/omit field = use org catalog default';
