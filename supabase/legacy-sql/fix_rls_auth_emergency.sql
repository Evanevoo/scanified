-- EMERGENCY: restore login + tenant organization loading (web + mobile)
-- Run entire script in Supabase SQL Editor.
--
-- Problem: policies that subquery profiles from profiles/organizations can cause
-- "infinite recursion" or empty results — users cannot load profile/org after sign-in.

-- ---------------------------------------------------------------------------
-- 1) Helper: current user's organization (bypasses RLS safely)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2) profiles — own row + peers in same org + platform owner
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_platform_owner_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_peers_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_tenant_peers_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.auth_user_organization_id()
  );

CREATE POLICY "profiles_platform_owner_all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) organizations — platform owner + tenant members (no profiles subquery)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "organizations_platform_owner_all" ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;

CREATE POLICY "organizations_platform_owner_all"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY "organizations_tenant_select"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.auth_user_organization_id());

CREATE POLICY "organizations_tenant_update"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.auth_user_organization_id())
  WITH CHECK (id = public.auth_user_organization_id());

-- ---------------------------------------------------------------------------
-- 4) Verify Evan + a quick policy count
-- ---------------------------------------------------------------------------
SELECT p.email, p.role, p.organization_id, o.name
FROM public.profiles p
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE LOWER(p.email) = 'evan@weldcor.ca';

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'organizations')
ORDER BY tablename, policyname;
