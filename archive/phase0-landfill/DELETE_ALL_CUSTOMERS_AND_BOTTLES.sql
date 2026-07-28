-- ⚠️ WARNING: This will DELETE ALL customers and bottles from your database
-- This action CANNOT be undone. Make sure you have a backup before running this.
-- 
-- To use this script:
-- 1. BACKUP YOUR DATA FIRST (export to CSV or use Supabase backup)
-- 2. Review the queries below
-- 3. Run them one at a time or all together
-- 4. Verify the deletion was successful

-- Step 1: Delete all bottles first (they may reference customers)
-- This will also delete related records in other tables if foreign keys are set to CASCADE
DO $$ 
BEGIN
  -- Check if bottles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'bottles') THEN
    
    -- Delete all bottles
    DELETE FROM bottles;
    RAISE NOTICE '✅ Deleted all bottles';
    
    -- Also try cylinders table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'cylinders') THEN
      DELETE FROM cylinders;
      RAISE NOTICE '✅ Deleted all cylinders';
    END IF;
    
  ELSE
    RAISE NOTICE 'ℹ️ bottles table does not exist';
  END IF;
END $$;

-- Step 2: Delete all customers
DO $$ 
BEGIN
  -- Check if customers table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'customers') THEN
    
    -- Delete all customers
    DELETE FROM customers;
    RAISE NOTICE '✅ Deleted all customers';
    
  ELSE
    RAISE NOTICE 'ℹ️ customers table does not exist';
  END IF;
END $$;

-- Step 3: Verify deletion
DO $$ 
DECLARE
  bottle_count INTEGER;
  customer_count INTEGER;
BEGIN
  -- Count remaining bottles
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'bottles') THEN
    SELECT COUNT(*) INTO bottle_count FROM bottles;
    RAISE NOTICE 'Bottles remaining: %', bottle_count;
  END IF;
  
  -- Count remaining customers
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'customers') THEN
    SELECT COUNT(*) INTO customer_count FROM customers;
    RAISE NOTICE 'Customers remaining: %', customer_count;
  END IF;
  
  IF (bottle_count = 0 OR bottle_count IS NULL) AND (customer_count = 0 OR customer_count IS NULL) THEN
    RAISE NOTICE '✅✅✅ All customers and bottles have been deleted successfully!';
  ELSE
    RAISE WARNING '⚠️ Some records may still exist. Check the counts above.';
  END IF;
END $$;

-- Alternative: Use TRUNCATE for faster deletion (if you want to reset auto-increment counters too)
-- Uncomment the lines below if you prefer TRUNCATE instead of DELETE
-- 
-- TRUNCATE TABLE bottles CASCADE;
-- TRUNCATE TABLE customers CASCADE;
-- TRUNCATE TABLE cylinders CASCADE; -- if exists
