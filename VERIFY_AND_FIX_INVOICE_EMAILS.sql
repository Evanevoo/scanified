-- Verify and fix invoice email columns
-- Run this to check if columns exist and add them if they don't

-- Step 1: Verify organizations table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations') THEN
    RAISE EXCEPTION 'ERROR: organizations table does not exist. Please run CREATE_ORGANIZATIONS_AND_ADD_INVOICE_EMAILS.sql first.';
  ELSE
    RAISE NOTICE '✅ organizations table exists';
  END IF;
END $$;

-- Step 2: Add invoice_emails column (force add if it doesn't exist)
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
  WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ invoice_emails column already exists (duplicate_column error)';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding invoice_emails: %', SQLERRM;
END $$;

-- Step 3: Add default_invoice_email column (force add if it doesn't exist)
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
  WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ default_invoice_email column already exists (duplicate_column error)';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding default_invoice_email: %', SQLERRM;
END $$;

-- Step 4: Verify columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name IN ('invoice_emails', 'default_invoice_email')
ORDER BY column_name;

-- Step 5: Force schema cache refresh hint
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ Columns added/verified successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT: If you still see schema cache errors:';
  RAISE NOTICE '   1. Wait 10-30 seconds for Supabase to refresh the cache';
  RAISE NOTICE '   2. Refresh your browser/app';
  RAISE NOTICE '   3. Try the operation again';
  RAISE NOTICE '';
END $$;
