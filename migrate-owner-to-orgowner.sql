-- Migrate tenant account holders off role 'owner' → 'orgowner'
-- Run in Supabase: SQL Editor → New query → paste and Run
--
-- These are NOT the same role:
--   owner    = YOU — owner of Scanified (SaaS platform). organization_id MUST be NULL.
--              Uses /owner-portal to manage subscribing companies.
--   orgowner = Primary subscriber of a tenant org (e.g. WeldCor Supplies).
--              Has organization_id set; uses /home like an admin for that company only.
--
-- This script fixes profiles that were wrongly given role 'owner' while belonging to a tenant.
-- It does NOT change your Scanified platform account (owner + NULL organization_id).

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
