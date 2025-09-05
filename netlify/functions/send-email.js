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
    const { to, subject, template, data } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !template) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: to, subject, and template are required' })
      };
    }

    // Check which email service is configured
    let transporter;
    let emailService = 'Unknown';

    // Try SMTP2GO first (your primary service)
    if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM) {
      console.log('Using SMTP2GO email service');
      transporter = nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 2525, // SMTP2GO primary port
        secure: false,
        auth: {
          user: process.env.SMTP2GO_USER,
          pass: process.env.SMTP2GO_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
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
        tls: {
          rejectUnauthorized: false
        }
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
          ciphers: 'SSLv3',
          rejectUnauthorized: false
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
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Please configure SMTP2GO, Gmail, or Outlook email credentials in Netlify environment variables'
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
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `${emailService} connection failed`,
          details: verifyError.message
        })
      };
    }

    // Generate email content based on template
    const emailContent = generateEmailContent(template, data);

    // Send email
    console.log(`Sending email via ${emailService} to:`, to, 'with subject:', subject);
    
    const mailOptions = {
      from: process.env.SMTP2GO_FROM || process.env.EMAIL_FROM || process.env.OUTLOOK_FROM,
      to: to,
      subject: subject,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully via ${emailService} to:`, to);
    console.log('Message ID:', info.messageId);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*',
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
  switch (template) {
    case 'invite':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">You're Invited!</h2>
          <p>Hello!</p>
          <p>You've been invited to join <strong>${data.organizationName || 'our organization'}</strong> by ${data.inviter || 'a team member'}.</p>
          <p>Click the button below to accept your invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.inviteLink}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${data.inviteLink}</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `;
    
    case 'order-confirmation':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Order Confirmation</h2>
          <p>Dear ${data.customerName},</p>
          <p>Your order #${data.orderId} has been confirmed and is being processed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> #${data.orderId}</p>
            <p><strong>Delivery Date:</strong> ${data.deliveryDate}</p>
            <p><strong>Items:</strong></p>
            <ul>
              ${data.items.map(item => `<li>${item.name} - ${item.quantity}</li>`).join('')}
            </ul>
          </div>
          <p>Thank you for your business!</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `;
    
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Email Notification</h2>
          <p>${data.message || 'You have received a notification from Gas Cylinder Management System.'}</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `;
  }
} 