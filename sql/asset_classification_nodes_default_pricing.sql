-- Optional default rental rates per classification node (e.g. Industrial Cylinders vs Bulkpacks).
-- Used when a bottle/product has no positive rate in asset_type_pricing for that SKU.
-- Run in Supabase SQL Editor after sql/asset_classification_nodes.sql.
-- Customer-specific overrides still win; see pricingResolution.resolveEffectiveUnitPrice.

ALTER TABLE public.asset_classification_nodes
  ADD COLUMN IF NOT EXISTS default_monthly_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS default_yearly_price numeric(12,2);

COMMENT ON COLUMN public.asset_classification_nodes.default_monthly_price IS
  'Org default monthly rental per unit for bottles under this node when no asset_type_pricing row applies.';
COMMENT ON COLUMN public.asset_classification_nodes.default_yearly_price IS
  'Org default yearly rental per unit for bottles under this node when no asset_type_pricing row applies.';
