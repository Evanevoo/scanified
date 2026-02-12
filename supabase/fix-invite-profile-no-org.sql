-- Fix a user who accepted an invite but profile has no organization_id
-- (e.g. they saw "Failed to create profile" but profile exists without org)
--
-- INSTRUCTIONS:
-- 1. Replace 'USER_EMAIL_HERE' with the actual user email (e.g. 'john@example.com').
-- 2. Run this in Supabase Dashboard → SQL Editor.
-- 3. If you have multiple pending invites for that email, the first matching invite is used.
--    To target a specific organization, add: AND organization_id = 'YOUR_ORG_UUID'

-- Step 1: Attach the profile to the organization and set role from the pending invite
UPDATE profiles p
SET
  organization_id = oi.organization_id,
  role = oi.role,
  full_name = COALESCE(NULLIF(TRIM(p.full_name), ''), p.full_name)
FROM organization_invites oi
WHERE p.email = oi.email
  AND p.email = 'USER_EMAIL_HERE'
  AND oi.accepted_at IS NULL
  AND (oi.expires_at IS NULL OR oi.expires_at > NOW());

-- Step 2: Mark the invite as accepted so it can't be reused
UPDATE organization_invites
SET accepted_at = NOW()
WHERE email = 'USER_EMAIL_HERE'
  AND accepted_at IS NULL;

-- Step 3: Verify – run this after the updates to confirm (optional)
-- SELECT id, email, full_name, organization_id, role FROM profiles WHERE email = 'USER_EMAIL_HERE';


-- =============================================================================
-- IF YOU NEED TO DELETE THE USER INSTEAD (so they can be re-invited)
-- =============================================================================
-- Supabase Auth does not allow deleting a user if you only use the Table Editor.
-- You must delete in this order:
--
-- 1. Delete the profile first (removes the row that references auth.users):
--
--    DELETE FROM profiles WHERE email = 'USER_EMAIL_HERE';
--
-- 2. Then delete the auth user:
--    - Go to Authentication → Users in Supabase Dashboard, find the user, click ⋮ → Delete user
--    - Or use the Auth API / Admin API to delete the user by ID.
--
-- If "Delete user" in the Dashboard fails, it may be due to RLS or triggers.
-- Run the DELETE FROM profiles above first, then try deleting the user again.
-- =============================================================================
