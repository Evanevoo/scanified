-- Test database connection and RLS policies
-- Run this script to verify that the bottles table is accessible

-- Step 1: Check if RLS is enabled on bottles table
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'bottles' 
AND schemaname = 'public';

-- Step 2: Check existing policies on bottles table
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'bottles'
AND schemaname = 'public';

-- Step 3: Check if bottles table has organization_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'bottles' 
AND column_name = 'organization_id'
AND table_schema = 'public';

-- Step 4: Check if customers table has organization_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'organization_id'
AND table_schema = 'public';

-- Step 5: Check if profiles table has organization_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'organization_id'
AND table_schema = 'public';

-- Step 6: Count total bottles (this should work if RLS is properly configured)
SELECT COUNT(*) as total_bottles FROM bottles;

-- Step 7: Count bottles by organization (if any exist)
SELECT 
  organization_id,
  COUNT(*) as bottle_count
FROM bottles 
GROUP BY organization_id
ORDER BY bottle_count DESC;

-- Step 8: Check if there are any profiles with organization_id
SELECT 
  COUNT(*) as profiles_with_org,
  COUNT(DISTINCT organization_id) as unique_organizations
FROM profiles 
WHERE organization_id IS NOT NULL;

SELECT 'Database connection and structure check completed!' as result;
