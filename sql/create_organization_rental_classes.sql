-- Organization-wide rental class definitions (match assets by product_code / category).
-- Run in Supabase SQL editor. RLS: enable and add policies for your org model if needed.

CREATE TABLE IF NOT EXISTS organization_rental_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  group_name text NOT NULL DEFAULT 'From inventory',
  class_name text NOT NULL,
  rental_method text NOT NULL DEFAULT 'monthly',
  default_daily numeric,
  default_weekly numeric,
  default_monthly numeric,
  match_product_code text,
  match_category text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_rental_classes_org
  ON organization_rental_classes (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_rental_classes_product
  ON organization_rental_classes (organization_id, lower(trim(match_product_code)))
  WHERE match_product_code IS NOT NULL AND trim(match_product_code) <> '';

COMMENT ON TABLE organization_rental_classes IS
  'Default rental rates per class for an org; customer_pricing.rental_class_rates overrides by class id (uuid or legacy key)';
