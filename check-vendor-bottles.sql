-- Check if there are bottles assigned to VENDOR customers
-- This will show us the real business logic

-- 1. Check bottles with assigned_customer and their customer types
SELECT 
  'Bottles with Customer Assignment' as info,
  c.customer_type,
  COUNT(*) as bottle_count
FROM bottles b
LEFT JOIN customers c ON b.assigned_customer = c."CustomerListID"
WHERE b.organization_id = (SELECT id FROM organizations LIMIT 1)
  AND b.assigned_customer IS NOT NULL 
  AND b.assigned_customer != ''
GROUP BY c.customer_type
ORDER BY c.customer_type;

-- 2. Check bottles with no assigned_customer (these might be vendor bottles)
SELECT 
  'Bottles with No Customer Assignment' as info,
  COUNT(*) as bottle_count,
  COUNT(CASE WHEN customer_name IS NOT NULL AND customer_name != '' THEN 1 END) as has_customer_name,
  COUNT(CASE WHEN customer_name IS NULL OR customer_name = '' THEN 1 END) as no_customer_name
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (assigned_customer IS NULL OR assigned_customer = '');

-- 3. Check if there are customers with customer_type = 'VENDOR'
SELECT 
  'VENDOR Customers' as info,
  COUNT(*) as vendor_count
FROM customers 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND customer_type = 'VENDOR';

-- 4. Check sample bottles with no assigned_customer to see their customer_name
SELECT 
  'Sample Unassigned Bottles' as info,
  barcode_number,
  customer_name,
  assigned_customer,
  status
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (assigned_customer IS NULL OR assigned_customer = '')
LIMIT 10;

-- 5. Check if there are bottles with customer_name but no assigned_customer
SELECT 
  'Bottles with Customer Name but No Assignment' as info,
  COUNT(*) as bottle_count,
  COUNT(DISTINCT customer_name) as unique_customer_names
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (assigned_customer IS NULL OR assigned_customer = '')
  AND customer_name IS NOT NULL 
  AND customer_name != '';
