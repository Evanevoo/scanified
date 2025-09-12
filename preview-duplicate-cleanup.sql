-- TARGETED CLEANUP: Show exactly what will be deleted
-- Run this to see which records will be kept vs deleted

-- Step 1: Show which records will be KEPT (oldest for each CustomerListID)
SELECT 
  'KEEP' as action,
  c."CustomerListID",
  c.id,
  c.name,
  c.created_at,
  c.organization_id
FROM customers c
WHERE c.id IN (
  SELECT id 
  FROM customers c2
  WHERE c2."CustomerListID" = c."CustomerListID"
  ORDER BY c2.created_at ASC
  LIMIT 1
)
AND c."CustomerListID" IN (
  SELECT "CustomerListID"
  FROM customers
  GROUP BY "CustomerListID"
  HAVING COUNT(*) > 1
)
ORDER BY c."CustomerListID";

-- Step 2: Show which records will be DELETED (newer duplicates)
SELECT 
  'DELETE' as action,
  c."CustomerListID",
  c.id,
  c.name,
  c.created_at,
  c.organization_id
FROM customers c
WHERE c.id NOT IN (
  SELECT id 
  FROM customers c2
  WHERE c2."CustomerListID" = c."CustomerListID"
  ORDER BY c2.created_at ASC
  LIMIT 1
)
AND c."CustomerListID" IN (
  SELECT "CustomerListID"
  FROM customers
  GROUP BY "CustomerListID"
  HAVING COUNT(*) > 1
)
ORDER BY c."CustomerListID", c.created_at;

-- Step 3: Summary of cleanup
SELECT 
  'SUMMARY' as action,
  COUNT(DISTINCT "CustomerListID") as duplicate_groups,
  COUNT(*) as records_to_delete,
  COUNT(*) + COUNT(DISTINCT "CustomerListID") as total_duplicate_records
FROM customers c
WHERE c.id NOT IN (
  SELECT id 
  FROM customers c2
  WHERE c2."CustomerListID" = c."CustomerListID"
  ORDER BY c2.created_at ASC
  LIMIT 1
)
AND c."CustomerListID" IN (
  SELECT "CustomerListID"
  FROM customers
  GROUP BY "CustomerListID"
  HAVING COUNT(*) > 1
);
