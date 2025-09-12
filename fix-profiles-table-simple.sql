-- SIMPLE FIX: Add organization_id column to profiles table
-- Run this FIRST, then run the truck reconciliation script

-- Step 1: Check if profiles table exists and what columns it has
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Step 2: Add organization_id column if it doesn't exist
DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE NOTICE 'Profiles table exists';
    
    -- Check if organization_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
      RAISE NOTICE 'Adding organization_id column to profiles table...';
      ALTER TABLE profiles ADD COLUMN organization_id UUID;
      RAISE NOTICE 'SUCCESS: organization_id column added to profiles table';
    ELSE
      RAISE NOTICE 'organization_id column already exists in profiles table';
    END IF;
    
    -- Check if role column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
      RAISE NOTICE 'Adding role column to profiles table...';
      ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
      RAISE NOTICE 'SUCCESS: role column added to profiles table';
    ELSE
      RAISE NOTICE 'role column already exists in profiles table';
    END IF;
    
  ELSE
    RAISE NOTICE 'ERROR: profiles table does not exist!';
  END IF;
END $$;

-- Step 3: Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
