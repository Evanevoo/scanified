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
    const { to, subject, template, data } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !template) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: to, subject, and template are required' })
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
      // In production, verify TLS certificates for security
      // In development, allow self-signed certs for local testing
      rejectUnauthorized: isProduction,
      minVersion: 'TLSv1.2' // Enforce minimum TLS 1.2
    };

    // Try SMTP2GO first (your primary service)
    if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM) {
      console.log('Using SMTP2GO email service');
      transporter = nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 2525, // SMTP2GO primary port
        secure: false, // Use STARTTLS
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
        secure: false, // Use STARTTLS
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
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.OUTLOOK_USER,
          pass: process.env.OUTLOOK_PASSWORD
        },
        tls: {
          ...tlsConfig,
          ciphers: 'SSLv3' // Outlook-specific cipher requirement
        }
      });
      emailService = 'Outlook';
    }
    // No email service configured
    else {
      console.error('No email service configured');
      const availableVars = [];
      if (process.env.SMTP2GO_USER) availableVars.push('SMTP2GO_USER (missing SMTP2GO_PASSWORD or SMTP2GO_FROM)');
      if (process.env.EMAIL_USER) availableVars.push('EMAIL_USER (Gmail - but SMTP2GO preferred)');
      if (process.env.OUTLOOK_USER) availableVars.push('OUTLOOK_USER');
      
      // Check if Supabase is configured (for reference)
      const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseNote = hasSupabase 
        ? '\n\n💡 NOTE: You have Supabase configured. If you have SMTP set up in Supabase Dashboard, use the SAME credentials here:\n' +
          '   - If Supabase uses Gmail: Set EMAIL_USER, EMAIL_PASSWORD (App Password), EMAIL_FROM\n' +
          '   - If Supabase uses SMTP2GO: Set SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM\n' +
          '   - If Supabase uses SendGrid: Set EMAIL_USER=apikey, EMAIL_PASSWORD=your-api-key, EMAIL_FROM\n' +
          '   These should match your Supabase SMTP settings at: Authentication > Settings > Email'
        : '';
      
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Please configure SMTP2GO (preferred), Gmail, or Outlook email credentials in Netlify environment variables. ' +
                   (availableVars.length > 0 ? `Found partial config: ${availableVars.join(', ')}` : 'No email variables found.') +
                   ' Required: SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM (or EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM for Gmail)' +
                   supabaseNote
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

    // Generate email content based on template
    let emailContent, emailText, emailSubject;
    
    // Use new template system if available
    if (templates[template]) {
      const templateData = templates[template](data);
      emailContent = templateData.html;
      emailText = templateData.text;
      emailSubject = templateData.subject || subject;
    } else {
      // Fallback to old template system
      emailContent = generateEmailContent(template, data);
      emailSubject = subject;
    }

    // Send email
    console.log(`Sending email via ${emailService} to:`, to, 'with subject:', emailSubject);
    
    const mailOptions = {
      from: process.env.SMTP2GO_FROM || process.env.EMAIL_FROM || process.env.OUTLOOK_FROM,
      to: to,
      subject: emailSubject,
      html: emailContent,
      text: emailText
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully via ${emailService} to:`, to);
    console.log('Message ID:', info.messageId);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: `Email sent successfully via ${emailService}`,
        service: emailService,
        messageId: info.messageId
      })
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      })
    };
  }
};

function generateEmailContent(template, data) {
  // Sanitize user inputs to prevent XSS in emails
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  switch (template) {
    case 'invite':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">You're Invited!</h2>
          <p>Hello!</p>
          <p>You've been invited to join <strong>${sanitize(data.organizationName) || 'our organization'}</strong> by ${sanitize(data.inviter) || 'a team member'}.</p>
          <p>Click the button below to accept your invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sanitize(data.inviteLink)}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${sanitize(data.inviteLink)}</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Scanified Gas Cylinder Management System</p>
        </div>
      `;
    
    case 'support_ticket':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #dc3545; margin: 0 0 10px 0;">New Support Ticket</h2>
            <p style="margin: 0; color: #6c757d;">A customer has submitted a new support ticket</p>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Ticket Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Subject:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.subject)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Priority:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="background-color: ${data.priority === 'high' ? '#dc3545' : data.priority === 'medium' ? '#ffc107' : '#28a745'}; color: ${data.priority === 'high' ? 'white' : 'black'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${sanitize(data.priority?.toUpperCase() || 'NORMAL')}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Category:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.category)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Status:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${sanitize(data.status?.toUpperCase() || 'OPEN')}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Created:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${new Date(data.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Customer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.userName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.userEmail)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Organization:</td>
                <td style="padding: 8px 0; color: #495057;">${sanitize(data.organizationName)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Description</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
              <p style="margin: 0; color: #495057; white-space: pre-wrap;">${sanitize(data.description)}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sanitize(data.ticketUrl)}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View &amp; Respond to Ticket
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${sanitize(data.supportUrl)}" style="color: #6c757d; text-decoration: none; font-size: 14px;">
              Go to Support Dashboard
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 12px; margin-top: 32px; text-align: center;">
            This is an automated notification from Scanified Gas Cylinder Management System
          </p>
        </div>
      `;
    
    case 'support_ticket_reply':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin: 0 0 10px 0;">New Reply to Support Ticket</h2>
            <p style="margin: 0; color: #6c757d;">A customer has replied to a support ticket</p>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Ticket Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Subject:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.subject)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Customer:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #495057;">${sanitize(data.userName)} (${sanitize(data.userEmail)})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Reply Time:</td>
                <td style="padding: 8px 0; color: #495057;">${new Date(data.replyCreatedAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Customer Reply</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #28a745;">
              <p style="margin: 0; color: #495057; white-space: pre-wrap;">${sanitize(data.replyMessage)}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sanitize(data.ticketUrl)}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Full Conversation
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${sanitize(data.supportUrl)}" style="color: #6c757d; text-decoration: none; font-size: 14px;">
              Go to Support Dashboard
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 12px; margin-top: 32px; text-align: center;">
            This is an automated notification from Scanified Gas Cylinder Management System
          </p>
        </div>
      `;
    
    case 'order-confirmation':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Order Confirmation</h2>
          <p>Dear ${sanitize(data.customerName)},</p>
          <p>Your order #${sanitize(data.orderId)} has been confirmed and is being processed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> #${sanitize(data.orderId)}</p>
            <p><strong>Delivery Date:</strong> ${sanitize(data.deliveryDate)}</p>
            <p><strong>Items:</strong></p>
            <ul>
              ${(data.items || []).map(item => `<li>${sanitize(item.name)} - ${sanitize(item.quantity)}</li>`).join('')}
            </ul>
          </div>
          <p>Thank you for your business!</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Scanified Gas Cylinder Management System</p>
        </div>
      `;
    
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Email Notification</h2>
          <p>${sanitize(data.message) || 'You have received a notification from Scanified Gas Cylinder Management System.'}</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Scanified Gas Cylinder Management System</p>
        </div>
      `;
  }
}
