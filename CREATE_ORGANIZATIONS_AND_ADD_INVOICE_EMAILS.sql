-- Create organizations table (if it doesn't exist) and add invoice email columns
-- This works whether you have companies, tenants, or neither

-- Step 1: Create organizations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations') THEN
    
    CREATE TABLE organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT,
      website TEXT,
      description TEXT,
      subscription_status TEXT DEFAULT 'trial',
      subscription_plan TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ Created organizations table';
    
    -- Note: We're creating an empty organizations table
    -- You can manually populate it or create a mapping from your existing tables
    -- The important part is that the table exists with the invoice email columns
    RAISE NOTICE 'ℹ️ organizations table created. You may need to populate it with your organization data.';
    
  ELSE
    RAISE NOTICE 'ℹ️ organizations table already exists';
  END IF;
END $$;

-- Step 2: Add invoice_emails column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'invoice_emails') THEN
    ALTER TABLE organizations ADD COLUMN invoice_emails JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Added invoice_emails column';
  ELSE
    RAISE NOTICE 'ℹ️ invoice_emails column already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding invoice_emails: %', SQLERRM;
END $$;

-- Step 3: Add default_invoice_email column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'default_invoice_email') THEN
    ALTER TABLE organizations ADD COLUMN default_invoice_email TEXT;
    RAISE NOTICE '✅ Added default_invoice_email column';
  ELSE
    RAISE NOTICE 'ℹ️ default_invoice_email column already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding default_invoice_email: %', SQLERRM;
END $$;

-- Step 4: Migrate existing emails
DO $$ 
BEGIN
  UPDATE organizations 
  SET invoice_emails = jsonb_build_array(email)
  WHERE email IS NOT NULL 
    AND email != ''
    AND (invoice_emails IS NULL OR invoice_emails = '[]'::jsonb);
  
  RAISE NOTICE '✅ Migrated existing emails to invoice_emails';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error migrating emails: %', SQLERRM;
END $$;

-- Step 5: Set default invoice email
DO $$ 
BEGIN
  UPDATE organizations 
  SET default_invoice_email = email
  WHERE email IS NOT NULL 
    AND email != ''
    AND default_invoice_email IS NULL;
  
  RAISE NOTICE '✅ Set default_invoice_email from organization.email';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting default: %', SQLERRM;
END $$;

-- Step 6: Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create basic RLS policy (adjust based on your auth setup)
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
  
  -- Create policy (adjust this based on how your auth works)
  CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true); -- Adjust this based on your actual auth setup
  
  RAISE NOTICE '✅ Created RLS policy for organizations';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
END $$;

-- Final verification
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'organizations' 
             AND column_name = 'invoice_emails')
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'default_invoice_email') THEN
    RAISE NOTICE '✅✅✅ SUCCESS: organizations table and invoice email columns are ready!';
  ELSE
    RAISE WARNING '⚠️ Some columns may not have been created. Check the messages above.';
  END IF;
END $$;
