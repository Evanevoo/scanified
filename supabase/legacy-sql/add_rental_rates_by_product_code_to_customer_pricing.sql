-- Per-customer overrides for rental rates keyed by inventory product code (JSON on customer_pricing).
--
-- HOW TO APPLY (Supabase)
-- 1. Dashboard → SQL Editor → New query → paste this file → Run.
-- 2. Dashboard → Settings → API → "Reload schema" (or wait ~1 min) so PostgREST
--    picks up the new column; otherwise updates may fail until the schema cache refreshes.
-- 3. In the app: Customer → Rental → save product code rates again so data syncs to the DB
--    (not only localStorage).
--
-- VERIFY:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'customer_pricing'
--     AND column_name = 'rental_rates_by_product_code';

ALTER TABLE public.customer_pricing
  ADD COLUMN IF NOT EXISTS rental_rates_by_product_code jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.customer_pricing.rental_rates_by_product_code IS
  'Map of product_code -> { monthly, yearly? } for per-SKU rental overrides; empty object = none';
