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
    const { to } = JSON.parse(event.body);

    // Check environment variables
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: {
            EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
            EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
            EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET'
          }
        })
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gascylinderapp.com',
      to: to || process.env.EMAIL_USER,
      subject: 'Test Email - Email Service Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Email Service Test</h2>
          <p>🎉 Congratulations! Your email service is working correctly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>EMAIL_USER: ${process.env.EMAIL_USER}</li>
            <li>EMAIL_FROM: ${process.env.EMAIL_FROM || 'noreply@gascylinderapp.com'}</li>
            <li>Service: Gmail</li>
          </ul>
          <p>You can now send invitation emails successfully!</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
        </div>
      `
    };

    console.log('Attempting to send test email to:', mailOptions.to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully!',
        messageId: info.messageId,
        to: mailOptions.to
      })
    };

  } catch (error) {
    console.error('Test email error:', error);
    
    let errorMessage = 'Failed to send test email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Check your Gmail credentials and app password.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Email server not found. Check your internet connection.';
    } else if (error.responseCode === 535) {
      errorMessage = 'Invalid email username or password. Use Gmail app password if 2FA is enabled.';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message,
        code: error.code,
        config: {
          EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
          EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
          EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET'
        }
      })
    };
  }
};