-- COMPLETE FIX: Add missing tables and columns
-- Run this to fix all database structure issues

-- Step 1: Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
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

-- Add default organization if it doesn't exist
INSERT INTO organizations (name, slug) 
VALUES ('Default Organization', 'default-org')
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Add missing columns to existing profiles table
DO $$
BEGIN
  -- Add organization_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
    RAISE NOTICE 'Added organization_id column to profiles table';
  END IF;
  
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    RAISE NOTICE 'Added role column to profiles table';
  END IF;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT UNIQUE NOT NULL;
    RAISE NOTICE 'Added email column to profiles table';
  END IF;
  
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE 'Added full_name column to profiles table';
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added created_at column to profiles table';
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added updated_at column to profiles table';
  END IF;
END $$;

-- Step 4: Link existing profiles to default organization
UPDATE profiles 
SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org' LIMIT 1)
WHERE organization_id IS NULL;

-- Step 5: Show final table structure
SELECT 
  'profiles' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT 
  'organizations' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;
