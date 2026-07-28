-- Function to get pending invites for an organization
-- This function bypasses RLS so organization admins can view invites

-- Drop the function if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS get_pending_invites(UUID);

CREATE OR REPLACE FUNCTION get_pending_invites(p_organization_id UUID)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    email TEXT,
    role TEXT,
    invite_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE
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
        oi.invited_at
    FROM organization_invites oi
    WHERE oi.organization_id = p_organization_id
      AND oi.accepted_at IS NULL
      AND oi.expires_at > NOW()
    ORDER BY oi.invited_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_invites(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_pending_invites IS 'Returns pending invites for an organization. Bypasses RLS for organization admins.';

