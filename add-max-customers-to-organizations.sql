-- Add missing fields to organizations table
-- This will allow organizations to have email, phone, status, and customer limits

-- Add the email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE organizations ADD COLUMN email TEXT;
    RAISE NOTICE '✅ Added email column to organizations table';
  ELSE
    RAISE NOTICE '✅ email column already exists in organizations table';
  END IF;
END $$;

-- Add the phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE organizations ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to organizations table';
  ELSE
    RAISE NOTICE '✅ phone column already exists in organizations table';
  END IF;
END $$;

-- Add the status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column to organizations table';
  ELSE
    RAISE NOTICE '✅ status column already exists in organizations table';
  END IF;
END $$;

-- Add the max_customers column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'max_customers'
  ) THEN
    ALTER TABLE organizations ADD COLUMN max_customers INTEGER DEFAULT 100;
    RAISE NOTICE '✅ Added max_customers column to organizations table';
  ELSE
    RAISE NOTICE '✅ max_customers column already exists in organizations table';
  END IF;
END $$;

-- Update existing organizations to have unlimited customers (-1)
UPDATE organizations 
SET max_customers = -1 
WHERE max_customers = 100 OR max_customers IS NULL;

-- Show the result
SELECT id, name, max_customers FROM organizations;
