-- Check actual bottle counts and statuses
-- Run this in Supabase SQL editor to verify your bottle counts

-- 1. Count bottles by status
SELECT 
  'Bottles by Status' as info,
  status,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY status
ORDER BY status;

-- 2. Count bottles by assigned_customer status
SELECT 
  'Bottles by Customer Assignment' as info,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'No Customer'
    ELSE 'Has Customer'
  END as assignment_status,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY assignment_status;

-- 3. Count bottles by gas_type and status
SELECT 
  'Bottles by Gas Type and Status' as info,
  gas_type,
  status,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'No Customer'
    ELSE 'Has Customer'
  END as assignment_status,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY gas_type, status, assignment_status
ORDER BY gas_type, status, assignment_status;

-- 4. Show sample bottles to understand the data
SELECT 
  'Sample Bottles' as info,
  barcode_number,
  gas_type,
  status,
  assigned_customer,
  customer_name,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'No Customer'
    ELSE 'Has Customer'
  END as assignment_status
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
ORDER BY gas_type, status
LIMIT 10;

-- 5. Count ARGON bottles specifically
SELECT 
  'ARGON Bottles Breakdown' as info,
  status,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'Available'
    ELSE 'Rented'
  END as calculated_status,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND gas_type = 'ARGON'
GROUP BY status, calculated_status
ORDER BY status, calculated_status;
