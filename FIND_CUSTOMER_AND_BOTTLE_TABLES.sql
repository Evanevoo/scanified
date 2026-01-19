-- Find the actual table names for customers and bottles/cylinders
-- Run this first to see what tables you have

-- List all tables that might contain customer data
SELECT 
  'Possible customer tables' as category,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND column_name IN ('name', 'email', 'phone', 'CustomerListID')) as matching_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%customer%' 
    OR table_name ILIKE '%contact%'
    OR table_name ILIKE '%client%'
  )
ORDER BY matching_columns DESC, table_name;

-- List all tables that might contain bottle/cylinder data
SELECT 
  'Possible bottle/cylinder tables' as category,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND column_name IN ('barcode', 'barcode_number', 'serial_number', 'gas_type')) as matching_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%bottle%' 
    OR table_name ILIKE '%cylinder%'
    OR table_name ILIKE '%asset%'
    OR table_name ILIKE '%item%'
  )
ORDER BY matching_columns DESC, table_name;

-- Show all tables for reference
SELECT 
  'All tables' as category,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
