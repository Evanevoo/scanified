/**
 * Authentication utility for Netlify functions.
 * Verifies Supabase JWT tokens from the Authorization header.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify the Authorization header contains a valid Supabase JWT.
 * Returns the authenticated user object or null.
 */
async function verifyAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Auth] Missing Supabase configuration');
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Middleware-style wrapper: returns a 401 response if auth fails,
 * otherwise returns null (caller should proceed).
 */
function requireAuth(event, headers) {
  return async () => {
    const user = await verifyAuth(event);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }
    return { user };
  };
}

module.exports = { verifyAuth, requireAuth };
