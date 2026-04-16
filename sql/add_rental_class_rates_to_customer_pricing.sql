-- Per-customer overrides for rental class rates (TrackAbout-style).
-- Run in Supabase SQL editor or via migration tooling.

ALTER TABLE customer_pricing
  ADD COLUMN IF NOT EXISTS rental_class_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN customer_pricing.rental_class_rates IS
  'Map of rental_class_id -> { daily, weekly, monthly } numeric overrides; null/omit field = use org catalog default';
