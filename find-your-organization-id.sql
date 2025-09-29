-- STEP 1: Find your actual organization ID
-- Run this first to get your real organization ID

SELECT 
  'FIND YOUR ORGANIZATION' as step,
  id as organization_id,
  name as organization_name,
  created_at,
  (SELECT COUNT(*) FROM customers WHERE organization_id = o.id) as customer_count,
  (SELECT COUNT(*) FROM bottles WHERE organization_id = o.id) as bottle_count,
  (SELECT COUNT(*) FROM profiles WHERE organization_id = o.id) as user_count
FROM organizations o
ORDER BY created_at DESC;

-- STEP 2: Once you have your organization ID, replace it in the queries below
-- Copy your organization ID from the results above and replace 'REPLACE_WITH_YOUR_ORG_ID'

-- Check your test data (REPLACE THE UUID BELOW)
-- SELECT 
--   'YOUR TEST DATA' as info,
--   COUNT(*) as customer_count
-- FROM customers 
-- WHERE organization_id = 'REPLACE_WITH_YOUR_ORG_ID';

-- Clean your test data (REPLACE THE UUID BELOW)
-- WARNING: This will delete ALL customers for the specified organization
-- DELETE FROM customers 
-- WHERE organization_id = 'REPLACE_WITH_YOUR_ORG_ID';

-- Example of what your organization ID should look like:
-- 'f98daa10-2884-49b9-a6a6-9725e27e7696'
