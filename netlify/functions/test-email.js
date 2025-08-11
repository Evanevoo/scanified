const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to } = JSON.parse(event.body);

    // Check environment variables
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Supabase email service not configured',
          details: {
            SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
          }
        })
      };
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test email using Supabase's built-in email functionality
    // We'll use signup confirmation which doesn't require the user to exist
    console.log('Attempting to send test email to:', to);
    
    // Try signup confirmation (works even if user doesn't exist)
    const { error: signupError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: to,
      options: {
        redirectTo: `${process.env.SITE_URL || 'https://scanified1.netlify.app'}/confirm-signup`
      }
    });

    if (signupError) {
      console.error('Signup confirmation email failed:', signupError);
      
      // Try magic link as fallback
      const { error: magicError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: to,
        options: {
          redirectTo: `${process.env.SITE_URL || 'https://scanified1.netlify.app'}/magic-link`
        }
      });

      if (magicError) {
        console.error('Magic link email also failed:', magicError);
        
        let errorMessage = 'Failed to send test email via Supabase';
        if (signupError.message.includes('SMTP') || magicError.message.includes('SMTP')) {
          errorMessage = 'Supabase SMTP not configured. Please configure SMTP in Supabase Dashboard → Authentication → Settings → Email';
        } else if (signupError.message.includes('rate limit') || magicError.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
        } else {
          errorMessage = `Supabase email error: ${signupError.message || magicError.message}`;
        }

        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: errorMessage,
            details: {
              signupError: signupError.message,
              magicError: magicError.message,
              recommendation: 'Configure SMTP in Supabase Dashboard → Authentication → Settings → Email'
            },
            code: signupError.status || magicError.status || 'UNKNOWN'
          })
        };
      }
    }

    console.log('Supabase email test sent successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully via Supabase!',
        to: to,
        service: 'Supabase',
        note: 'If you don\'t receive the email, check Supabase SMTP configuration in Dashboard → Authentication → Settings → Email'
      })
    };

  } catch (error) {
    console.error('Test email error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send test email',
        details: error.message,
        code: 'UNKNOWN'
      })
    };
  }
};