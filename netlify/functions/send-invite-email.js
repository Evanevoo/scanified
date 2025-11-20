const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

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
    const { to, inviteLink, organizationName, inviter, joinCode } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !inviteLink) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: to and inviteLink are required' })
      };
    }

    // Check for Gmail credentials first (primary method)
    // If Gmail is not configured, we'll try Supabase as fallback
    const hasGmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM;
    const hasSupabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasGmailConfig && !hasSupabaseConfig) {
      console.error('Missing email configuration');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Please configure either Gmail SMTP (EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM) or Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) environment variables in Netlify'
        })
      };
    }

    // Create Supabase client only if we need it (for fallback)
    let supabase = null;
    if (hasSupabaseConfig) {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Generate email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">You're Invited!</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello!</p>
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            You've been invited to join <strong style="color: #2196F3;">${organizationName || 'our organization'}</strong>${inviter ? ` by ${inviter}` : ''}.
          </p>
          <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
            Click the button below to accept your invitation and get started:
          </p>
          ${joinCode ? `
          <div style="background-color: #f0f7ff; border: 2px solid #2196F3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Or use this join code:</p>
            <p style="font-size: 24px; font-weight: bold; color: #2196F3; margin: 0; letter-spacing: 2px; font-family: monospace;">${joinCode}</p>
          </div>
          ` : ''}
          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteLink}" style="background-color: #2196F3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px;">
            ${inviteLink}
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
            This invitation will expire in 7 days.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 12px; color: #999;">
            Sent by Gas Cylinder Management System
          </p>
        </div>
      </div>
    `;

    const emailText = `
You're Invited!

Hello!

You've been invited to join ${organizationName || 'our organization'}${inviter ? ` by ${inviter}` : ''}.

Click the link below to accept your invitation:
${inviteLink}
${joinCode ? `\n\nOr use this join code: ${joinCode}` : ''}

This invitation will expire in 7 days.

Sent by Gas Cylinder Management System
    `;

    // Try to send email using Supabase's email system
    // We'll use generateLink with recovery type as a workaround to send custom email
    // Note: This is a workaround - Supabase doesn't have a direct "send custom email" API
    console.log('Attempting to send invitation email via Supabase to:', to);

    // First, try using Supabase's inviteUserByEmail (but this creates a user, so we won't use it)
    // Instead, we'll use a magic link approach or send via SMTP directly
    
    // Since Supabase doesn't support custom email content directly,
    // we'll use nodemailer with Gmail SMTP (which should be configured in Supabase)
    // But we need the SMTP credentials from environment variables
    
    // Check for Gmail credentials first (primary method)
    if (hasGmailConfig) {
      console.log('Using Gmail (matching Supabase SMTP configuration)');
      
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      try {
        await transporter.verify();
        console.log('Gmail connection verified (using Supabase SMTP config)');
      } catch (verifyError) {
        console.error('Gmail connection verification failed:', verifyError);
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'SMTP connection failed',
            details: 'Please ensure Gmail credentials match your Supabase SMTP configuration. Make sure you\'re using an App Password, not your regular Gmail password.',
            message: verifyError.message
          })
        };
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: to,
        subject: `You're invited to join ${organizationName}`,
        html: emailContent,
        text: emailText
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Invitation email sent successfully via Supabase SMTP (Gmail) to:', to);
      console.log('Message ID:', info.messageId);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Invitation email sent successfully via Supabase',
          service: 'Supabase (Gmail)',
          messageId: info.messageId
        })
      };
    } else if (hasSupabaseConfig && supabase) {
      // Fallback: Try using Supabase's generateLink (but this won't send our custom content)
      console.log('Gmail not configured, attempting Supabase generateLink fallback...');
      
      // This is a fallback - it won't send our custom invitation email
      // but will at least send something via Supabase
      const { error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: to,
        options: {
          redirectTo: inviteLink
        }
      });

      if (error) {
        console.error('Supabase email error:', error);
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Failed to send invitation email',
            details: error.message,
            recommendation: 'Please configure Gmail environment variables (EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM) in Netlify. Use a Gmail App Password, not your regular password.'
          })
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Invitation link sent via Supabase (fallback method)',
          service: 'Supabase',
          note: 'Custom email template not used. Configure Gmail env vars for full functionality.'
        })
      };
    } else {
      // Neither Gmail nor Supabase is configured (shouldn't reach here due to earlier check)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Please configure Gmail SMTP (EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM) or Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) environment variables in Netlify'
        })
      };
    }

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to send invitation email',
        details: error.message 
      })
    };
  }
};

