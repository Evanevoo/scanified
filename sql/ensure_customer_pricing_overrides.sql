-- Table used for per-customer SKU pricing rows and as a fallback when
-- customer_pricing.rental_rates_by_product_code is missing (see CustomerDetail save flow).
--
-- Run in Supabase SQL Editor if you see errors like:
--   relation "customer_pricing_overrides" does not exist
--
-- After creating, reload the schema cache (Settings → API) if inserts still fail.

CREATE TABLE IF NOT EXISTS public.customer_pricing_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  product_code text,
  custom_monthly_price numeric(12,2),
  custom_yearly_price numeric(12,2),
  discount_percent numeric(5,2) DEFAULT 0,
  fixed_rate_override numeric(12,2),
  effective_date date,
  expiry_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cust_pricing_overrides_org
  ON public.customer_pricing_overrides(organization_id);

CREATE INDEX IF NOT EXISTS idx_cust_pricing_overrides_cust
  ON public.customer_pricing_overrides(organization_id, customer_id);
