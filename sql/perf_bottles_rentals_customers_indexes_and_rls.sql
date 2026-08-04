-- ============================================================================
-- PERFORMANCE FIX: missing organization_id indexes + uncached RLS subqueries
-- on bottles / customers / rentals / locations / bottle_scans / imported_invoices
-- ============================================================================
-- Context: sql/fix_rls_auth_emergency.sql already introduced
-- public.auth_user_organization_id() (STABLE SECURITY DEFINER) specifically because
-- inline "organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())"
-- subqueries in RLS policies caused slow evaluation on profiles/organizations. That fix
-- was applied to profiles/organizations only; supabase-rls-policies.sql still defines the
-- same uncached-subquery pattern on bottles/customers/rentals/locations/bottle_scans/
-- imported_invoices. Combined with no plain organization_id index on bottles/rentals/
-- customers anywhere in this repo's tracked SQL, this is a likely cause of multi-second
-- REST latency on those tables at scale.
--
-- Run this whole script in the Supabase SQL Editor. It is idempotent (IF NOT EXISTS /
-- DROP POLICY IF EXISTS) and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helper functions (already created by sql/fix_rls_auth_emergency.sql or
--    sql/platform_owner_rls.sql if you've run either — CREATE OR REPLACE is safe).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_organization_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'owner'
      AND p.organization_id IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated;

-- ----------------------------------------------------------------------------
-- 1) Indexes — no plain organization_id index exists on these tables today.
--    Column layouts vary across org databases (this repo has no checked-in
--    schema for these tables), so every index is created through a helper
--    that first confirms the table AND every referenced column actually
--    exist — skipping (with a NOTICE) instead of erroring if not.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.safe_create_index(
  p_index_name text,
  p_table_name text,
  p_columns text[]
) RETURNS void AS $fn$
DECLARE
  missing text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RAISE NOTICE 'Skipping %: table public.% does not exist', p_index_name, p_table_name;
    RETURN;
  END IF;

  SELECT col INTO missing
  FROM unnest(p_columns) AS col
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = col
  )
  LIMIT 1;

  IF missing IS NOT NULL THEN
    RAISE NOTICE 'Skipping %: public.%.% does not exist', p_index_name, p_table_name, missing;
    RETURN;
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
    p_index_name, p_table_name, array_to_string(p_columns, ', ')
  );
END;
$fn$ LANGUAGE plpgsql;

SELECT pg_temp.safe_create_index('idx_bottles_organization_id', 'bottles', ARRAY['organization_id']);
SELECT pg_temp.safe_create_index('idx_bottles_org_barcode', 'bottles', ARRAY['organization_id', 'barcode_number']);

SELECT pg_temp.safe_create_index('idx_rentals_organization_id', 'rentals', ARRAY['organization_id']);
SELECT pg_temp.safe_create_index('idx_rentals_org_open', 'rentals', ARRAY['organization_id', 'rental_end_date']);
-- Column name for the rentals<->order link varies (order_number vs rental_order_number
-- vs none at all) — try the two names actually seen in the app code; harmless no-ops if absent.
SELECT pg_temp.safe_create_index('idx_rentals_org_order_number', 'rentals', ARRAY['organization_id', 'order_number']);
SELECT pg_temp.safe_create_index('idx_rentals_org_rental_order_number', 'rentals', ARRAY['organization_id', 'rental_order_number']);

SELECT pg_temp.safe_create_index('idx_customers_organization_id', 'customers', ARRAY['organization_id']);

SELECT pg_temp.safe_create_index('idx_bottle_scans_organization_id', 'bottle_scans', ARRAY['organization_id']);
SELECT pg_temp.safe_create_index('idx_bottle_scans_org_order_number', 'bottle_scans', ARRAY['organization_id', 'order_number']);

SELECT pg_temp.safe_create_index('idx_imported_invoices_organization_id', 'imported_invoices', ARRAY['organization_id']);
SELECT pg_temp.safe_create_index('idx_locations_organization_id', 'locations', ARRAY['organization_id']);
SELECT pg_temp.safe_create_index('idx_customer_pricing_organization_id', 'customer_pricing', ARRAY['organization_id']);

DROP FUNCTION pg_temp.safe_create_index(text, text, text[]);

