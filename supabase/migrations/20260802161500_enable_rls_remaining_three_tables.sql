-- Follow-up to 20260802150000_enable_rls_on_disabled_tables.sql: the 3 tables that
-- were deliberately excluded from that migration pending investigation. Now
-- investigated -- do NOT apply without reading the reasoning below, but this is
-- believed safe based on actual usage in the app.

-- ============================================================
-- cylinders -- no organization_id column, so real tenant-isolation RLS isn't
-- possible without a schema change. Usage: ReviewScreen.jsx (confirmed dead --
-- not imported or routed anywhere) and SupabaseOrders.jsx (a real but obscure,
-- low-traffic management report at /reports/supabase-orders), which only reads
-- product_code/type/description -- no PII, no pricing, no customer data.
-- Deny-all (RLS on, zero policies) makes the report's cylinders query return
-- empty instead of exposing whatever's in this table across orgs -- a strictly
-- safer failure mode for a page that already isn't reliably tenant-scoped
-- elsewhere in the same query set. Nothing else in the app reads this table.
-- ============================================================
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- gas_types -- shared/global reference table (gas types like Oxygen, Nitrogen,
-- CO2 are universal, not per-tenant -- confirmed no organization_id column).
-- Read client-side from both web and mobile as a dropdown/lookup source
-- (QuickAdd.jsx, AssetDetail.jsx, ImportApprovals.jsx, both mobile apps'
-- Add/EditCylinderScreen). Public read is correct; write access should stay
-- restricted to the service role (import/admin tooling), not exposed to
-- anon/authenticated clients who could otherwise vandalize this shared list.
-- ============================================================
ALTER TABLE public.gas_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gas_types_public_read"
  ON public.gas_types
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- assets -- read once, from OwnerPortal/Analytics.jsx, which is already gated
-- behind OwnerProtectedRoute in the app UI. Scoping the RLS policy to platform
-- owners (rather than tenant isolation, which doesn't apply here) closes the
-- direct-API gap: without this, any authenticated user could hit the REST
-- endpoint directly and bypass the app's route guard.
-- ============================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_platform_owner_all"
  ON public.assets
  FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());
