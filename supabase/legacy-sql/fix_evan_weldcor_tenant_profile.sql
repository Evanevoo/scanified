-- Fix evan@weldcor.ca for mobile + tenant app (WeldCor subscriber, NOT Scanified platform owner)
-- Run in Supabase SQL Editor.
--
-- Symptom: mobile app shows "No Organization" after login.
-- Common cause: profile.role = 'owner' (platform) instead of 'orgowner' (tenant),
-- or organization_id is NULL / points to a deleted org.

-- 1) Diagnose
SELECT
  u.id AS user_id,
  u.email AS auth_email,
  p.email AS profile_email,
  p.role,
  p.organization_id,
  o.name AS organization_name,
  o.deleted_at AS org_deleted_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE LOWER(u.email) = 'evan@weldcor.ca';

-- 2) Resolve WeldCor organization (adjust ILIKE if your org name differs)
SELECT id, name, slug, deleted_at
FROM public.organizations
WHERE deleted_at IS NULL
  AND (name ILIKE '%weldcor%' OR slug ILIKE '%weldcor%')
ORDER BY created_at DESC;

-- 3) Link Evan as tenant account owner (orgowner) — NOT platform owner
UPDATE public.profiles p
SET
  email = u.email,
  role = 'orgowner',
  role_id = NULL,
  organization_id = (
    SELECT o.id
    FROM public.organizations o
    WHERE o.deleted_at IS NULL
      AND (o.name ILIKE '%weldcor%' OR o.slug ILIKE '%weldcor%')
    ORDER BY o.created_at DESC
    LIMIT 1
  )
FROM auth.users u
WHERE p.id = u.id
  AND LOWER(u.email) = 'evan@weldcor.ca';

-- 4) Verify (organization_id must be non-null; role must be orgowner)
SELECT
  u.email,
  p.role,
  p.organization_id,
  o.name AS organization_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE LOWER(u.email) = 'evan@weldcor.ca';
