-- SAFE VERSION: Check duplicates first before cleanup
-- Run this first to see what duplicates exist

-- Step 1: Show all duplicate CustomerListID values
SELECT 
  "CustomerListID",
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as customer_ids,
  STRING_AGG(name, ' | ') as customer_names
FROM customers
GROUP BY "CustomerListID"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Show details of each duplicate group
WITH duplicates AS (
  SELECT "CustomerListID"
  FROM customers
  GROUP BY "CustomerListID"
  HAVING COUNT(*) > 1
)
SELECT 
  c."CustomerListID",
  c.id,
  c.name,
  c.created_at,
  c.organization_id
FROM customers c
INNER JOIN duplicates d ON c."CustomerListID" = d."CustomerListID"
ORDER BY c."CustomerListID", c.created_at;

-- Step 3: Count total duplicates
SELECT 
  COUNT(*) as total_duplicate_groups,
  SUM(cnt) as total_duplicate_records
FROM (
  SELECT "CustomerListID", COUNT(*) as cnt
  FROM customers
  GROUP BY "CustomerListID"
  HAVING COUNT(*) > 1
) duplicates;
