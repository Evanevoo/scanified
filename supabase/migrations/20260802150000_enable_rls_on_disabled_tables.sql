-- Phase 0 follow-up: enable RLS on tables flagged by the Supabase advisor
-- (see supabase/schema/rls_disabled_tables_TODO.sql for the original list).
--
-- This migration only covers the tables where the safe action is clear.
-- Three tables (cylinders, gas_types, assets) are deliberately excluded --
-- see the note at the bottom. Do not add them here without investigating
-- first; this app has a documented history of RLS incidents (recursive
-- policies, missing INSERT policies) that broke production login and
-- mobile order submission.

-- ============================================================
-- Group 1: no references found anywhere in web/mobile source.
-- Enabling RLS with zero policies makes them deny-all to the
-- anon/authenticated roles (the only roles that were exposed --
-- server-side code using the service role key bypasses RLS
-- entirely and is unaffected). Since nothing in the app queries
-- these client-side, this should be a no-op for real usage.
-- ============================================================

ALTER TABLE public.cylinder_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquid_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cylinder_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_customer_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Group 2: actively used by the app AND already carry
-- organization_id, so they follow the same tenant-isolation
-- pattern already established elsewhere (auth_user_organization_id()
-- helper, defined in supabase/legacy-sql/platform_owner_rls.sql,
-- avoids the RLS-recursion bug from the earlier emergency fix).
-- ============================================================

ALTER TABLE public.organization_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_backups_tenant_all"
  ON public.organization_backups
  FOR ALL
  TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_schedules_tenant_all"
  ON public.backup_schedules
  FOR ALL
  TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());

ALTER TABLE public.cylinder_fills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cylinder_fills_tenant_all"
  ON public.cylinder_fills
  FOR ALL
  TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());

ALTER TABLE public.organization_rental_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_rental_classes_tenant_all"
  ON public.organization_rental_classes
  FOR ALL
  TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());

-- customer_departments: has organization_id but no references found in
-- app source (may be an unreleased/upcoming feature). Applying the same
-- tenant policy is still safe/correct either way.
ALTER TABLE public.customer_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_departments_tenant_all"
  ON public.customer_departments
  FOR ALL
  TO authenticated
  USING (organization_id = public.auth_user_organization_id())
  WITH CHECK (organization_id = public.auth_user_organization_id());

-- ============================================================
-- Deliberately NOT included -- needs investigation before enabling:
--
-- * cylinders   -- read client-side from ImportSalesReceipts.jsx,
--                  ReviewScreen.jsx, and a management report, but has
--                  NO organization_id column. If it holds real per-tenant
--                  data, RLS is currently the only thing standing between
--                  this and a cross-organization data leak -- but enabling
--                  it blind will break those 3 screens without a working
--                  policy. Needs to be understood before touching.
-- * gas_types    -- read client-side from both web and mobile as a shared
--                  dropdown/reference list, no organization_id. Looks like
--                  it's meant to be a global lookup table (gas types are
--                  universal, not per-tenant), so the fix is likely a
--                  public-read/no-client-write policy rather than tenant
--                  isolation -- but confirm before applying.
-- * assets       -- read once, from OwnerPortal/Analytics.jsx (platform-owner
--                  surface only). Needs a policy scoped to
--                  public.is_platform_owner(), not tenant isolation.
-- ============================================================
