-- Restore evan@weldcor.ca's profile (was overwritten when invite was accepted for wrong account)
-- Run in Supabase: SQL Editor → New query → paste and Run
-- Project: https://supabase.com/dashboard/project/jtfucttzaswmqqhmmhfb

-- 1) See current state (profile may show invited user's email)
SELECT p.id, p.email AS profile_email, p.role, p.role_id, p.full_name,
       u.email AS auth_email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE LOWER(u.email) = 'evan@weldcor.ca';

-- 2) Restore profile: tenant account owner for WeldCor (NOT Scanified platform owner)
--    Platform owner = role 'owner' + organization_id NULL → web /owner-portal only
--    Evan = role 'orgowner' + WeldCor organization_id → mobile + tenant app
UPDATE profiles p
SET
  email = u.email,
  role = 'orgowner',
  role_id = NULL,
  organization_id = COALESCE(
    p.organization_id,
    (
      SELECT o.id
      FROM organizations o
      WHERE o.deleted_at IS NULL
        AND (o.name ILIKE '%weldcor%' OR o.slug ILIKE '%weldcor%')
      ORDER BY o.created_at DESC
      LIMIT 1
    )
  )
FROM auth.users u
WHERE p.id = u.id
  AND LOWER(u.email) = 'evan@weldcor.ca';

-- 3) Verify
SELECT p.id, p.email, p.role, p.role_id, p.full_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE LOWER(u.email) = 'evan@weldcor.ca';
