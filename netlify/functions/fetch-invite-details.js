const { createClient } = require('@supabase/supabase-js');
const { handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { applyRateLimit } = require('./utils/rateLimit');

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return createResponse(event, 405, { error: 'Method not allowed' });
  }

  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(event, 'fetch-invite', 'read');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return createErrorResponse(event, 500, 'Service configuration error');
    }

    const payload = JSON.parse(event.body || '{}');
    const { token } = payload;

    const shouldAccept = payload.accept;
    const profilePayload = payload.profile || null;

    // Validate token format
    if (!token || typeof token !== 'string' || token.length < 10) {
      return createResponse(event, 400, { error: 'Invalid invite token' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('organization_invites')
      .select(`
        *,
        organizations(name)
      `)
      .eq('invite_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invite:', error.code);
      return createErrorResponse(event, 500, 'Failed to fetch invite', error);
    }

    if (!data) {
      return createResponse(event, 404, { error: 'Invite not found' });
    }

    if (data.accepted_at) {
      return createResponse(event, 409, { error: 'Invite already accepted' });
    }

    // Only treat as expired if we have a valid future check (avoid timezone/clock issues)
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
        return createResponse(event, 410, { error: 'Invite expired' });
      }
    }

    if (shouldAccept) {
      if (!profilePayload || typeof profilePayload !== 'object') {
        return createResponse(event, 400, { error: 'Missing profile data for acceptance' });
      }
      if (!profilePayload.id || !profilePayload.email || profilePayload.organization_id == null) {
        return createResponse(event, 400, {
          error: 'Invalid profile data: id, email, and organization_id are required'
        });
      }

      // Normalize profile: profiles table uses full_name; accept name or full_name from client.
      // Invite role can be a role name (e.g. 'Member') or a role_id UUID from UserManagement.
      const roleValue = profilePayload.role ?? 'user';
      const isRoleUuid = typeof roleValue === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleValue);
      let roleForProfile = roleValue;
      if (isRoleUuid) {
        const { data: roleRow } = await supabase.from('roles').select('name').eq('id', roleValue).maybeSingle();
        if (roleRow?.name) roleForProfile = roleRow.name;
      }
      const profile = {
        id: profilePayload.id,
        email: String(profilePayload.email).trim().toLowerCase(),
        full_name: (profilePayload.full_name ?? profilePayload.name ?? '').trim() || null,
        organization_id: profilePayload.organization_id,
        role: roleForProfile,
        is_active: profilePayload.is_active !== false,
        deleted_at: profilePayload.deleted_at ?? null,
        disabled_at: profilePayload.disabled_at ?? null
      };
      if (isRoleUuid) {
        profile.role_id = roleValue;
      } else if (profilePayload.role_id) {
        profile.role_id = profilePayload.role_id;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile upsert error:', profileError.code, profileError.message, profileError.details);
        const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
        const userMessage = 'Failed to create profile. Please try again.';
        const body = { error: userMessage, success: false };
        if (!isProduction && profileError) {
          body.details = profileError.message;
          body.code = profileError.code;
          if (profileError.details) body.hint = profileError.details;
        }
        return createResponse(event, 500, body);
      }

      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invite_token', token);

      if (acceptError) {
        console.error('Invite accept update error:', acceptError);
        return createErrorResponse(event, 500, 'Failed to complete invite acceptance.', acceptError);
      }

      return createResponse(event, 200, { invite: data, accepted: true });
    } else {
      return createResponse(event, 200, { invite: data });
    }
  } catch (err) {
    console.error('fetch-invite-details unexpected error:', err);
    return createErrorResponse(event, 500, err.message || 'Unexpected error processing invite', err);
  }
};

