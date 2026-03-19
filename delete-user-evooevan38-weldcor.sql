-- Delete user evooevan38@weldcor.ca
-- Run in Supabase: SQL Editor → New query → paste and Run
-- Project: https://supabase.com/dashboard/project/jtfucttzaswmqqhmmhfb

-- 1) Get the user id (optional, for reference)
SELECT id, email FROM profiles WHERE LOWER(TRIM(email)) = 'evooevan38@weldcor.ca';

-- 2) Delete from profiles (removes from your app / org)
DELETE FROM profiles
WHERE LOWER(TRIM(email)) = 'evooevan38@weldcor.ca';

-- 3) Delete from Supabase Auth (removes login account)
DELETE FROM auth.users
WHERE LOWER(email) = 'evooevan38@weldcor.ca';

-- If step 3 fails with "permission denied", delete the user manually:
-- Dashboard → Authentication → Users → find evooevan38@weldcor.ca → Delete user
