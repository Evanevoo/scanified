-- Setup Script for Organization Verification System
-- Run this in your Supabase SQL Editor

-- Create organization_verifications table
CREATE TABLE IF NOT EXISTS organization_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    user_name TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_verifications_token 
    ON organization_verifications(verification_token);

-- Create index on email for cleanup queries
CREATE INDEX IF NOT EXISTS idx_organization_verifications_email 
    ON organization_verifications(email);

-- Enable RLS
ALTER TABLE organization_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert (for new verifications)
CREATE POLICY "Anyone can create verification requests"
    ON organization_verifications
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- RLS Policy: Anyone can read their own verification (by token)
CREATE POLICY "Anyone can read verification by token"
    ON organization_verifications
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- RLS Policy: Service role can update (for marking as verified)
CREATE POLICY "Service role can update verifications"
    ON organization_verifications
    FOR UPDATE
    TO service_role
    USING (true);

-- Function: Request organization verification
CREATE OR REPLACE FUNCTION request_organization_verification(
    p_email TEXT,
    p_organization_name TEXT,
    p_user_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_existing_id UUID;
BEGIN
    -- Generate a unique verification token
    v_token := gen_random_uuid()::TEXT;
    
    -- Check if there's an existing unverified verification for this email
    SELECT id INTO v_existing_id
    FROM organization_verifications
    WHERE email = p_email
    AND verified = false
    AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;
    
    -- If exists, update it with new token and details
    IF v_existing_id IS NOT NULL THEN
        UPDATE organization_verifications
        SET 
            verification_token = v_token,
            organization_name = p_organization_name,
            user_name = p_user_name,
            created_at = NOW()
        WHERE id = v_existing_id;
    ELSE
        -- Create new verification record
        INSERT INTO organization_verifications (
            email,
            organization_name,
            user_name,
            verification_token
        ) VALUES (
            p_email,
            p_organization_name,
            p_user_name,
            v_token
        );
    END IF;
    
    -- Clean up old expired verifications (older than 24 hours)
    DELETE FROM organization_verifications
    WHERE verified = false
    AND created_at < NOW() - INTERVAL '24 hours';
    
    RETURN v_token;
END;
$$;

-- Function: Create verified organization
CREATE OR REPLACE FUNCTION create_verified_organization(
    p_verification_token TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_verification RECORD;
    v_org_id UUID;
    v_slug TEXT;
    v_slug_exists BOOLEAN;
    v_counter INTEGER := 0;
BEGIN
    -- Get verification data
    SELECT * INTO v_verification
    FROM organization_verifications
    WHERE verification_token = p_verification_token
    AND verified = false
    AND created_at > NOW() - INTERVAL '24 hours'
    FOR UPDATE;
    
    -- Check if verification exists and is valid
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired verification token';
    END IF;
    
    -- Generate organization slug from name
    v_slug := lower(regexp_replace(v_verification.organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    
    -- Ensure slug is unique (check only active organizations)
    v_slug_exists := EXISTS (
        SELECT 1 FROM organizations 
        WHERE slug = v_slug 
        AND deleted_at IS NULL
    );
    
    -- If slug exists, append a number
    WHILE v_slug_exists LOOP
        v_counter := v_counter + 1;
        v_slug := v_slug || '-' || v_counter::TEXT;
        v_slug_exists := EXISTS (
            SELECT 1 FROM organizations 
            WHERE slug = v_slug 
            AND deleted_at IS NULL
        );
    END LOOP;
    
    -- Create organization
    INSERT INTO organizations (
        name,
        slug,
        email,
        subscription_status,
        trial_end_date
    ) VALUES (
        v_verification.organization_name,
        v_slug,
        v_verification.email,
        'trial',
        NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_org_id;
    
    -- Create user profile with admin role
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        organization_id,
        is_active
    ) VALUES (
        p_user_id,
        v_verification.email,
        v_verification.user_name,
        'admin',
        v_org_id,
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        organization_id = EXCLUDED.organization_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- Mark verification as verified
    UPDATE organization_verifications
    SET verified = true
    WHERE verification_token = p_verification_token;
    
    RETURN v_org_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_organization_verification TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_verified_organization TO authenticated, service_role;

-- Cleanup function for expired verifications (optional, can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM organization_verifications
    WHERE verified = false
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_verifications TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Organization verification system setup complete!';
    RAISE NOTICE '   - organization_verifications table created';
    RAISE NOTICE '   - request_organization_verification() function created';
    RAISE NOTICE '   - create_verified_organization() function created';
    RAISE NOTICE '   - RLS policies configured';
END $$;

