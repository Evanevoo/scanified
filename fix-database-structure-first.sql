-- =============================================
-- BULLETPROOF Database Structure Fix
-- This MUST be run FIRST to add missing columns
-- =============================================

-- Step 1: Create organizations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    CREATE TABLE organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      subscription_plan TEXT DEFAULT 'basic',
      subscription_status TEXT DEFAULT 'trial',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert default organization
    INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default-org');
    
    RAISE NOTICE '✅ Created organizations table with default organization';
  ELSE
    RAISE NOTICE '✅ Organizations table already exists';
  END IF;
END $$;

-- Step 2: Add organization_id columns to ALL tables that might need them
DO $$
DECLARE
  table_name TEXT;
  tables_to_fix TEXT[] := ARRAY['customers', 'bottles', 'profiles', 'rentals', 'invoices', 'scans', 'cylinder_scans', 'deliveries', 'notifications', 'audit_logs'];
BEGIN
  RAISE NOTICE '🔧 Adding organization_id columns to existing tables...';
  
  FOREACH table_name IN ARRAY tables_to_fix
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
      -- Check if organization_id column exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name AND column_name = 'organization_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id UUID', table_name);
        RAISE NOTICE '✅ Added organization_id to %', table_name;
      ELSE
        RAISE NOTICE '✅ % already has organization_id column', table_name;
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Table % does not exist, skipping', table_name;
    END IF;
  END LOOP;
END $$;

-- Step 3: Add created_at columns where missing
DO $$
DECLARE
  table_name TEXT;
  tables_to_fix TEXT[] := ARRAY['customers', 'bottles', 'profiles', 'rentals', 'invoices', 'scans', 'cylinder_scans', 'deliveries', 'notifications', 'audit_logs'];
BEGIN
  RAISE NOTICE '🕒 Adding created_at columns to existing tables...';
  
  FOREACH table_name IN ARRAY tables_to_fix
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
      -- Check if created_at column exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name AND column_name = 'created_at') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', table_name);
        RAISE NOTICE '✅ Added created_at to %', table_name;
      ELSE
        RAISE NOTICE '✅ % already has created_at column', table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 4: Add updated_at columns where missing
DO $$
DECLARE
  table_name TEXT;
  tables_to_fix TEXT[] := ARRAY['customers', 'bottles', 'profiles', 'rentals', 'invoices', 'scans', 'cylinder_scans', 'deliveries', 'notifications', 'audit_logs'];
BEGIN
  RAISE NOTICE '🕒 Adding updated_at columns to existing tables...';
  
  FOREACH table_name IN ARRAY tables_to_fix
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
      -- Check if updated_at column exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name AND column_name = 'updated_at') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', table_name);
        RAISE NOTICE '✅ Added updated_at to %', table_name;
      ELSE
        RAISE NOTICE '✅ % already has updated_at column', table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 5: Link existing data to default organization
DO $$
DECLARE
  default_org_id UUID;
  table_name TEXT;
  tables_to_update TEXT[] := ARRAY['customers', 'bottles', 'profiles', 'rentals', 'invoices', 'scans', 'cylinder_scans', 'deliveries', 'notifications', 'audit_logs'];
  update_count INTEGER;
BEGIN
  -- Get default organization ID
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org' LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    RAISE NOTICE '🔗 Linking existing data to default organization...';
    
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name AND column_name = 'organization_id') THEN
        
        EXECUTE format('UPDATE %I SET organization_id = $1 WHERE organization_id IS NULL', table_name) USING default_org_id;
        GET DIAGNOSTICS update_count = ROW_COUNT;
        
        IF update_count > 0 THEN
          RAISE NOTICE '✅ Updated % records in %', update_count, table_name;
        ELSE
          RAISE NOTICE '✅ No records to update in %', table_name;
        END IF;
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ Could not find default organization';
  END IF;
END $$;

-- Step 6: Create basic profiles table if it doesn't exist (needed for foreign keys)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY,
      organization_id UUID,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      role_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE '✅ Created basic profiles table';
  ELSE
    RAISE NOTICE '✅ Profiles table already exists';
  END IF;
END $$;

-- Step 7: Create basic customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    CREATE TABLE customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID,
      "CustomerListID" TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      customer_number TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      postal_code TEXT,
      country TEXT DEFAULT 'Canada',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE '✅ Created basic customers table';
  ELSE
    RAISE NOTICE '✅ Customers table already exists';
  END IF;
END $$;

-- Step 8: Create basic bottles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
    CREATE TABLE bottles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID,
      barcode_number TEXT UNIQUE NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      assigned_customer TEXT,
      customer_name TEXT,
      product_code TEXT,
      description TEXT,
      gas_type TEXT,
      location TEXT,
      status TEXT DEFAULT 'available',
      owner_id UUID,
      owner_name TEXT,
      owner_type TEXT DEFAULT 'organization',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE '✅ Created basic bottles table';
  ELSE
    RAISE NOTICE '✅ Bottles table already exists';
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  missing_tables TEXT[] := '{}';
  missing_columns TEXT[] := '{}';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DATABASE STRUCTURE FIX COMPLETED!';
  RAISE NOTICE '';
  
  -- Check what we have now
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE '✅ organizations table: EXISTS';
  ELSE
    missing_tables := array_append(missing_tables, 'organizations');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE NOTICE '✅ profiles table: EXISTS';
  ELSE
    missing_tables := array_append(missing_tables, 'profiles');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    RAISE NOTICE '✅ customers table: EXISTS';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'organization_id') THEN
      RAISE NOTICE '✅ customers.organization_id: EXISTS';
    ELSE
      missing_columns := array_append(missing_columns, 'customers.organization_id');
    END IF;
  ELSE
    missing_tables := array_append(missing_tables, 'customers');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
    RAISE NOTICE '✅ bottles table: EXISTS';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bottles' AND column_name = 'organization_id') THEN
      RAISE NOTICE '✅ bottles.organization_id: EXISTS';
    ELSE
      missing_columns := array_append(missing_columns, 'bottles.organization_id');
    END IF;
  ELSE
    missing_tables := array_append(missing_tables, 'bottles');
  END IF;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE '⚠️ Still missing tables: %', array_to_string(missing_tables, ', ');
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE '⚠️ Still missing columns: %', array_to_string(missing_columns, ', ');
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your database is now ready for truck reconciliation installation!';
  RAISE NOTICE '📋 Next step: Run the truck reconciliation tables script';
  RAISE NOTICE '';
END $$;
