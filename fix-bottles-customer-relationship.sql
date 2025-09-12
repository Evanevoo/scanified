-- Fix bottles and customers relationship
-- This script creates the proper foreign key relationship between bottles and customers tables

-- Step 1: Ensure customers table has unique constraint on CustomerListID
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

-- Step 2: Check if the foreign key relationship already exists
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

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_assigned_customer 
ON bottles(assigned_customer);

-- Step 4: Verify the relationship
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

-- Step 5: Test the relationship with a sample query
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
