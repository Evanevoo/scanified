-- EXECUTE CLEANUP: Remove duplicate customers and create relationships
-- Only run this AFTER reviewing the preview-duplicate-cleanup.sql results

-- Step 1: Fix bottles table before creating foreign key
DO $$
DECLARE
  empty_count INTEGER;
  invalid_count INTEGER;
BEGIN
  RAISE NOTICE 'Fixing bottles table...';
  
  -- Convert empty strings to NULL
  UPDATE bottles 
  SET assigned_customer = NULL 
  WHERE assigned_customer = '';
  
  GET DIAGNOSTICS empty_count = ROW_COUNT;
  RAISE NOTICE '✅ Converted % empty assigned_customer values to NULL', empty_count;
  
  -- Check for invalid assignments
  SELECT COUNT(*) INTO invalid_count
  FROM bottles b
  WHERE b.assigned_customer IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customers c 
    WHERE c."CustomerListID" = b.assigned_customer
  );
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '⚠️  Found % bottles with invalid assigned_customer values', invalid_count;
    RAISE NOTICE '   These will be set to NULL to maintain data integrity';
    
    -- Set invalid assignments to NULL
    UPDATE bottles 
    SET assigned_customer = NULL
    WHERE assigned_customer IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM customers c 
      WHERE c."CustomerListID" = bottles.assigned_customer
    );
  END IF;
END $$;

-- Step 2: Remove duplicate customers (keep oldest record for each CustomerListID)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting duplicate cleanup...';
  
  -- Delete newer duplicate records (keep oldest by created_at)
  DELETE FROM customers 
  WHERE id NOT IN (
    SELECT DISTINCT ON ("CustomerListID") id
    FROM customers
    ORDER BY "CustomerListID", created_at ASC
  )
  AND "CustomerListID" IN (
    SELECT "CustomerListID"
    FROM customers
    GROUP BY "CustomerListID"
    HAVING COUNT(*) > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % duplicate customer records', deleted_count;
END $$;

-- Step 2: Verify no duplicates remain
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT "CustomerListID"
    FROM customers
    GROUP BY "CustomerListID"
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ No duplicate CustomerListID values remain';
  ELSE
    RAISE NOTICE '❌ Still have % duplicate groups', remaining_duplicates;
  END IF;
END $$;

-- Step 3: Create unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_customerlistid_unique' 
    AND table_name = 'customers'
    AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE 'Creating unique constraint on customers.CustomerListID...';
    
    ALTER TABLE customers 
    ADD CONSTRAINT customers_customerlistid_unique 
    UNIQUE ("CustomerListID");
    
    RAISE NOTICE '✅ Unique constraint created successfully';
  ELSE
    RAISE NOTICE '✅ Unique constraint already exists';
  END IF;
END $$;

-- Step 4: Create foreign key relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'bottles_assigned_customer_fkey' 
    AND table_name = 'bottles'
  ) THEN
    RAISE NOTICE 'Creating foreign key relationship...';
    
    ALTER TABLE bottles 
    ADD CONSTRAINT bottles_assigned_customer_fkey 
    FOREIGN KEY (assigned_customer) 
    REFERENCES customers("CustomerListID") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
    
    RAISE NOTICE '✅ Foreign key relationship created successfully';
  ELSE
    RAISE NOTICE '✅ Foreign key relationship already exists';
  END IF;
END $$;

-- Step 5: Create performance index
CREATE INDEX IF NOT EXISTS idx_bottles_assigned_customer 
ON bottles(assigned_customer);

-- Step 6: Test the relationship
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count
  FROM bottles b
  LEFT JOIN customers c ON b.assigned_customer = c."CustomerListID"
  LIMIT 1;
  
  RAISE NOTICE '✅ Relationship test successful';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Relationship test failed: %', SQLERRM;
END $$;

-- Step 7: Final statistics
DO $$
DECLARE
  customer_count INTEGER;
  bottle_count INTEGER;
  assigned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM customers;
  SELECT COUNT(*) INTO bottle_count FROM bottles;
  SELECT COUNT(*) INTO assigned_count FROM bottles WHERE assigned_customer IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 CLEANUP COMPLETE!';
  RAISE NOTICE '📊 Final Statistics:';
  RAISE NOTICE '  Customers: %', customer_count;
  RAISE NOTICE '  Bottles: %', bottle_count;
  RAISE NOTICE '  Assigned Bottles: %', assigned_count;
  RAISE NOTICE '';
END $$;
