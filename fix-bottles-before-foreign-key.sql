-- FIX FOREIGN KEY CONSTRAINT: Handle empty assigned_customer values
-- Run this BEFORE running execute-duplicate-cleanup.sql

-- Step 1: Check for bottles with empty assigned_customer values
DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
  FROM bottles 
  WHERE assigned_customer IS NULL OR assigned_customer = '';
  
  RAISE NOTICE 'Found % bottles with empty assigned_customer values', empty_count;
END $$;

-- Step 2: Update empty assigned_customer values to NULL
UPDATE bottles 
SET assigned_customer = NULL 
WHERE assigned_customer = '';

-- Step 3: Verify no empty strings remain
DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
  FROM bottles 
  WHERE assigned_customer = '';
  
  IF empty_count = 0 THEN
    RAISE NOTICE '✅ All empty assigned_customer values converted to NULL';
  ELSE
    RAISE NOTICE '❌ Still have % empty assigned_customer values', empty_count;
  END IF;
END $$;

-- Step 4: Check for bottles with assigned_customer values that don't exist in customers
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM bottles b
  WHERE b.assigned_customer IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customers c 
    WHERE c."CustomerListID" = b.assigned_customer
  );
  
  RAISE NOTICE 'Found % bottles with assigned_customer values that don''t exist in customers', invalid_count;
END $$;

-- Step 5: Show invalid assignments (if any)
SELECT 
  'INVALID ASSIGNMENT' as issue_type,
  b.assigned_customer,
  b.id as bottle_id,
  b.serial_number,
  b.barcode_number
FROM bottles b
WHERE b.assigned_customer IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM customers c 
  WHERE c."CustomerListID" = b.assigned_customer
)
LIMIT 10;

-- Step 6: Summary
DO $$
DECLARE
  total_bottles INTEGER;
  assigned_bottles INTEGER;
  null_bottles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_bottles FROM bottles;
  SELECT COUNT(*) INTO assigned_bottles FROM bottles WHERE assigned_customer IS NOT NULL;
  SELECT COUNT(*) INTO null_bottles FROM bottles WHERE assigned_customer IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Bottle Assignment Summary:';
  RAISE NOTICE '  Total Bottles: %', total_bottles;
  RAISE NOTICE '  Assigned Bottles: %', assigned_bottles;
  RAISE NOTICE '  Unassigned Bottles: %', null_bottles;
  RAISE NOTICE '';
END $$;
