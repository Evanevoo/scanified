-- Fix Customer Barcodes SQL Script
-- This script generates barcodes for customers that don't have them
-- Barcode format: %{lowercase_customer_id_without_spaces}

-- Option 1: Fix ALL customers without barcodes
UPDATE customers
SET 
  barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', '')),
  customer_barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', ''))
WHERE 
  (barcode IS NULL OR barcode = '') 
  AND (customer_barcode IS NULL OR customer_barcode = '')
  AND "CustomerListID" IS NOT NULL
  AND "CustomerListID" != '';

-- Option 2: Fix a specific customer (uncomment and replace the CustomerListID)
-- UPDATE customers
-- SET 
--   barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', '')),
--   customer_barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', ''))
-- WHERE "CustomerListID" = '800005BE-1578330321A';

-- Verify the results
SELECT 
  "CustomerListID",
  name,
  barcode,
  customer_barcode,
  CASE 
    WHEN barcode IS NULL OR barcode = '' THEN 'Missing'
    ELSE 'Has Barcode'
  END as status
FROM customers
WHERE 
  (barcode IS NULL OR barcode = '') 
  AND (customer_barcode IS NULL OR customer_barcode = '')
ORDER BY name;

-- Check the specific customer
-- SELECT 
--   "CustomerListID",
--   name,
--   barcode,
--   customer_barcode
-- FROM customers
-- WHERE "CustomerListID" = '800005BE-1578330321A';
