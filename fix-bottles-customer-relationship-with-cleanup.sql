-- Fix bottles and customers relationship with duplicate cleanup
-- This script handles duplicate CustomerListID values and creates proper relationships

-- Step 1: Identify and handle duplicate CustomerListID values
DO $$
DECLARE
  duplicate_count INTEGER;
  duplicate_record RECORD;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT "CustomerListID", COUNT(*) as cnt
    FROM customers
    GROUP BY "CustomerListID"
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate CustomerListID values. Cleaning up...', duplicate_count;
    
    -- Show duplicates for review
    RAISE NOTICE 'Duplicate CustomerListID values:';
    FOR duplicate_record IN 
      SELECT "CustomerListID", COUNT(*) as cnt
      FROM customers
      GROUP BY "CustomerListID"
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
    LOOP
      RAISE NOTICE '  % appears % times', duplicate_record."CustomerListID", duplicate_record.cnt;
    END LOOP;
    
    -- Keep the oldest record for each duplicate CustomerListID
    DELETE FROM customers 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM customers 
      GROUP BY "CustomerListID"
    );
    
    RAISE NOTICE '✅ Duplicate cleanup completed';
  ELSE
    RAISE NOTICE '✅ No duplicate CustomerListID values found';
  END IF;
END $$;

-- Step 2: Ensure customers table has unique constraint on CustomerListID
DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_customerlistid_unique' 
    AND table_name = 'customers'
    AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE 'Creating unique constraint on customers.CustomerListID...';
    
    -- Add unique constraint
    ALTER TABLE customers 
    ADD CONSTRAINT customers_customerlistid_unique 
    UNIQUE ("CustomerListID");
    
    RAISE NOTICE '✅ Unique constraint created successfully';
  ELSE
    RAISE NOTICE '✅ Unique constraint already exists on customers.CustomerListID';
  END IF;
END $$;

-- Step 3: Check if the foreign key relationship already exists
DO $$
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'bottles_assigned_customer_fkey' 
    AND table_name = 'bottles'
  ) THEN
    RAISE NOTICE 'Creating foreign key relationship between bottles and customers...';
    
    -- Add foreign key constraint
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

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_assigned_customer 
ON bottles(assigned_customer);

-- Step 5: Verify the relationship
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE constraint_name = 'bottles_assigned_customer_fkey' 
  AND table_name = 'bottles';
  
  IF constraint_count > 0 THEN
    RAISE NOTICE '🎉 Bottles-Customers relationship is properly configured!';
  ELSE
    RAISE NOTICE '❌ Failed to create bottles-customers relationship';
  END IF;
END $$;

-- Step 6: Test the relationship with a sample query
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Try to join bottles with customers to test the relationship
  SELECT COUNT(*) INTO test_count
  FROM bottles b
  LEFT JOIN customers c ON b.assigned_customer = c."CustomerListID"
  LIMIT 1;
  
  RAISE NOTICE '✅ Relationship test successful - can join bottles with customers';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Relationship test failed: %', SQLERRM;
END $$;

-- Step 7: Show final statistics
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
  RAISE NOTICE '📊 Final Statistics:';
  RAISE NOTICE '  Customers: %', customer_count;
  RAISE NOTICE '  Bottles: %', bottle_count;
  RAISE NOTICE '  Assigned Bottles: %', assigned_count;
  RAISE NOTICE '';
END $$;
