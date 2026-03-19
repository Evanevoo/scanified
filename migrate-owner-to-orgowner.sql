-- Migrate existing org owners from role 'owner' to 'orgowner'
-- Run in Supabase: SQL Editor → New query → paste and Run
--
-- Two roles after this:
--   owner   = Scanified platform owner (no organization, sees owner-portal)
--   orgowner = Organization owner (has organization, sees org dashboard like admin)
--
-- This updates everyone who has role 'owner' AND an organization to 'orgowner'.
-- The Scanified platform owner should have role 'owner' and organization_id = NULL (unchanged).

-- 1) Preview: who will be updated
SELECT id, email, role, organization_id
FROM profiles
WHERE role = 'owner' AND organization_id IS NOT NULL;

-- 2) Apply migration
UPDATE profiles
SET role = 'orgowner'
WHERE role = 'owner' AND organization_id IS NOT NULL;

-- 3) Verify: only platform owner(s) should have role 'owner' (and no org)
SELECT id, email, role, organization_id
FROM profiles
WHERE role IN ('owner', 'orgowner')
ORDER BY role, email;
