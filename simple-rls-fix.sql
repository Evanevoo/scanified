-- Simple RLS fix for organization_join_codes
-- This allows any authenticated user to read join codes for validation

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view organization join codes" ON organization_join_codes;

-- Create new policy that allows any authenticated user to read join codes for validation
-- This is safe because join codes are meant to be shared and used by new users
CREATE POLICY "Authenticated users can read join codes for validation" 
ON organization_join_codes 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Keep the restrictive policies for INSERT/UPDATE/DELETE
-- Only organization members can create/manage codes
DROP POLICY IF EXISTS "Organization members can manage join codes" ON organization_join_codes;

CREATE POLICY "Organization members can create join codes" 
ON organization_join_codes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = organization_join_codes.organization_id
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

CREATE POLICY "Organization members can update join codes" 
ON organization_join_codes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = organization_join_codes.organization_id
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

CREATE POLICY "Organization members can delete join codes" 
ON organization_join_codes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = organization_join_codes.organization_id
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);
