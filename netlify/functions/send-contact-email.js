const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, phone, company, message } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: name, email, and message are required' })
      };
    }

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Supabase email service not configured. Please contact administrator.',
          details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set'
        })
      };
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Generate email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">New Contact Form Submission</h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Contact Details:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
        </div>
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
          <h4>Message:</h4>
          <p>${message}</p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent via Gas Cylinder Management System Contact Form</p>
      </div>
    `;

    // Send email using Supabase's built-in email functionality
    console.log('Sending contact form email via Supabase to:', email);
    
    // We'll use the password reset email as a base and customize the redirect
    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.SITE_URL || 'https://scanified1.netlify.app'}/contact-confirmation`,
        data: {
          subject: 'Contact Form Submission Received',
          html: emailContent,
          template: 'contact'
        }
      }
    });

    if (error) {
      console.error('Supabase email error:', error);
      
      let errorMessage = 'Failed to send contact form email via Supabase';
      if (error.message.includes('SMTP')) {
        errorMessage = 'Supabase SMTP not configured. Please configure SMTP in Supabase Dashboard → Authentication → Settings → Email';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
      } else {
        errorMessage = `Supabase email error: ${error.message}`;
      }

      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: errorMessage,
          details: error.message,
          code: error.status || 'UNKNOWN'
        })
      };
    }

    console.log('Contact form email sent successfully via Supabase to:', email);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Contact form submitted successfully. We will get back to you soon!',
        service: 'Supabase'
      })
    };

  } catch (error) {
    console.error('Error sending contact form email:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to send contact form email',
        details: error.message 
      })
    };
  }
}; 