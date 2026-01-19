-- ⚠️ SAFER VERSION: Delete with organization filtering
-- This version only deletes customers and bottles for a specific organization
-- Replace 'YOUR_ORGANIZATION_ID' with your actual organization ID

-- Step 1: Show what will be deleted (REVIEW THIS FIRST!)
SELECT 
  'Bottles to delete' as type,
  COUNT(*) as count
FROM bottles
WHERE organization_id = 'YOUR_ORGANIZATION_ID'::uuid
UNION ALL
SELECT 
  'Customers to delete' as type,
  COUNT(*) as count
FROM customers
WHERE organization_id = 'YOUR_ORGANIZATION_ID'::uuid;

-- Step 2: Delete bottles for specific organization
-- DELETE FROM bottles WHERE organization_id = 'YOUR_ORGANIZATION_ID'::uuid;

-- Step 3: Delete customers for specific organization
-- DELETE FROM customers WHERE organization_id = 'YOUR_ORGANIZATION_ID'::uuid;

-- To use this:
-- 1. Run Step 1 first to see what will be deleted
-- 2. Replace 'YOUR_ORGANIZATION_ID' with your actual organization UUID
-- 3. Uncomment Step 2 and Step 3 when ready
-- 4. Run the DELETE statements
