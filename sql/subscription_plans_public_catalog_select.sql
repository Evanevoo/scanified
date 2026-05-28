-- Public marketing site: read active SaaS catalog plans on /landing#pricing
-- Run in Supabase SQL Editor after platform_owner_rls.sql (or standalone).

DROP POLICY IF EXISTS "subscription_plans_public_catalog_select" ON public.subscription_plans;

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
