-- Generic deletion script that works with different table names
-- This will try to delete from common table name variations

-- Step 1: Delete from bottles table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'bottles') THEN
    DELETE FROM bottles;
    RAISE NOTICE '✅ Deleted all records from bottles table';
  END IF;
END $$;

-- Step 2: Delete from cylinders table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'cylinders') THEN
    DELETE FROM cylinders;
    RAISE NOTICE '✅ Deleted all records from cylinders table';
  END IF;
END $$;

-- Step 3: Delete from customers table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'customers') THEN
    DELETE FROM customers;
    RAISE NOTICE '✅ Deleted all records from customers table';
  END IF;
END $$;

-- Step 4: Delete from contacts table (if it exists and is used for customers)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'contacts') THEN
    -- Only delete if this table has customer-like columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'contacts' 
               AND column_name IN ('name', 'email')) THEN
      DELETE FROM contacts;
      RAISE NOTICE '✅ Deleted all records from contacts table';
    ELSE
      RAISE NOTICE 'ℹ️ contacts table exists but may not be for customers - skipping';
    END IF;
  END IF;
END $$;

-- Step 5: Show what was deleted
DO $$ 
DECLARE
  total_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Deletion Summary ===';
  
  -- Count what's left
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bottles') THEN
    SELECT COUNT(*) INTO total_deleted FROM bottles;
    RAISE NOTICE 'Bottles remaining: %', total_deleted;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cylinders') THEN
    SELECT COUNT(*) INTO total_deleted FROM cylinders;
    RAISE NOTICE 'Cylinders remaining: %', total_deleted;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    SELECT COUNT(*) INTO total_deleted FROM customers;
    RAISE NOTICE 'Customers remaining: %', total_deleted;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    SELECT COUNT(*) INTO total_deleted FROM contacts;
    RAISE NOTICE 'Contacts remaining: %', total_deleted;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Deletion process completed!';
END $$;
