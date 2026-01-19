const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { applyRateLimit } = require('./utils/rateLimit');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return createResponse(event, 405, { error: 'Method not allowed' });
  }

  // Apply rate limiting (delete operations are sensitive)
  const rateLimitResponse = applyRateLimit(event, 'delete-user', 'delete');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check configuration
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createErrorResponse(event, 500, 'Service configuration error');
  }

  try {
    const { userId, organizationId, requesterId } = JSON.parse(event.body || '{}');

    if (!userId || !organizationId) {
      return createResponse(event, 400, { error: 'Missing userId or organizationId' });
    }

    // Log for auditing (without sensitive details)
    console.log('Delete user request:', { userId: userId.substring(0, 8) + '...', organizationId: organizationId.substring(0, 8) + '...' });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First, verify the user exists and belongs to the organization
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, organization_id')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingProfile) {
      console.error('User not found or does not belong to organization:', checkError);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'User not found or does not belong to this organization',
          details: checkError?.message 
        })
      };
    }

    console.log('User found, proceeding with deletion');

    // Delete from auth (this may fail if user doesn't exist in auth, but that's okay)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('Auth deletion warning:', authError.code);
      // Continue anyway - the profile deletion is more important
    } else {
      console.log('Auth user deleted');
    }

    // Delete profile (this is the critical step)
    const { data: deletedProfile, error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .select();

    if (profileError) {
      console.error('Profile deletion error code:', profileError.code);
      throw new Error('Failed to delete user profile');
    }

    if (!deletedProfile || deletedProfile.length === 0) {
      console.warn('No profile deleted - may already be removed');
      return createResponse(event, 404, { 
        error: 'User not found or already deleted'
      });
    }

    console.log('Profile deleted successfully');

    return createResponse(event, 200, { 
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return createErrorResponse(event, 500, 'Failed to delete user', error);
  }
};

