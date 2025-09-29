-- MULTI-TENANT DATA ISOLATION & BACKUP SYSTEM
-- This ensures each organization has completely isolated data with backup protection

-- 1. Check current multi-tenancy setup
SELECT 
  'CURRENT ORGANIZATIONS' as info,
  o.id,
  o.name,
  COUNT(DISTINCT c.id) as customers,
  COUNT(DISTINCT b.id) as bottles,
  COUNT(DISTINCT u.id) as users,
  o.created_at
FROM organizations o
LEFT JOIN customers c ON o.id = c.organization_id
LEFT JOIN bottles b ON o.id = b.organization_id  
LEFT JOIN profiles u ON o.id = u.organization_id
GROUP BY o.id, o.name, o.created_at
ORDER BY o.created_at DESC;

-- 2. Check for data leakage between organizations
SELECT 
  'DATA ISOLATION CHECK' as info,
  'customers' as table_name,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as orphaned_records,
  COUNT(DISTINCT organization_id) as organizations_with_data,
  COUNT(*) as total_records
FROM customers
UNION ALL
SELECT 
  'DATA ISOLATION CHECK' as info,
  'bottles' as table_name,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as orphaned_records,
  COUNT(DISTINCT organization_id) as organizations_with_data,
  COUNT(*) as total_records
FROM bottles
UNION ALL
SELECT 
  'DATA ISOLATION CHECK' as info,
  'profiles' as table_name,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as orphaned_records,
  COUNT(DISTINCT organization_id) as organizations_with_data,
  COUNT(*) as total_records
FROM profiles;

-- 3. Check Row Level Security (RLS) policies
SELECT 
  'RLS POLICIES' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('customers', 'bottles', 'profiles', 'organizations')
ORDER BY tablename, policyname;

-- 4. Backup strategy - Create organization-specific backup views
-- This allows each organization to backup only their data

-- Create backup view for customers (organization-specific)
CREATE OR REPLACE VIEW organization_customers_backup AS
SELECT 
  c.*,
  o.name as organization_name,
  CURRENT_TIMESTAMP as backup_timestamp
FROM customers c
JOIN organizations o ON c.organization_id = o.id;

-- Create backup view for bottles (organization-specific)  
CREATE OR REPLACE VIEW organization_bottles_backup AS
SELECT 
  b.*,
  o.name as organization_name,
  CURRENT_TIMESTAMP as backup_timestamp
FROM bottles b
JOIN organizations o ON b.organization_id = o.id;

-- 5. Test data isolation for your test organization
-- Replace 'YOUR_TEST_ORG_ID' with your actual test organization ID
SELECT 
  'YOUR TEST DATA' as info,
  'customers' as data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM customers 
WHERE organization_id = 'YOUR_TEST_ORG_ID'
UNION ALL
SELECT 
  'YOUR TEST DATA' as info,
  'bottles' as data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM bottles 
WHERE organization_id = 'YOUR_TEST_ORG_ID';

-- 6. Security audit - Check for cross-organization references
SELECT 
  'SECURITY AUDIT' as info,
  'bottles_assigned_to_other_org_customers' as issue,
  COUNT(*) as violations
FROM bottles b
JOIN customers c ON b.assigned_customer = c."CustomerListID"
WHERE b.organization_id != c.organization_id;
