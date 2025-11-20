-- Create the create_organization_join_code function
-- This function generates a unique 6-digit join code for an organization

-- First, ensure the assigned_role column exists in organization_join_codes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_join_codes' 
        AND column_name = 'assigned_role'
    ) THEN
        ALTER TABLE organization_join_codes 
        ADD COLUMN assigned_role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added assigned_role column to organization_join_codes table.';
    END IF;
END
$$;

-- Drop existing functions if they exist (with different signatures)
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID);
DROP FUNCTION IF EXISTS generate_numeric_join_code();

-- First, create a helper function to generate unique 6-digit numeric codes
CREATE OR REPLACE FUNCTION generate_numeric_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 6-digit code
        v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM organization_join_codes WHERE code = v_code) INTO v_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$;

-- Create the main function to create organization join codes
CREATE OR REPLACE FUNCTION create_organization_join_code(
    p_organization_id UUID,
    p_created_by UUID,
    p_expires_hours INTEGER DEFAULT 24,
    p_max_uses INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL,
    p_assigned_role TEXT DEFAULT 'user'
)
RETURNS TABLE(
    id UUID,
    join_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    assigned_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_code_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate unique 6-digit code
    v_code := generate_numeric_join_code();
    
    -- Calculate expiration time
    v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
    
    -- Insert the join code
    INSERT INTO organization_join_codes (
        organization_id,
        code,
        created_by,
        expires_at,
        max_uses,
        current_uses,
        notes,
        assigned_role,
        is_active
    )
    VALUES (
        p_organization_id,
        v_code,
        p_created_by,
        v_expires_at,
        p_max_uses,
        0,
        p_notes,
        p_assigned_role,
        true
    );
    
    -- Get the inserted row's ID by querying the table
    SELECT organization_join_codes.id INTO v_code_id
    FROM organization_join_codes
    WHERE organization_join_codes.code = v_code
      AND organization_join_codes.organization_id = p_organization_id
    ORDER BY organization_join_codes.created_at DESC
    LIMIT 1;
    
    -- Return the result using the variables we have
    RETURN QUERY
    SELECT 
        v_code_id,
        v_code,
        v_expires_at,
        p_assigned_role;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_numeric_join_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION generate_numeric_join_code IS 'Generates a unique 6-digit numeric join code';
COMMENT ON FUNCTION create_organization_join_code IS 'Creates a new organization join code and returns the code details';

