-- Function to validate and get invite details by token
-- This function bypasses RLS so it can be called by unauthenticated users
CREATE OR REPLACE FUNCTION get_invite_by_token(p_token TEXT)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    email TEXT,
    role TEXT,
    invite_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE,
    organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role,
        oi.invite_token,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        oi.invited_at,
        o.name as organization_name
    FROM organization_invites oi
    LEFT JOIN organizations o ON o.id = oi.organization_id
    WHERE oi.invite_token = p_token
      AND oi.accepted_at IS NULL
      AND oi.expires_at > NOW();
END;
$$;

-- Grant execute permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_invite_by_token IS 'Validates and returns invite details by token. Bypasses RLS for public access.';

