-- ORGANIZATION-SPECIFIC CUSTOMER DELETION
-- Use this to delete customers for a specific organization only
-- Replace 'YOUR_ORGANIZATION_ID' with the actual organization ID

-- 1. First, check what customers exist for your organization
-- Replace 'YOUR_ORGANIZATION_ID' with your actual organization ID
SELECT 
  'CUSTOMERS FOR YOUR ORGANIZATION' as info,
  COUNT(*) as total_customers,
  MIN(created_at) as oldest_customer,
  MAX(created_at) as newest_customer
FROM customers 
WHERE organization_id = 'YOUR_ORGANIZATION_ID';

-- 2. Show sample customers for your organization
SELECT 
  'SAMPLE CUSTOMERS' as info,
  name,
  "CustomerListID",
  created_at,
  id
FROM customers 
WHERE organization_id = 'YOUR_ORGANIZATION_ID'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for bottles assigned to customers in your organization
SELECT 
  'BOTTLES ASSIGNED TO CUSTOMERS' as info,
  COUNT(*) as total_bottles,
  COUNT(DISTINCT assigned_customer) as customers_with_bottles
FROM bottles b
JOIN customers c ON b.assigned_customer = c."CustomerListID"
WHERE c.organization_id = 'YOUR_ORGANIZATION_ID';

-- 4. SAFE DELETE: Delete customers for your organization only
-- WARNING: This will delete ALL customers for the specified organization
-- Uncomment and run ONLY after confirming the organization ID is correct

-- Step 4a: First unassign all bottles from customers in your organization
-- UPDATE bottles 
-- SET assigned_customer = NULL
-- WHERE assigned_customer IN (
--   SELECT "CustomerListID" 
--   FROM customers 
--   WHERE organization_id = 'YOUR_ORGANIZATION_ID'
-- );

-- Step 4b: Then delete all customers for your organization
-- DELETE FROM customers 
-- WHERE organization_id = 'YOUR_ORGANIZATION_ID';

-- 5. Verify deletion worked
-- SELECT 
--   'REMAINING CUSTOMERS' as info,
--   COUNT(*) as count
-- FROM customers 
-- WHERE organization_id = 'YOUR_ORGANIZATION_ID';

-- 6. Check remaining customers in other organizations
-- SELECT 
--   'OTHER ORGANIZATIONS' as info,
--   organization_id,
--   COUNT(*) as customer_count
-- FROM customers 
-- WHERE organization_id != 'YOUR_ORGANIZATION_ID'
-- GROUP BY organization_id
-- ORDER BY customer_count DESC;
