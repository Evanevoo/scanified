-- Fix incomplete CustomerListID values by extracting full ID from customer names
-- This fixes cases where the ID was split and only the last part was stored
-- Example: "101 Doors and Windows Ltd. (80000C0A-1744057121A)" should have ID "80000C0A-1744057121A" not just "1744057121A"

-- First, let's see which customers need to be fixed (preview query)
-- SELECT 
--   name,
--   "CustomerListID" as current_id,
--   UPPER((regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1]) as full_id_from_name
-- FROM customers
-- WHERE name ~ '\([A-Z0-9]+-[A-Z0-9]+\)\s*$'
--   AND (regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1] IS NOT NULL
--   AND (regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1] LIKE '%-%'
--   AND UPPER((regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1]) != "CustomerListID";

-- Update customers where the name contains a full ID in brackets but the CustomerListID is incomplete or wrong
-- This handles both formats:
-- 1. IDs with dashes: "Customer Name (80000C0A-1744057121A)"
-- 2. IDs without dashes: "Customer Name (8000065B)"

-- First, fix customers with IDs that have dashes (incomplete IDs)
UPDATE customers
SET "CustomerListID" = UPPER(
  -- Extract the full ID from the last set of parentheses in the name
  -- Pattern: (ID) or (MAIN_ID-BRANCH_ID) at the end
  (regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1]
)
WHERE 
  -- Only update if:
  -- 1. The name contains an ID in brackets at the end with a dash (full ID format)
  -- 2. The extracted ID is different from the current CustomerListID
  name ~ '\([A-Z0-9]+-[A-Z0-9]+\)\s*$'
  AND (regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1] IS NOT NULL
  AND (regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1] LIKE '%-%'
  AND UPPER((regexp_match(name, '\(([A-Z0-9]+(?:-[A-Z0-9]+)*)\)\s*$'))[1]) != UPPER("CustomerListID");

-- Second, fix customers with single IDs in brackets (no dash) where the ID doesn't match
UPDATE customers
SET "CustomerListID" = UPPER(
  -- Extract the ID from the last set of parentheses
  (regexp_match(name, '\(([A-Z0-9]+)\)\s*$'))[1]
)
WHERE 
  -- Only update if:
  -- 1. The name contains an ID in brackets at the end (single ID, no dash)
  -- 2. The extracted ID is different from the current CustomerListID
  -- 3. The ID in brackets doesn't contain a dash (to avoid double-processing)
  name ~ '\([A-Z0-9]+\)\s*$'
  AND name !~ '\([A-Z0-9]+-[A-Z0-9]+\)\s*$'  -- Exclude IDs with dashes (already handled above)
  AND (regexp_match(name, '\(([A-Z0-9]+)\)\s*$'))[1] IS NOT NULL
  AND UPPER((regexp_match(name, '\(([A-Z0-9]+)\)\s*$'))[1]) != UPPER("CustomerListID");

-- After running the update, verify the results:
-- SELECT name, "CustomerListID" 
-- FROM customers 
-- WHERE name ~ '\([A-Z0-9]+-[A-Z0-9]+\)\s*$'
-- ORDER BY name;

-- After fixing customer IDs, reassign bottles that might have been missed
-- This updates bottles where the customer_name matches a customer but assigned_customer is NULL
UPDATE bottles b
SET assigned_customer = c.id
FROM customers c
WHERE 
  -- Match bottles to customers by name (case-insensitive)
  LOWER(TRIM(b.customer_name)) = LOWER(TRIM(c.name))
  -- Only update if bottle doesn't have an assigned customer
  AND b.assigned_customer IS NULL
  -- Make sure customer exists and has a valid ID
  AND c.id IS NOT NULL
  AND b.organization_id = c.organization_id;

-- Additional diagnostic query: Check for customers that might have IDs in brackets but weren't caught
-- This includes customers with single IDs (no dash) in brackets
-- SELECT 
--   name,
--   "CustomerListID" as current_id,
--   UPPER((regexp_match(name, '\(([A-Z0-9]+)\)\s*$'))[1]) as id_from_name,
--   CASE 
--     WHEN name ~ '\([A-Z0-9]+\)\s*$' AND UPPER((regexp_match(name, '\(([A-Z0-9]+)\)\s*$'))[1]) != UPPER("CustomerListID")
--     THEN 'NEEDS_UPDATE'
--     ELSE 'OK'
--   END as status
-- FROM customers
-- WHERE name ~ '\([A-Z0-9]+\)\s*$'
-- ORDER BY name;

-- Check for bottles that still don't have assigned customers after the fix
-- SELECT 
--   b.customer_name,
--   COUNT(*) as unassigned_bottles
-- FROM bottles b
-- WHERE b.assigned_customer IS NULL
--   AND b.customer_name IS NOT NULL
--   AND b.customer_name != ''
-- GROUP BY b.customer_name
-- ORDER BY COUNT(*) DESC;

