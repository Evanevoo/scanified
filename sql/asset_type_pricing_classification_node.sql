-- Link asset_type_pricing rows to Asset Classifications tree nodes (optional).
--
-- PREREQUISITES (run in this order):
--   1. public.asset_type_pricing must exist. If missing, run ONE of:
--        • sql/asset_type_pricing_table.sql — minimal (table + index + RLS only), or
--        • sql/subscription_system_migration.sql — section "4. asset_type_pricing" (full billing stack).
--   2. public.asset_classification_nodes — sql/asset_classification_nodes.sql
--
-- Then run this file in the Supabase SQL Editor.

DO $$
BEGIN
  IF to_regclass('public.asset_type_pricing') IS NULL THEN
    RAISE EXCEPTION
      'Table public.asset_type_pricing does not exist. Run sql/asset_type_pricing_table.sql first (or subscription_system_migration.sql section 4), then run this migration again.';
  END IF;
END $$;

ALTER TABLE public.asset_type_pricing
  ADD COLUMN IF NOT EXISTS classification_node_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_type_pricing_classification_node_id_fkey'
  ) THEN
    ALTER TABLE public.asset_type_pricing
      ADD CONSTRAINT asset_type_pricing_classification_node_id_fkey
      FOREIGN KEY (classification_node_id)
      REFERENCES public.asset_classification_nodes (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_type_pricing_org_classification
  ON public.asset_type_pricing (organization_id, classification_node_id)
  WHERE classification_node_id IS NOT NULL;

COMMENT ON COLUMN public.asset_type_pricing.classification_node_id IS
  'Optional link to asset_classification_nodes (e.g. leaf or folder) for filtering and reporting.';
