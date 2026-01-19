const nodemailer = require('nodemailer');
const { templates } = require('./email-templates');

// Allowed origins for CORS - only allow requests from these domains
const ALLOWED_ORIGINS = [
  'https://www.scanified.com',
  'https://scanified.com',
  'https://app.scanified.com',
  // Allow localhost for development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8888'
];

// Get CORS origin based on request
function getCorsOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  
  // In development, allow the origin if it's localhost
  if (process.env.NODE_ENV === 'development' || process.env.CONTEXT === 'dev') {
    if (origin.includes('localhost')) {
      return origin;
    }
  }
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  // Default to main domain for security
  return 'https://www.scanified.com';
}

exports.handler = async (event, context) => {
  const corsOrigin = getCorsOrigin(event);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, inviteLink, organizationName, inviter, inviterName, joinCode } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !inviteLink) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: to and inviteLink are required' })
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid email address format' })
      };
    }

    // Check which email service is configured
    let transporter;
    let emailService = 'Unknown';

    // TLS configuration - verify certificates in production for security
    const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
    const tlsConfig = {
      rejectUnauthorized: isProduction,
      minVersion: 'TLSv1.2'
    };

    // Try SMTP2GO first (primary service)
    if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM) {
      console.log('Using SMTP2GO email service');
      transporter = nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 2525,
        secure: false,
        auth: {
          user: process.env.SMTP2GO_USER,
          pass: process.env.SMTP2GO_PASSWORD
        },
        tls: tlsConfig
      });
      emailService = 'SMTP2GO';
    }
    // Try Gmail if SMTP2GO not configured
    else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM) {
      console.log('Using Gmail email service');
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: tlsConfig
      });
      emailService = 'Gmail';
    }
    // Fallback to Outlook if neither SMTP2GO nor Gmail configured
    else if (process.env.OUTLOOK_USER && process.env.OUTLOOK_PASSWORD && process.env.OUTLOOK_FROM) {
      console.log('Using Outlook email service');
      transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.OUTLOOK_USER,
          pass: process.env.OUTLOOK_PASSWORD
        },
        tls: {
          ...tlsConfig,
          ciphers: 'SSLv3'
        }
      });
      emailService = 'Outlook';
    }
    // No email service configured
    else {
      console.error('No email service configured');
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Please configure SMTP2GO (preferred), Gmail, or Outlook email credentials in Netlify environment variables.'
        })
      };
    }

    // Verify transporter connection
    try {
      await transporter.verify();
      console.log(`${emailService} connection verified successfully`);
    } catch (verifyError) {
      console.error(`${emailService} connection verification failed:`, verifyError);
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `${emailService} connection failed`,
          details: verifyError.message
        })
      };
    }

    // Use the invite template from email-templates.js
    const templateData = templates['invite']({
      inviteLink,
      organizationName: organizationName || 'our organization',
      inviterName: inviterName || inviter || 'a team member',
      joinCode: joinCode
    });

    const emailContent = templateData.html;
    const emailText = templateData.text;
    const emailSubject = templateData.subject || `You're invited to join ${organizationName}`;

    // Send email
    console.log(`Sending invitation email via ${emailService} to:`, to);
    
    const mailOptions = {
      from: process.env.SMTP2GO_FROM || process.env.EMAIL_FROM || process.env.OUTLOOK_FROM,
      to: to,
      subject: emailSubject,
      html: emailContent,
      text: emailText
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully via ${emailService} to:`, to);
    console.log('Message ID:', info.messageId);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: `Invitation email sent successfully via ${emailService}`,
        service: emailService,
        messageId: info.messageId
      })
    };

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to send invitation email',
        details: error.message 
      })
    };
  }
};

