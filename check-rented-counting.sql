-- Check the actual assignment status of all 411 bottles
-- This will show us exactly how many are assigned vs unassigned

SELECT 
  'Bottle Assignment Status' as info,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'No Customer (Available)'
    ELSE 'Has Customer (Rented)'
  END as assignment_status,
  COUNT(*) as bottle_count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY assignment_status
ORDER BY assignment_status;

-- Check if there are bottles with assigned_customer but status is not 'rented'
SELECT 
  'Bottles with Customer Assignment' as info,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN assigned_customer IS NOT NULL AND assigned_customer != '' THEN 1 END) as has_customer,
  COUNT(CASE WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 1 END) as no_customer
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY status
ORDER BY status;

-- Check sample bottles to see their actual status and assignment
SELECT 
  'Sample Bottles - Status vs Assignment' as info,
  barcode_number,
  gas_type,
  status,
  assigned_customer,
  customer_name,
  CASE 
    WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 'Available'
    ELSE 'Rented'
  END as calculated_status
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
ORDER BY assigned_customer, status
LIMIT 20;

-- Check if there are bottles that should be rented but aren't being counted
SELECT 
  'Potential Counting Issue' as info,
  COUNT(*) as total_bottles,
  COUNT(CASE WHEN assigned_customer IS NOT NULL AND assigned_customer != '' THEN 1 END) as has_customer_count,
  COUNT(CASE WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 1 END) as no_customer_count,
  COUNT(CASE WHEN status = 'rented' THEN 1 END) as status_rented_count,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as status_available_count,
  COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as status_null_count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);
