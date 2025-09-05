-- One-Time Organization Join Codes System
-- This creates a secure system where admins generate temporary numeric codes
-- that expire after use or after a set time period

-- Create the organization_join_codes table
CREATE TABLE IF NOT EXISTS organization_join_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE NULL,
    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_code ON organization_join_codes(code);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_org_id ON organization_join_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_active ON organization_join_codes(is_active, expires_at);

-- Function to generate a unique 6-digit numeric code
CREATE OR REPLACE FUNCTION generate_numeric_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Generate 6-digit code
        code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists and is active
        IF NOT EXISTS (
            SELECT 1 FROM organization_join_codes 
            WHERE code = code 
            AND is_active = true 
            AND expires_at > NOW()
        ) THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new join code
CREATE OR REPLACE FUNCTION create_organization_join_code(
    p_organization_id UUID,
    p_created_by UUID,
    p_expires_hours INTEGER DEFAULT 24,
    p_max_uses INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    new_code TEXT;
    expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate unique code
    new_code := generate_numeric_join_code();
    expiry_time := NOW() + (p_expires_hours || ' hours')::INTERVAL;
    
    -- Insert the new code
    INSERT INTO organization_join_codes (
        organization_id,
        code,
        created_by,
        expires_at,
        max_uses,
        notes
    ) VALUES (
        p_organization_id,
        new_code,
        p_created_by,
        expiry_time,
        p_max_uses,
        p_notes
    );
    
    RETURN QUERY SELECT new_code, expiry_time;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use a join code
CREATE OR REPLACE FUNCTION use_organization_join_code(
    p_code TEXT,
    p_used_by UUID
)
RETURNS TABLE(
    success BOOLEAN,
    organization_id UUID,
    message TEXT
) AS $$
DECLARE
    code_record RECORD;
BEGIN
    -- Find the code
    SELECT * INTO code_record
    FROM organization_join_codes
    WHERE code = p_code
    AND is_active = true;
    
    -- Check if code exists
    IF code_record IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid join code';
        RETURN;
    END IF;
    
    -- Check if code is expired
    IF code_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has expired';
        RETURN;
    END IF;
    
    -- Check if code has been used up
    IF code_record.current_uses >= code_record.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has already been used';
        RETURN;
    END IF;
    
    -- Use the code
    UPDATE organization_join_codes
    SET 
        current_uses = current_uses + 1,
        used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END,
        used_by = CASE WHEN used_by IS NULL THEN p_used_by ELSE used_by END,
        is_active = CASE WHEN (current_uses + 1) >= max_uses THEN false ELSE is_active END
    WHERE id = code_record.id;
    
    RETURN QUERY SELECT true, code_record.organization_id, 'Join code validated successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate expired codes (cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_join_codes()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE organization_join_codes
    SET is_active = false
    WHERE is_active = true
    AND expires_at < NOW();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active codes for an organization (admin view)
CREATE OR REPLACE FUNCTION get_organization_join_codes(p_organization_id UUID)
RETURNS TABLE(
    id UUID,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by_name TEXT,
    current_uses INTEGER,
    max_uses INTEGER,
    is_active BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ojc.id,
        ojc.code,
        ojc.created_at,
        ojc.expires_at,
        COALESCE(p.full_name, 'Unknown') as created_by_name,
        ojc.current_uses,
        ojc.max_uses,
        ojc.is_active,
        ojc.notes
    FROM organization_join_codes ojc
    LEFT JOIN profiles p ON ojc.created_by = p.id
    WHERE ojc.organization_id = p_organization_id
    ORDER BY ojc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE organization_join_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see codes for their organization
CREATE POLICY "Users can view organization join codes" ON organization_join_codes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Only admins can create codes
CREATE POLICY "Admins can create join codes" ON organization_join_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Policy: Only admins can update codes (deactivate)
CREATE POLICY "Admins can update join codes" ON organization_join_codes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Policy: Only admins can delete codes
CREATE POLICY "Admins can delete join codes" ON organization_join_codes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Create a view for easier querying
CREATE OR REPLACE VIEW active_join_codes AS
SELECT 
    ojc.id,
    ojc.organization_id,
    ojc.code,
    ojc.created_at,
    ojc.expires_at,
    ojc.current_uses,
    ojc.max_uses,
    ojc.notes,
    o.name as organization_name,
    p.full_name as created_by_name
FROM organization_join_codes ojc
JOIN organizations o ON ojc.organization_id = o.id
LEFT JOIN profiles p ON ojc.created_by = p.id
WHERE ojc.is_active = true
AND ojc.expires_at > NOW();

-- Example usage:
-- 1. Create a join code (as admin):
-- SELECT * FROM create_organization_join_code(
--     'your-org-uuid'::UUID,
--     'admin-user-uuid'::UUID,
--     24, -- expires in 24 hours
--     1,  -- single use
--     'Code for new employee John'
-- );

-- 2. Use a join code:
-- SELECT * FROM use_organization_join_code('123456', 'user-uuid'::UUID);

-- 3. View active codes for organization:
-- SELECT * FROM get_organization_join_codes('your-org-uuid'::UUID);

-- 4. Cleanup expired codes:
-- SELECT cleanup_expired_join_codes();

COMMENT ON TABLE organization_join_codes IS 'One-time numeric codes for users to join organizations securely';
COMMENT ON FUNCTION generate_numeric_join_code() IS 'Generates a unique 6-digit numeric join code';
COMMENT ON FUNCTION create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT) IS 'Creates a new organization join code with expiration';
COMMENT ON FUNCTION use_organization_join_code(TEXT, UUID) IS 'Validates and consumes a join code';
COMMENT ON FUNCTION cleanup_expired_join_codes() IS 'Deactivates expired join codes for cleanup';
