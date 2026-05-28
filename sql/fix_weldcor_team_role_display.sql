-- WeldCor Supplies SK — normalize team profiles (role column showing UUIDs in User Management)
-- Run in Supabase SQL Editor.
--
-- Affected (typical): aaron@rpginc.ca, hayden@weldcor.ca, korbihn@weldcor.ca
--   profiles.role = '<uuid>' instead of 'admin' / 'user' / 'manager'
-- Jaslyn (admin) and Jackee (user) usually already use text roles.

-- 1) Diagnose listed users + role UUIDs
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.role_id,
  p.organization_id,
  o.name AS organization_name,
  r_by_role_id.name AS role_from_role_id,
  r_by_role_col.name AS role_from_role_column_uuid
FROM public.profiles p
LEFT JOIN public.organizations o ON o.id = p.organization_id
LEFT JOIN public.roles r_by_role_id ON r_by_role_id.id = p.role_id
LEFT JOIN public.roles r_by_role_col ON (
  p.role ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND r_by_role_col.id = p.role::uuid
)
WHERE LOWER(p.email) IN (
  'jaslyn@weldcor.ca',
  'jackee@weldcor.ca',
  'aaron@rpginc.ca',
  'hayden@weldcor.ca',
  'korbihn@weldcor.ca'
)
ORDER BY p.email;

SELECT id, name, organization_id
FROM public.roles
WHERE id IN (
  '9ad9c7b4-e587-4857-b111-45cab6eb1629'::uuid,
  '4395e653-080f-4c2d-a2c1-492245f19f80'::uuid
);

-- 2) Normalize: move UUID from profiles.role → role_id, set role to lowercase name from roles table
UPDATE public.profiles p
SET
  role_id = COALESCE(p.role_id, p.role::uuid),
  role = LOWER(TRIM(r.name))
FROM public.roles r
WHERE p.role ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND r.id = p.role::uuid
  AND p.organization_id IN (
    SELECT o.id
    FROM public.organizations o
    WHERE o.deleted_at IS NULL
      AND (o.name ILIKE '%weldcor%' OR o.slug ILIKE '%weldcor%')
  );

-- 3) Ensure all five are on WeldCor (skip if already correct)
UPDATE public.profiles p
SET organization_id = (
  SELECT o.id
  FROM public.organizations o
  WHERE o.deleted_at IS NULL
    AND (o.name ILIKE '%weldcor%' OR o.slug ILIKE '%weldcor%')
  ORDER BY o.created_at DESC
  LIMIT 1
)
WHERE LOWER(p.email) IN (
  'jaslyn@weldcor.ca',
  'jackee@weldcor.ca',
  'aaron@rpginc.ca',
  'hayden@weldcor.ca',
  'korbihn@weldcor.ca'
)
AND (
  p.organization_id IS NULL
  OR p.organization_id NOT IN (
    SELECT o.id FROM public.organizations o
    WHERE o.deleted_at IS NULL
      AND (o.name ILIKE '%weldcor%' OR o.slug ILIKE '%weldcor%')
  )
);

-- 4) Verify
SELECT
  p.email,
  p.full_name,
  p.role,
  p.role_id,
  r.name AS rbac_role_name,
  o.name AS organization_name
FROM public.profiles p
LEFT JOIN public.roles r ON r.id = p.role_id
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE LOWER(p.email) IN (
  'jaslyn@weldcor.ca',
  'jackee@weldcor.ca',
  'aaron@rpginc.ca',
  'hayden@weldcor.ca',
  'korbihn@weldcor.ca'
)
ORDER BY p.email;
