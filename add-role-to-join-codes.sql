-- Add role field to organization_join_codes table
ALTER TABLE organization_join_codes 
ADD COLUMN IF NOT EXISTS assigned_role TEXT DEFAULT 'user';

-- Update existing codes to have 'user' role
UPDATE organization_join_codes 
SET assigned_role = 'user' 
WHERE assigned_role IS NULL;

-- Update the create_organization_join_code function to include role
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION create_organization_join_code(
  p_organization_id UUID,
  p_created_by UUID,
  p_expires_hours INTEGER DEFAULT 24,
  p_max_uses INTEGER DEFAULT 1,
  p_notes TEXT DEFAULT NULL,
  p_assigned_role TEXT DEFAULT 'user'
)
RETURNS TABLE (
  join_code TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  assigned_role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate a unique numeric code
  SELECT * INTO new_code FROM generate_numeric_join_code();
  
  -- Insert the new join code
  INSERT INTO organization_join_codes (
    code,
    organization_id,
    created_by,
    expires_at,
    max_uses,
    notes,
    assigned_role
  ) VALUES (
    new_code,
    p_organization_id,
    p_created_by,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    p_max_uses,
    p_notes,
    p_assigned_role
  );
  
  -- Return the created code details
  RETURN QUERY
  SELECT 
    new_code,
    (NOW() + (p_expires_hours || ' hours')::INTERVAL)::TIMESTAMPTZ,
    p_max_uses,
    p_assigned_role;
END;
$$;

-- Update the use_organization_join_code function to use the assigned role
DROP FUNCTION IF EXISTS use_organization_join_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION use_organization_join_code(
  p_code TEXT,
  p_used_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  organization_id UUID,
  assigned_role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record RECORD;
  org_id UUID;
  user_role TEXT;
BEGIN
  -- Find and validate the join code
  SELECT * INTO code_record
  FROM organization_join_codes 
  WHERE code = p_code 
    AND is_active = true 
    AND expires_at > NOW()
    AND current_uses < max_uses;
  
  -- Check if code exists and is valid
  IF code_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid join code'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Update usage count
  UPDATE organization_join_codes 
  SET current_uses = current_uses + 1,
      used_at = NOW()
  WHERE code = p_code;
  
  -- Get the assigned role from the code
  user_role := code_record.assigned_role;
  org_id := code_record.organization_id;
  
  -- Return success with organization and role info
  RETURN QUERY SELECT true, 'Join code validated successfully'::TEXT, org_id, user_role;
END;
$$;

-- Update the get_organization_join_codes function to include role
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
  assigned_role TEXT,
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
    ojc.assigned_role,
    COALESCE(p.full_name, p.email, 'Unknown') as created_by_name
  FROM organization_join_codes ojc
  LEFT JOIN profiles p ON p.id = ojc.created_by
  WHERE ojc.organization_id = p_organization_id
  ORDER BY ojc.created_at DESC;
END;
$$;
