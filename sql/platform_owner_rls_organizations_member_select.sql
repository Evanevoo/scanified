-- Deprecated: use auth_user_organization_id() in fix_rls_auth_emergency.sql instead.
-- Kept for reference; organizations_member_select is redundant with organizations_tenant_select.

DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;
