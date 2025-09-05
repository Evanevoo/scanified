-- Fix RLS policies for organization_join_codes to allow validation by any authenticated user

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

-- Also update the get_organization_join_codes function to work with the new policy
-- First drop the existing function
DROP FUNCTION IF EXISTS get_organization_join_codes(UUID);

CREATE OR REPLACE FUNCTION get_organization_join_codes(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER,
  is_active BOOLEAN,
  notes TEXT,
  created_by_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view codes for this organization
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = p_organization_id
    AND profiles.role IN ('admin', 'manager', 'owner')
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view join codes for this organization';
  END IF;

  RETURN QUERY
  SELECT 
    ojc.id,
    ojc.code,
    ojc.organization_id,
    ojc.created_by,
    ojc.created_at,
    ojc.expires_at,
    ojc.max_uses,
    ojc.current_uses,
    ojc.is_active,
    ojc.notes,
    COALESCE(p.full_name, p.email, 'Unknown') as created_by_name
  FROM organization_join_codes ojc
  LEFT JOIN profiles p ON p.id = ojc.created_by
  WHERE ojc.organization_id = p_organization_id
  ORDER BY ojc.created_at DESC;
END;
$$;
