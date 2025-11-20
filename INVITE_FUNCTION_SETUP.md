# Invite Function Setup Guide

## Problem
When accepting an invitation, you may see the error:
> "Unable to verify invite link due to permissions. Please contact the person who sent you the invite, or ask them to run the SQL function: get_invite_by_token"

## Solution

The `get_invite_by_token` function needs to be created in your Supabase database. This function bypasses Row Level Security (RLS) so unauthenticated users can verify invite tokens.

### Option 1: Run the Migration (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/create_get_invite_by_token_function.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`

### Option 2: Manual Setup

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Function to validate and get invite details by token
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO service_role;
```

### Verify It Works

After running the migration, test by:
1. Creating a new invite
2. Clicking the invite link
3. You should no longer see the permission error

## Fallback

If the function still doesn't work, the system will automatically fall back to:
1. **Netlify Function** (uses service role, bypasses RLS) - This should work if your Netlify environment variables are set
2. **Direct Query** (only works if user is authenticated)

## Troubleshooting

- **Function doesn't exist**: Make sure you ran the SQL migration
- **Permission denied**: Check that the GRANT statements were executed
- **Still getting errors**: Check that your Netlify function has `SUPABASE_SERVICE_ROLE_KEY` set in environment variables

