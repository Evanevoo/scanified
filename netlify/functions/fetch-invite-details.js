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
      if (!profilePayload) {
        return createResponse(event, 400, { error: 'Missing profile data for acceptance' });
      }

      // Normalize profile: profiles table uses full_name; accept name or full_name from client
      const profile = {
        id: profilePayload.id,
        email: profilePayload.email,
        full_name: profilePayload.full_name || profilePayload.name || '',
        organization_id: profilePayload.organization_id,
        role: profilePayload.role,
        is_active: profilePayload.is_active !== false,
        deleted_at: profilePayload.deleted_at ?? null,
        disabled_at: profilePayload.disabled_at ?? null
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        return createErrorResponse(event, 500, 'Failed to create profile. Please try again.', profileError);
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

