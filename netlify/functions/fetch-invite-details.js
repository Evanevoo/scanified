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

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return createResponse(event, 410, { error: 'Invite expired' });
    }

    if (shouldAccept) {
      if (!profilePayload) {
        return createResponse(event, 400, { error: 'Missing profile data for acceptance' });
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        throw profileError;
      }

      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invite_token', token);

      if (acceptError) {
        throw acceptError;
      }

      return createResponse(event, 200, { invite: data, accepted: true });
    } else {
      return createResponse(event, 200, { invite: data });
    }
  } catch (err) {
    return createErrorResponse(event, 500, 'Unexpected error processing invite', err);
  }
};

