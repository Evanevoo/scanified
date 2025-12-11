-- Add contact and address fields to organizations table
-- These fields are needed for invoice generation and organization settings

DO $$ 
BEGIN
  -- Add address field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'address') THEN
    ALTER TABLE organizations ADD COLUMN address TEXT;
  END IF;

  -- Add city field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'city') THEN
    ALTER TABLE organizations ADD COLUMN city TEXT;
  END IF;

  -- Add state field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'state') THEN
    ALTER TABLE organizations ADD COLUMN state TEXT;
  END IF;

  -- Add postal_code field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'postal_code') THEN
    ALTER TABLE organizations ADD COLUMN postal_code TEXT;
  END IF;

  -- Add country field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'country') THEN
    ALTER TABLE organizations ADD COLUMN country TEXT;
  END IF;

  -- Add website field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'website') THEN
    ALTER TABLE organizations ADD COLUMN website TEXT;
  END IF;

  -- Add phone field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'phone') THEN
    ALTER TABLE organizations ADD COLUMN phone TEXT;
  END IF;

  -- Add email field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'email') THEN
    ALTER TABLE organizations ADD COLUMN email TEXT;
  END IF;

  -- Add description field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'description') THEN
    ALTER TABLE organizations ADD COLUMN description TEXT;
  END IF;

  RAISE NOTICE 'Organization contact and address fields added successfully';
END $$;

-- Ensure RLS is enabled on organizations table for multi-tenant security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can only view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can only update their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON organizations;

-- RLS Policy: Users can only SELECT their own organization
CREATE POLICY "Users can only view their own organization"
ON organizations
FOR SELECT
TO authenticated
USING (
  id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can only UPDATE their own organization (admin/owner only)
CREATE POLICY "Users can only update their own organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'owner')
)
WITH CHECK (
  id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'owner')
);

