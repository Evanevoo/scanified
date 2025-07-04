-- Add email uniqueness constraint to profiles table
-- This ensures no duplicate emails can be registered

-- First, let's check if the profiles table exists and add the constraint
DO $$ 
BEGIN
    -- Add unique constraint on email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_email_key' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Create organization invites table for secure user registration
CREATE TABLE IF NOT EXISTS organization_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    invited_by uuid REFERENCES profiles(id),
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_organization_id ON organization_invites(organization_id);

-- Add RLS policies for organization_invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Organization owners can manage invites for their organization
CREATE POLICY "Organization owners can manage invites" ON organization_invites
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Users can view invites sent to their email
CREATE POLICY "Users can view their invites" ON organization_invites
    FOR SELECT USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Add function to generate invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS text AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to create organization invite
CREATE OR REPLACE FUNCTION create_organization_invite(
    p_organization_id uuid,
    p_email text,
    p_role text DEFAULT 'user',
    p_expires_in_days integer DEFAULT 7
)
RETURNS uuid AS $$
DECLARE
    invite_id uuid;
    invite_token text;
BEGIN
    -- Check if user has permission to invite (must be owner of the organization)
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND organization_id = p_organization_id 
        AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only organization owners can invite users';
    END IF;

    -- Generate unique token
    invite_token := generate_invite_token();
    
    -- Create invite
    INSERT INTO organization_invites (
        organization_id, 
        email, 
        role, 
        invited_by, 
        token, 
        expires_at
    ) VALUES (
        p_organization_id,
        p_email,
        p_role,
        auth.uid(),
        invite_token,
        now() + (p_expires_in_days || ' days')::interval
    ) RETURNING id INTO invite_id;

    RETURN invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to accept organization invite
CREATE OR REPLACE FUNCTION accept_organization_invite(p_token text)
RETURNS boolean AS $$
DECLARE
    invite_record organization_invites%ROWTYPE;
BEGIN
    -- Get invite details
    SELECT * INTO invite_record 
    FROM organization_invites 
    WHERE token = p_token 
    AND expires_at > now() 
    AND accepted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite token';
    END IF;

    -- Update user's organization and role
    UPDATE profiles 
    SET organization_id = invite_record.organization_id,
        role = invite_record.role,
        updated_at = now()
    WHERE id = auth.uid();

    -- Mark invite as accepted
    UPDATE organization_invites 
    SET accepted_at = now() 
    WHERE id = invite_record.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 