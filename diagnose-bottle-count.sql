-- Diagnostic query to check bottle distribution
-- This will help identify why you're seeing 173 "In-House Assets"

-- Check total bottles by organization
SELECT 
  'Total Bottles' as category,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
UNION ALL

-- Check unassigned bottles (truly in-house)
SELECT 
  'Unassigned Bottles' as category,
  COUNT(*) as count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
  AND assigned_customer IS NULL
UNION ALL

-- Check bottles assigned to vendor customers
SELECT 
  'Bottles with Vendor Customers' as category,
  COUNT(*) as count
FROM bottles b
JOIN customers c ON c."CustomerListID" = b.assigned_customer
WHERE b.organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
  AND c.customer_type = 'VENDOR'
UNION ALL

-- Check bottles assigned to regular customers
SELECT 
  'Bottles with Regular Customers' as category,
  COUNT(*) as count
FROM bottles b
JOIN customers c ON c."CustomerListID" = b.assigned_customer
WHERE b.organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
  AND c.customer_type != 'VENDOR'
UNION ALL

-- Check customer types distribution
SELECT 
  'Vendor Customers' as category,
  COUNT(*) as count
FROM customers 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
  AND customer_type = 'VENDOR'
UNION ALL

SELECT 
  'Regular Customers' as category,
  COUNT(*) as count
FROM customers 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'WeldCor Supplies SK')
  AND customer_type != 'VENDOR';
