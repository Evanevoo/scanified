-- ============================================================================
-- Platform owner RLS + tenant summary RPC (Scanified SaaS owner portal)
-- ============================================================================
-- Platform owner (Scanified): profiles.role = 'owner' AND organization_id IS NULL
-- Tenant subscriber (e.g. WeldCor): role 'orgowner' — NOT covered by is_platform_owner()
-- Run in Supabase SQL Editor after review.
-- ============================================================================

-- Helper: current user is Scanified platform owner (not org owner)
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

-- Batch tenant metrics for owner portal (avoids N+1 cross-tenant client queries)
CREATE OR REPLACE FUNCTION public.get_tenant_summaries(p_org_ids uuid[])
RETURNS TABLE (
  organization_id uuid,
  user_count bigint,
  customer_count bigint,
  bottle_count bigint,
  contact_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Access denied: platform owner only';
  END IF;

  IF p_org_ids IS NULL OR cardinality(p_org_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    (SELECT count(*)::bigint FROM public.profiles p WHERE p.organization_id = o.id),
    (SELECT count(*)::bigint FROM public.customers c WHERE c.organization_id = o.id),
    (SELECT count(*)::bigint FROM public.bottles b WHERE b.organization_id = o.id),
    COALESCE(
      (SELECT p.email FROM public.profiles p WHERE p.organization_id = o.id AND p.role = 'orgowner' ORDER BY p.created_at LIMIT 1),
      (SELECT p.email FROM public.profiles p WHERE p.organization_id = o.id AND p.role = 'admin' ORDER BY p.created_at LIMIT 1),
      (SELECT p.email FROM public.profiles p WHERE p.organization_id = o.id ORDER BY p.created_at NULLS LAST LIMIT 1),
      'No contact found'
    )::text
  FROM public.organizations o
  WHERE o.id = ANY (p_org_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_summaries(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_summaries(uuid[]) TO authenticated;

-- Avoid RLS infinite recursion: never subquery profiles inside profiles policies
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

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_platform" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_platform" ON public.organizations;
DROP POLICY IF EXISTS "organizations_platform_owner_all" ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant_update" ON public.organizations;

CREATE POLICY "organizations_platform_owner_all"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY "organizations_tenant_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (id = public.auth_user_organization_id());

CREATE POLICY "organizations_tenant_update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (id = public.auth_user_organization_id())
  WITH CHECK (id = public.auth_user_organization_id());

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_platform_owner_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_peers_select" ON public.profiles;

CREATE POLICY "profiles_platform_owner_all"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY "profiles_self_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_tenant_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.auth_user_organization_id()
  );

CREATE POLICY "profiles_self_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- subscription_plans (SaaS catalog + optional per-org plans)
-- ----------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_platform_owner_all" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_tenant_select" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_catalog_select" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_platform_catalog_select" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_public_catalog_select" ON public.subscription_plans;

CREATE POLICY "subscription_plans_platform_owner_all"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- Tenants: read global SaaS catalog (organization_id IS NULL) and their org plans
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "subscription_plans_tenant_select" ON public.subscription_plans';
  EXECUTE 'DROP POLICY IF EXISTS "subscription_plans_catalog_select" ON public.subscription_plans';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'organization_id'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "subscription_plans_tenant_select"
        ON public.subscription_plans
        FOR SELECT
        TO authenticated
        USING (
          organization_id IS NULL
          OR organization_id = public.auth_user_organization_id()
        )
    $p$;
  ELSE
    EXECUTE $p$
      CREATE POLICY "subscription_plans_catalog_select"
        ON public.subscription_plans
        FOR SELECT
        TO authenticated
        USING (true)
    $p$;
  END IF;
END $$;

-- Anonymous / logged-out visitors: marketing pricing on /landing#pricing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'organization_id'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "subscription_plans_public_catalog_select"
        ON public.subscription_plans
        FOR SELECT
        TO anon, authenticated
        USING (is_active = true AND organization_id IS NULL)
    $p$;
  ELSE
    EXECUTE $p$
      CREATE POLICY "subscription_plans_public_catalog_select"
        ON public.subscription_plans
        FOR SELECT
        TO anon, authenticated
        USING (is_active = true)
    $p$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- support_tickets (owner portal support center)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'support_tickets'
  ) THEN
    EXECUTE 'ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "support_tickets_platform_owner_all" ON public.support_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "support_tickets_tenant_all" ON public.support_tickets';

    EXECUTE $p$
      CREATE POLICY "support_tickets_platform_owner_all"
        ON public.support_tickets
        FOR ALL
        TO authenticated
        USING (public.is_platform_owner())
        WITH CHECK (public.is_platform_owner())
    $p$;

    EXECUTE $p$
      CREATE POLICY "support_tickets_tenant_all"
        ON public.support_tickets
        FOR ALL
        TO authenticated
        USING (
          organization_id = (
            SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
          )
        )
        WITH CHECK (
          organization_id = (
            SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
          )
        )
    $p$;
  END IF;
END $$;
