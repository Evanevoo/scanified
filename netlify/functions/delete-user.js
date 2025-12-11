const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Supabase credentials not configured for delete-user function'
      })
    };
  }

  try {
    const { userId, organizationId } = JSON.parse(event.body || '{}');

    if (!userId || !organizationId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing userId or organizationId' })
      };
    }

    console.log('Deleting user:', { userId, organizationId });

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

    console.log('Found user to delete:', existingProfile.email);

    // Delete from auth (this may fail if user doesn't exist in auth, but that's okay)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('Auth deletion warning (user may not exist in auth):', authError.message);
      // Continue anyway - the profile deletion is more important
    } else {
      console.log('Successfully deleted user from auth');
    }

    // Delete profile (this is the critical step)
    const { data: deletedProfile, error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .select();

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      throw new Error(`Failed to delete profile: ${profileError.message} (Code: ${profileError.code})`);
    }

    if (!deletedProfile || deletedProfile.length === 0) {
      console.warn('No profile was deleted - user may have already been deleted');
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'User profile not found or already deleted',
          warning: 'User may have already been removed'
        })
      };
    }

    console.log('Successfully deleted profile:', deletedProfile);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'User deleted successfully',
        deletedUser: {
          id: userId,
          email: existingProfile.email
        }
      })
    };
  } catch (error) {
    console.error('delete-user error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message || 'Failed to delete user',
        details: error.stack
      })
    };
  }
};

