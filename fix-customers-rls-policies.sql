-- Fix RLS policies for customers table to resolve import issues
-- This script addresses the "new row violates row-level security policy" error

-- First, let's check the current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'customers';

-- Temporarily disable RLS for troubleshooting (optional)
-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for customers table
DROP POLICY IF EXISTS "Users can view their organization's customers" ON customers;
DROP POLICY IF EXISTS "Users can create customers for their organization" ON customers;
DROP POLICY IF EXISTS "Users can update their organization's customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their organization's customers" ON customers;
DROP POLICY IF EXISTS "Owners can view all customers" ON customers;
DROP POLICY IF EXISTS "Owners can manage all customers" ON customers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON customers;

-- Create new, more permissive policies for customers table

-- 1. SELECT Policy: Users can view customers from their organization
CREATE POLICY "Users can view their organization's customers" ON customers
  FOR SELECT 
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- 2. INSERT Policy: Users can create customers for their organization
CREATE POLICY "Users can create customers for their organization" ON customers
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- 3. UPDATE Policy: Users can update customers in their organization
CREATE POLICY "Users can update their organization's customers" ON customers
  FOR UPDATE 
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- 4. DELETE Policy: Users can delete customers in their organization
CREATE POLICY "Users can delete their organization's customers" ON customers
  FOR DELETE 
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Verify the new policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;

-- Test the policy by checking current user's organization and permissions
SELECT 
  p.id as user_id,
  p.email,
  p.role,
  p.organization_id,
  o.name as organization_name,
  CASE 
    WHEN p.role = 'owner' THEN 'Can access all customers'
    WHEN p.organization_id IS NOT NULL THEN 'Can access organization customers'
    ELSE 'Limited access'
  END as access_level
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();

-- Check if there are any customers in the current user's organization
SELECT 
  COUNT(*) as customer_count,
  organization_id
FROM customers
WHERE organization_id = (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid()
)
GROUP BY organization_id;

-- Test customer creation with current user's organization
DO $$
DECLARE
  user_org_id UUID;
  test_customer_id TEXT;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO user_org_id
  FROM profiles 
  WHERE id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RAISE NOTICE 'Current user has no organization_id assigned';
  ELSE
    RAISE NOTICE 'Current user organization_id: %', user_org_id;
    
    -- Try to create a test customer
    test_customer_id := 'TEST-' || extract(epoch from now())::text;
    
    INSERT INTO customers (CustomerListID, name, organization_id)
    VALUES (test_customer_id, 'Test Customer', user_org_id);
    
    RAISE NOTICE 'Successfully created test customer: %', test_customer_id;
    
    -- Clean up test customer
    DELETE FROM customers WHERE CustomerListID = test_customer_id;
    
    RAISE NOTICE 'Test customer cleaned up';
  END IF;
END $$;

-- Additional debugging: Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('id', 'organization_id', 'role')
ORDER BY ordinal_position;

-- Additional debugging: Check organizations table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('id', 'name')
ORDER BY ordinal_position; 