-- ----------------------------------------------------------------------------
-- 2) RLS — replace the inline "(SELECT organization_id FROM profiles WHERE id = auth.uid())"
--    subquery with the cached auth_user_organization_id() helper, same pattern already
--    proven on profiles/organizations. Policy names below match supabase-rls-policies.sql
--    exactly so DROP POLICY IF EXISTS cleanly replaces what's already live.
-- ----------------------------------------------------------------------------
ALTER TABLE public.bottles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their organization's bottles" ON public.bottles;
DROP POLICY IF EXISTS "bottles_tenant_all" ON public.bottles;
DROP POLICY IF EXISTS "bottles_platform_owner_all" ON public.bottles;
CREATE POLICY "bottles_tenant_all"
  ON public.bottles FOR ALL TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());
CREATE POLICY "bottles_platform_owner_all"
  ON public.bottles FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their organization's customers" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_all" ON public.customers;
DROP POLICY IF EXISTS "customers_platform_owner_all" ON public.customers;
CREATE POLICY "customers_tenant_all"
  ON public.customers FOR ALL TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());
CREATE POLICY "customers_platform_owner_all"
  ON public.customers FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their organization's rentals" ON public.rentals;
DROP POLICY IF EXISTS "rentals_tenant_all" ON public.rentals;
DROP POLICY IF EXISTS "rentals_platform_owner_all" ON public.rentals;
CREATE POLICY "rentals_tenant_all"
  ON public.rentals FOR ALL TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());
CREATE POLICY "rentals_platform_owner_all"
  ON public.rentals FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    EXECUTE 'ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can only access their organization''s locations" ON public.locations';
    EXECUTE 'DROP POLICY IF EXISTS "locations_tenant_all" ON public.locations';
    EXECUTE $p$
      CREATE POLICY "locations_tenant_all"
        ON public.locations FOR ALL TO authenticated
        USING (organization_id = public.auth_user_organization_id())
        WITH CHECK (organization_id = public.auth_user_organization_id())
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bottle_scans') THEN
    EXECUTE 'ALTER TABLE public.bottle_scans ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can only access their organization''s scans" ON public.bottle_scans';
    EXECUTE 'DROP POLICY IF EXISTS "bottle_scans_tenant_all" ON public.bottle_scans';
    EXECUTE $p$
      CREATE POLICY "bottle_scans_tenant_all"
        ON public.bottle_scans FOR ALL TO authenticated
        USING (organization_id = public.auth_user_organization_id())
        WITH CHECK (organization_id = public.auth_user_organization_id())
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'imported_invoices') THEN
    EXECUTE 'ALTER TABLE public.imported_invoices ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can only access their organization''s invoices" ON public.imported_invoices';
    EXECUTE 'DROP POLICY IF EXISTS "imported_invoices_tenant_all" ON public.imported_invoices';
    EXECUTE $p$
      CREATE POLICY "imported_invoices_tenant_all"
        ON public.imported_invoices FOR ALL TO authenticated
        USING (organization_id = public.auth_user_organization_id())
        WITH CHECK (organization_id = public.auth_user_organization_id())
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_pricing') THEN
    EXECUTE 'ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "customer_pricing_tenant_all" ON public.customer_pricing';
    EXECUTE $p$
      CREATE POLICY "customer_pricing_tenant_all"
        ON public.customer_pricing FOR ALL TO authenticated
        USING (organization_id = public.auth_user_organization_id())
        WITH CHECK (organization_id = public.auth_user_organization_id())
    $p$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Verify — list every policy left on these tables and confirm the new
--    indexes exist. If step 2 skipped a table's policy because its live name
--    didn't match what's hard-coded above, this query will surface it so you
--    can drop the stale one manually (its USING clause is what to check).
-- ----------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bottles', 'customers', 'rentals', 'locations', 'bottle_scans', 'imported_invoices', 'customer_pricing')
ORDER BY tablename, policyname;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('bottles', 'customers', 'rentals', 'locations', 'bottle_scans', 'imported_invoices', 'customer_pricing')
ORDER BY tablename, indexname;

-- ----------------------------------------------------------------------------
-- 4) Confirm the fix worked — run EXPLAIN ANALYZE as an authenticated request
--    (via the app or supabase-js with a real session) against bottles/rentals
--    for your organization; the plan should show an Index Scan using
--    idx_bottles_organization_id / idx_rentals_organization_id, not a Seq Scan.
-- ============================================================================
