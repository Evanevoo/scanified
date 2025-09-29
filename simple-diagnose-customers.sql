-- SIMPLE DIAGNOSIS: Check customers table and constraint issues
-- This avoids complex schema queries that might have column name issues

-- 1. Check if customers table is actually empty
SELECT 
  'CUSTOMER COUNT' as check_type,
  COUNT(*) as total_customers,
  COUNT(CASE WHEN "CustomerListID" IS NOT NULL THEN 1 END) as with_customerlistid,
  COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as with_name
FROM customers;

-- 2. Check for any remaining customers (if count > 0)
SELECT 
  'REMAINING CUSTOMERS' as check_type,
  name,
  "CustomerListID",
  organization_id,
  created_at,
  id
FROM customers 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check table structure to understand constraints
SELECT 
  'TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- 4. Simple test insert to see if constraint works
-- (Comment this out if you don't want to test insert)
-- INSERT INTO customers (name, "CustomerListID", organization_id) 
-- VALUES ('Test Customer', 'TEST123', (SELECT id FROM organizations LIMIT 1));

-- 5. Check for any other tables that might have customer data
SELECT 
  'OTHER TABLES' as check_type,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name ILIKE '%customer%'
ORDER BY table_name;

-- 6. Check if there are any views
SELECT 
  'CUSTOMER VIEWS' as check_type,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name ILIKE '%customer%'
  AND table_type = 'VIEW'
ORDER BY table_name;
