const { createClient } = require('@supabase/supabase-js');
const { handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { applyRateLimit } = require('./utils/rateLimit');
const { verifyAuth } = require('./utils/auth');

// Roles that can set another user's password in the same org (must align with manage:users permission)
const ADMIN_ROLES = ['admin', 'owner', 'administrator', 'manager'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(event, 405, { error: 'Method not allowed' });
  }

  const rateLimitResponse = applyRateLimit(event, 'admin-set-password', 'write');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createErrorResponse(event, 500, 'Service configuration error');
  }

  try {
    const user = await verifyAuth(event);
    if (!user) {
      return createResponse(event, 401, { error: 'Authentication required' });
    }

    const { userId, newPassword } = JSON.parse(event.body || '{}');
    if (!userId || typeof newPassword !== 'string') {
      return createResponse(event, 400, { error: 'Missing userId or newPassword' });
    }

    const password = newPassword.trim();
    if (password.length < 6) {
      return createResponse(event, 400, { error: 'Password must be at least 6 characters' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: requesterProfile, error: reqErr } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (reqErr || !requesterProfile) {
      return createResponse(event, 403, { error: 'Your profile could not be verified' });
    }

    const role = (requesterProfile.role || '').toLowerCase();
    if (!ADMIN_ROLES.includes(role)) {
      return createResponse(event, 403, { error: 'Only admins can set user passwords' });
    }

    const { data: targetProfile, error: targetErr } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (targetErr || !targetProfile) {
      return createResponse(event, 404, { error: 'User not found' });
    }

    if (targetProfile.organization_id !== requesterProfile.organization_id) {
      return createResponse(event, 403, { error: 'You can only set passwords for users in your organization' });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password
    });

    if (updateErr) {
      console.error('Admin set password error:', updateErr.message);
      return createErrorResponse(event, 500, 'Failed to set password', updateErr);
    }

    return createResponse(event, 200, { success: true, message: 'Password updated successfully' });
  } catch (err) {
    return createErrorResponse(event, 500, 'Failed to set password', err);
  }
};
