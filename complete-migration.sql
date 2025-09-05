-- Organization Join Codes Migration
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Create the organization_join_codes table
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

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_code ON organization_join_codes(code);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_org_id ON organization_join_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_active ON organization_join_codes(is_active, expires_at);

-- Step 3: Create PostgreSQL functions

-- Function to generate unique 6-digit numeric code
CREATE OR REPLACE FUNCTION generate_numeric_join_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        IF NOT EXISTS (
            SELECT 1 FROM organization_join_codes ojc
            WHERE ojc.code = new_code 
            AND ojc.is_active = true 
            AND ojc.expires_at > NOW()
        ) THEN
            RETURN new_code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT);

-- Function to create a new join code
CREATE OR REPLACE FUNCTION create_organization_join_code(
    p_organization_id UUID,
    p_created_by UUID,
    p_expires_hours INTEGER DEFAULT 24,
    p_max_uses INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(join_code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    new_code TEXT;
    expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
    new_code := generate_numeric_join_code();
    expiry_time := NOW() + (p_expires_hours || ' hours')::INTERVAL;
    
    INSERT INTO organization_join_codes (
        organization_id, code, created_by, expires_at, max_uses, notes
    ) VALUES (
        p_organization_id, new_code, p_created_by, expiry_time, p_max_uses, p_notes
    );
    
    RETURN QUERY SELECT new_code, expiry_time;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use a join code
CREATE OR REPLACE FUNCTION use_organization_join_code(
    p_code TEXT,
    p_used_by UUID
)
RETURNS TABLE(success BOOLEAN, organization_id UUID, message TEXT) AS $$
DECLARE
    code_record RECORD;
BEGIN
    SELECT * INTO code_record FROM organization_join_codes
    WHERE code = p_code AND is_active = true;
    
    IF code_record IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid join code';
        RETURN;
    END IF;
    
    IF code_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has expired';
        RETURN;
    END IF;
    
    IF code_record.current_uses >= code_record.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has already been used';
        RETURN;
    END IF;
    
    UPDATE organization_join_codes
    SET current_uses = current_uses + 1,
        used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END,
        used_by = CASE WHEN used_by IS NULL THEN p_used_by ELSE used_by END,
        is_active = CASE WHEN (current_uses + 1) >= max_uses THEN false ELSE is_active END
    WHERE id = code_record.id;
    
    RETURN QUERY SELECT true, code_record.organization_id, 'Join code validated successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to get active codes for an organization
CREATE OR REPLACE FUNCTION get_organization_join_codes(p_organization_id UUID)
RETURNS TABLE(
    id UUID, code TEXT, created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, created_by_name TEXT,
    current_uses INTEGER, max_uses INTEGER, is_active BOOLEAN, notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ojc.id, ojc.code, ojc.created_at, ojc.expires_at,
           COALESCE(p.full_name, 'Unknown') as created_by_name,
           ojc.current_uses, ojc.max_uses, ojc.is_active, ojc.notes
    FROM organization_join_codes ojc
    LEFT JOIN profiles p ON ojc.created_by = p.id
    WHERE ojc.organization_id = p_organization_id
    ORDER BY ojc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired codes (maintenance)
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

-- Step 4: Enable Row Level Security
ALTER TABLE organization_join_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view organization join codes" ON organization_join_codes;
DROP POLICY IF EXISTS "Admins can create join codes" ON organization_join_codes;
DROP POLICY IF EXISTS "Admins can update join codes" ON organization_join_codes;
DROP POLICY IF EXISTS "Admins can delete join codes" ON organization_join_codes;

-- Users can view codes for their organization
CREATE POLICY "Users can view organization join codes" ON organization_join_codes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Admins can create codes
CREATE POLICY "Admins can create join codes" ON organization_join_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner' OR role = 'manager')
        )
    );

-- Admins can update codes
CREATE POLICY "Admins can update join codes" ON organization_join_codes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner' OR role = 'manager')
        )
    );

-- Admins can delete codes
CREATE POLICY "Admins can delete join codes" ON organization_join_codes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner' OR role = 'manager')
        )
    );

-- Step 5: Add helpful comments
COMMENT ON TABLE organization_join_codes IS 'One-time numeric codes for users to join organizations securely';
COMMENT ON FUNCTION generate_numeric_join_code() IS 'Generates a unique 6-digit numeric join code';
COMMENT ON FUNCTION create_organization_join_code(UUID, UUID, INTEGER, INTEGER, TEXT) IS 'Creates a new organization join code with expiration';
COMMENT ON FUNCTION use_organization_join_code(TEXT, UUID) IS 'Validates and consumes a join code';
COMMENT ON FUNCTION cleanup_expired_join_codes() IS 'Deactivates expired join codes for cleanup';

-- Step 6: Test the system with a sample code generation
-- (This will only work if you have at least one organization in your database)
DO $$
DECLARE
    test_org_id UUID;
    test_code_result RECORD;
BEGIN
    -- Get the first organization ID for testing
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    
    IF test_org_id IS NOT NULL THEN
        -- Generate a test code
        SELECT * INTO test_code_result 
        FROM generate_numeric_join_code();
        
        RAISE NOTICE 'Migration completed successfully!';
        RAISE NOTICE 'Test code generated: %', test_code_result;
        RAISE NOTICE 'You can now use the join codes system.';
    ELSE
        RAISE NOTICE 'Migration completed successfully!';
        RAISE NOTICE 'No organizations found for testing, but the system is ready.';
    END IF;
END $$;
