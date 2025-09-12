-- Debug Organization Query
-- This will help identify which organization you're logged into

-- Show all organizations and their customer counts
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.created_at,
  COUNT(c.id) as customer_count
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.created_at
ORDER BY customer_count DESC;

-- Show ONLY organizations with 47 customers (your organization)
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.created_at,
  COUNT(c.id) as customer_count
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.created_at
HAVING COUNT(c.id) = 47
ORDER BY o.created_at DESC;

-- INVESTIGATE DATA INTEGRITY ISSUES
-- Check for customers with wrong organization_id
SELECT 
  'Customers with NULL organization_id' as issue_type,
  COUNT(*) as count
FROM customers 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Customers with invalid organization_id' as issue_type,
  COUNT(*) as count
FROM customers c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.organization_id IS NOT NULL AND o.id IS NULL;

-- Show customers by organization (no soft delete column exists)
SELECT 
  o.name as organization_name,
  COUNT(c.id) as total_customers,
  MIN(c.created_at) as earliest_customer,
  MAX(c.created_at) as latest_customer
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_customers DESC;

-- Check customers table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show profiles and their organization links
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Show recent customer activity by organization
SELECT 
  o.name as organization_name,
  COUNT(c.id) as total_customers,
  COUNT(cp.id) as customers_with_pricing,
  MAX(c.created_at) as latest_customer_added
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
LEFT JOIN customer_pricing cp ON cp.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_customers DESC;
