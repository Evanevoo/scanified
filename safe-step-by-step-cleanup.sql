-- STEP-BY-STEP SAFE CLEANUP
-- Run these queries one by one to safely remove corrupted data

-- STEP 1: Preview what will be deleted (SAFE - READ ONLY)
SELECT 
  'PREVIEW DELETE' as action,
  name,
  COUNT(*) as will_delete_count,
  STRING_AGG("CustomerListID", ', ') as customer_ids_to_delete
FROM customers 
WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
GROUP BY name
ORDER BY will_delete_count DESC;

-- STEP 2: Check if any of these have real customer data
SELECT 
  'DATA CHECK' as action,
  name,
  COUNT(*) as total,
  COUNT(CASE WHEN contact_details IS NOT NULL AND TRIM(contact_details) != '' THEN 1 END) as has_contact,
  COUNT(CASE WHEN phone IS NOT NULL AND TRIM(phone) != '' THEN 1 END) as has_phone
FROM customers 
WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ')
GROUP BY name;

-- STEP 3: If the above shows no meaningful data, run this DELETE
-- DELETE FROM customers 
-- WHERE name IN ('Saskatoon ', 'Prince George ', 'Regina ', 'Horseshoe Lake ');

-- STEP 4: Check for other city names that might be corrupted
SELECT 
  'OTHER CITIES' as action,
  name,
  COUNT(*) as count
FROM customers 
WHERE name ~ '^[A-Z][a-z]+ [A-Z][a-z]+ $'  -- Pattern like "City Name "
  AND name NOT LIKE '%Ltd%'
  AND name NOT LIKE '%Inc%' 
  AND name NOT LIKE '%Corp%'
  AND name NOT LIKE '%Company%'
  AND name NOT LIKE '%Limited%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- STEP 5: Check for other systematic import errors
SELECT 
  'SYSTEMATIC ERRORS' as action,
  name,
  COUNT(*) as count,
  MIN("CustomerListID") as first_id,
  MAX("CustomerListID") as last_id
FROM customers 
WHERE "CustomerListID" LIKE 'CUST_174975%'  -- These look like test/import timestamps
GROUP BY name
HAVING COUNT(*) > 5  -- Only show names with many duplicates
ORDER BY count DESC
LIMIT 10;

-- STEP 6: Final count after cleanup
SELECT 
  'FINAL COUNT' as action,
  COUNT(*) as total_customers,
  COUNT(DISTINCT LOWER(TRIM(name))) as unique_names,
  COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))) as remaining_duplicates
FROM customers;
