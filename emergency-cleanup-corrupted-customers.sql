-- EMERGENCY CLEANUP: Remove corrupted customer data
-- These appear to be city names imported as customer names with sequential IDs

-- 1. First, let's see what we're dealing with
SELECT 
  name,
  COUNT(*) as count,
  MIN("CustomerListID") as first_id,
  MAX("CustomerListID") as last_id,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM customers 
WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
GROUP BY name
ORDER BY count DESC;

-- 2. Check if these have any real customer data (contact details, etc.)
SELECT 
  name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN contact_details IS NOT NULL AND TRIM(contact_details) != '' THEN 1 END) as with_contact,
  COUNT(CASE WHEN phone IS NOT NULL AND TRIM(phone) != '' THEN 1 END) as with_phone
FROM customers 
WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
GROUP BY name;

-- 3. SAFE DELETE - Remove these corrupted entries
-- Only delete if they have no meaningful customer data
DELETE FROM customers 
WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
  AND (
    contact_details IS NULL 
    OR TRIM(contact_details) = ''
  )
  AND (
    phone IS NULL 
    OR TRIM(phone) = ''
  );

-- 4. Check for other similar patterns (city names as customer names)
SELECT 
  name,
  COUNT(*) as count
FROM customers 
WHERE name ~ '^[A-Z][a-z]+ [A-Z][a-z]+ $'  -- Pattern like "City Name "
  AND name NOT LIKE '%Ltd%'
  AND name NOT LIKE '%Inc%'
  AND name NOT LIKE '%Corp%'
  AND name NOT LIKE '%Company%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 5. Check for sequential CustomerListID patterns (potential bulk import errors)
WITH sequential_groups AS (
  SELECT 
    name,
    "CustomerListID",
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "CustomerListID") as row_num,
    COUNT(*) OVER (PARTITION BY name) as total_count
  FROM customers 
  WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
)
SELECT 
  name,
  total_count,
  MIN("CustomerListID") as first_id,
  MAX("CustomerListID") as last_id
FROM sequential_groups
GROUP BY name, total_count
ORDER BY total_count DESC;

-- 6. After cleanup, check remaining customer count
SELECT 
  COUNT(*) as remaining_customers,
  COUNT(DISTINCT LOWER(TRIM(name))) as unique_names
FROM customers;
