-- Quick RLS Fix for Customer Import Issues
-- Copy and paste this into your Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create customers for their organization" ON customers;

-- Create a more permissive INSERT policy
CREATE POLICY "Users can create customers for their organization" ON customers
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Allow if user has organization_id and it matches
    (
      organization_id = (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
    OR
    -- Allow if user is an owner (full access)
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'owner'
      )
    )
  );

-- Test the fix
SELECT 
  p.id as user_id,
  p.email,
  p.role,
  p.organization_id,
  o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid(); 