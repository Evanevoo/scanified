-- Clean up script for fresh start
-- Run this to delete all bottles and customers before re-uploading

-- 1. Delete all bottles for your organization
DELETE FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- 2. Delete all customers for your organization  
DELETE FROM customers 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- 3. Verify cleanup
SELECT 
  'Cleanup Verification' as info,
  (SELECT COUNT(*) FROM bottles WHERE organization_id = (SELECT id FROM organizations LIMIT 1)) as remaining_bottles,
  (SELECT COUNT(*) FROM customers WHERE organization_id = (SELECT id FROM organizations LIMIT 1)) as remaining_customers;
