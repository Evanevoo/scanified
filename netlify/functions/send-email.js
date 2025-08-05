const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, subject, template, data } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !template) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, and template are required' })
      };
    }

    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Missing email configuration: EMAIL_USER or EMAIL_PASSWORD not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Email service not configured. Please contact administrator.',
          details: 'EMAIL_USER and EMAIL_PASSWORD environment variables must be set'
        })
      };
    }

    // Create transporter (configure with your email service)
    let transporter;
    try {
      console.log('Creating transporter for user:', process.env.EMAIL_USER);
      transporter = nodemailer.createTransport({
        service: 'gmail', // or your preferred service
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } catch (transporterError) {
      console.error('Error creating transporter:', transporterError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create transporter', details: transporterError.message })
      };
    }

    // Generate email content based on template
    const emailContent = generateEmailContent(template, data);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gascylinderapp.com',
      to: to,
      subject: subject,
      html: emailContent,
      replyTo: data && data.inviter ? data.inviter : undefined
    };

    try {
      console.log('About to send email to:', to, 'with subject:', subject);
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', to, 'Message ID:', info.messageId);
    } catch (sendError) {
      console.error('Error sending email:', sendError);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      if (sendError.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check your email credentials.';
      } else if (sendError.code === 'ENOTFOUND') {
        errorMessage = 'Email server not found. Please check your email service configuration.';
      } else if (sendError.responseCode === 535) {
        errorMessage = 'Invalid email username or password. Please check your credentials.';
      }
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: errorMessage, 
          details: sendError.message,
          code: sendError.code 
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully' 
      })
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      })
    };
  }
};

function generateEmailContent(template, data) {
  switch (template) {
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
          <p>We will notify you when your order is ready for delivery.</p>
          <p>Thank you for choosing our service!</p>
        </div>
      `;

    case 'delivery-update':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Delivery Update</h2>
          <p>Dear ${data.customerName},</p>
          <p>Your delivery #${data.deliveryId} status has been updated.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Delivery Details:</h3>
            <p><strong>Delivery ID:</strong> #${data.deliveryId}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Estimated Time:</strong> ${data.estimatedTime}</p>
          </div>
          <p>We will keep you updated on the progress of your delivery.</p>
        </div>
      `;

    case 'payment-reminder':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F44336;">Payment Reminder</h2>
          <p>Dear ${data.customerName},</p>
          <p>This is a friendly reminder about your outstanding invoice.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice Number:</strong> #${data.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> $${data.amount}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
          <p>Please make your payment to avoid any service interruptions.</p>
          <p>Thank you for your prompt attention to this matter.</p>
        </div>
      `;

    case 'trial-expiration':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Trial Expiration Warning</h2>
          <p>Dear ${data.organizationName} Administrator,</p>
          <p>Your trial period will expire in ${data.daysLeft} days.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Trial Details:</h3>
            <p><strong>Days Remaining:</strong> ${data.daysLeft}</p>
            <p><strong>Expiration Date:</strong> ${data.trialEndDate}</p>
          </div>
          <p>To continue using our service, please add your payment information.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `;

    case 'maintenance-reminder':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Maintenance Reminder</h2>
          <p>This is a reminder that bottle ${data.bottleId} requires maintenance.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Maintenance Details:</h3>
            <p><strong>Bottle ID:</strong> ${data.bottleId}</p>
            <p><strong>Last Maintenance:</strong> ${data.lastMaintenance}</p>
            <p><strong>Next Maintenance Due:</strong> ${data.nextMaintenance}</p>
          </div>
          <p>Please schedule maintenance to ensure safety and compliance.</p>
        </div>
      `;

    case 'invite':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">You're Invited to Join ${data.organizationName}</h2>
          <p>Hello,</p>
          <p><strong>${data.inviter}</strong> has invited you to join the organization <strong>${data.organizationName}</strong> on the Gas Cylinder Management System.</p>
          <p>To accept the invitation and create your account, please click the link below:</p>
          <div style="margin: 20px 0;">
            <a href="${data.inviteLink}" style="background: #2196F3; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
          </div>
          <p>If the button above does not work, copy and paste this link into your browser:</p>
          <p><a href="${data.inviteLink}">${data.inviteLink}</a></p>
          <p>This invite will expire in 7 days or once it is used.</p>
          <p>If you did not expect this invitation, you can ignore this email.</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `;

    case 'support-ticket':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF5722;">New Support Ticket Submitted</h2>
          <p>Hello,</p>
          <p>A new support ticket has been submitted by <strong>${data.organizationName}</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Ticket Details:</h3>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Category:</strong> ${data.category}</p>
            <p><strong>Priority:</strong> ${data.priority}</p>
            <p><strong>Submitted by:</strong> ${data.submittedBy}</p>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
            <p><strong>Date:</strong> ${data.submittedDate}</p>
          </div>
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h4>Description:</h4>
            <p>${data.description}</p>
          </div>
          <p>Please review and respond to this ticket as soon as possible.</p>
          <div style="margin: 20px 0;">
            <a href="${data.ticketUrl}" style="background: #FF5722; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">View Ticket</a>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `;

    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Notification</h2>
          <p>You have received a notification from Gas Cylinder Management System.</p>
          <p>Please log in to your account for more details.</p>
        </div>
      `;
  }
} 