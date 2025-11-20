const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Supabase service role not configured'
        })
      };
    }

    const { token } = JSON.parse(event.body || '{}');

    const shouldAccept = payload.accept;
    const profilePayload = payload.profile || null;

    if (!token) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing invite token' })
      };
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
      console.error('Error fetching invite via function:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Failed to fetch invite',
          details: error.message || error.details || error
        })
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invite not found' })
      };
    }

    if (data.accepted_at) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invite already accepted' })
      };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        statusCode: 410,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invite expired' })
      };
    }

    if (shouldAccept) {
      if (!profilePayload) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing profile payload for acceptance' })
        };
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

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ invite: data, accepted: true })
      };
    } else {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ invite: data })
      };
    }
  } catch (err) {
    console.error('Unhandled error fetching invite:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Unexpected error' })
    };
  }
};

