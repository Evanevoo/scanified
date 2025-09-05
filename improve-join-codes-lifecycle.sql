-- Improve join code lifecycle management
-- 1. Deactivate single-use codes after use
-- 2. Add cleanup for old inactive/expired codes

-- Update the use_organization_join_code function to deactivate single-use codes
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
  should_deactivate BOOLEAN := false;
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
  
  -- Check if this will be the last use (for single-use codes or reaching max uses)
  IF code_record.max_uses = 1 OR (code_record.current_uses + 1) >= code_record.max_uses THEN
    should_deactivate := true;
  END IF;
  
  -- Update usage count and potentially deactivate
  IF should_deactivate THEN
    UPDATE organization_join_codes 
    SET current_uses = current_uses + 1,
        used_at = NOW(),
        is_active = false  -- Deactivate after final use
    WHERE code = p_code;
  ELSE
    UPDATE organization_join_codes 
    SET current_uses = current_uses + 1,
        used_at = NOW()
    WHERE code = p_code;
  END IF;
  
  -- Get the assigned role from the code
  user_role := code_record.assigned_role;
  org_id := code_record.organization_id;
  
  -- Return success with organization and role info
  RETURN QUERY SELECT true, 'Join code validated successfully'::TEXT, org_id, user_role;
END;
$$;

-- Create a cleanup function to remove old inactive/expired codes
CREATE OR REPLACE FUNCTION cleanup_old_join_codes(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete codes that are:
  -- 1. Inactive AND older than specified days, OR
  -- 2. Expired for more than specified days
  DELETE FROM organization_join_codes
  WHERE 
    (is_active = false AND created_at < NOW() - (p_days_old || ' days')::INTERVAL)
    OR 
    (expires_at < NOW() - (p_days_old || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO system_logs (event_type, message, created_at)
  VALUES (
    'join_code_cleanup',
    'Cleaned up ' || deleted_count || ' old join codes (older than ' || p_days_old || ' days)',
    NOW()
  ) ON CONFLICT DO NOTHING; -- In case system_logs table doesn't exist
  
  RETURN deleted_count;
END;
$$;

-- Create a function to manually cleanup codes (for admin use)
CREATE OR REPLACE FUNCTION admin_cleanup_join_codes(
  p_organization_id UUID DEFAULT NULL,
  p_days_old INTEGER DEFAULT 7
)
RETURNS TABLE (
  deleted_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  del_count INTEGER;
  where_clause TEXT;
BEGIN
  -- Check if user has admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.role IN ('admin', 'owner') 
      OR (p_organization_id IS NOT NULL AND profiles.organization_id = p_organization_id AND profiles.role IN ('admin', 'manager'))
    )
  ) THEN
    RETURN QUERY SELECT 0, 'Access denied: Admin permissions required'::TEXT;
    RETURN;
  END IF;

  -- Build the deletion query
  IF p_organization_id IS NOT NULL THEN
    -- Cleanup for specific organization
    DELETE FROM organization_join_codes
    WHERE organization_id = p_organization_id
      AND (
        (is_active = false AND created_at < NOW() - (p_days_old || ' days')::INTERVAL)
        OR 
        (expires_at < NOW() - (p_days_old || ' days')::INTERVAL)
      );
  ELSE
    -- Global cleanup (owner only)
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    ) THEN
      RETURN QUERY SELECT 0, 'Access denied: Owner permissions required for global cleanup'::TEXT;
      RETURN;
    END IF;
    
    DELETE FROM organization_join_codes
    WHERE 
      (is_active = false AND created_at < NOW() - (p_days_old || ' days')::INTERVAL)
      OR 
      (expires_at < NOW() - (p_days_old || ' days')::INTERVAL);
  END IF;
  
  GET DIAGNOSTICS del_count = ROW_COUNT;
  
  RETURN QUERY SELECT del_count, ('Cleaned up ' || del_count || ' old join codes')::TEXT;
END;
$$;

-- Add a used_at column to track when codes were last used (if not exists)
ALTER TABLE organization_join_codes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Create an index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_join_codes_cleanup 
ON organization_join_codes (is_active, created_at, expires_at);

-- Update existing codes to set used_at for codes that have been used
UPDATE organization_join_codes 
SET used_at = created_at 
WHERE current_uses > 0 AND used_at IS NULL;
