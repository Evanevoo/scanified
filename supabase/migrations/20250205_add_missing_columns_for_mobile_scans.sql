-- Fix 42703 "column does not exist" on iOS mobile scans
-- Add columns that the mobile app uses but might not exist in bottle_scans or scans

-- bottle_scans: location, user_id
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- scans: product_code, location, scanned_by (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scans') THEN
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS product_code TEXT;
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
