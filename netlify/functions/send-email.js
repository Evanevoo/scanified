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
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create transporter (configure with your email service)
    const transporter = nodemailer.createTransporter({
      service: 'gmail', // or your preferred service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Generate email content based on template
    const emailContent = generateEmailContent(template, data);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gascylinderapp.com',
      to: to,
      subject: subject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);

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