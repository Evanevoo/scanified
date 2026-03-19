-- Restore owner role for evan@weldcor.ca
-- Run in Supabase: SQL Editor → New query → paste and Run
-- Project: https://supabase.com/dashboard/project/jtfucttzaswmqqhmmhfb

-- 1) Check current row (run this first to confirm the right profile)
SELECT id, email, role, role_id, organization_id
FROM profiles
WHERE LOWER(TRIM(email)) = 'evan@weldcor.ca';

-- 2) Fix: set role to text 'owner' and clear role_id so the app shows Owner (not Manager)
UPDATE profiles
SET role = 'owner',
    role_id = NULL
WHERE LOWER(TRIM(email)) = 'evan@weldcor.ca';

-- 3) Verify (run after the UPDATE)
SELECT id, email, role, role_id
FROM profiles
WHERE LOWER(TRIM(email)) = 'evan@weldcor.ca';
