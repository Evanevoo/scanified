-- Quick duplicate customer name check
-- Run this first to get an overview

-- Simple duplicate names check
SELECT 
  LOWER(TRIM(name)) as customer_name,
  COUNT(*) as duplicate_count,
  STRING_AGG("CustomerListID", ', ') as customer_ids
FROM customers 
WHERE name IS NOT NULL AND TRIM(name) != ''
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, customer_name
LIMIT 50;

-- Quick stats
SELECT 
  'Total Customers' as metric,
  COUNT(*)::text as value
FROM customers
UNION ALL
SELECT 
  'Customers with Names' as metric,
  COUNT(*)::text as value
FROM customers 
WHERE name IS NOT NULL AND TRIM(name) != ''
UNION ALL
SELECT 
  'Unique Names (case-insensitive)' as metric,
  COUNT(DISTINCT LOWER(TRIM(name)))::text as value
FROM customers 
WHERE name IS NOT NULL AND TRIM(name) != ''
UNION ALL
SELECT 
  'Potential Name Duplicates' as metric,
  (COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))))::text as value
FROM customers 
WHERE name IS NOT NULL AND TRIM(name) != '';

-- Top 10 most duplicated names
SELECT 
  name as original_name,
  COUNT(*) as times_duplicated,
  STRING_AGG("CustomerListID", ', ') as all_customer_ids
FROM customers 
WHERE name IS NOT NULL AND TRIM(name) != ''
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;
