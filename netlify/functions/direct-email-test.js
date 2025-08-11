const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to } = JSON.parse(event.body);

    console.log('Direct Outlook SMTP test starting...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? 'SET' : 'NOT SET');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.EMAIL_FROM) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Outlook SMTP not configured',
          details: {
            EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
            EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
            EMAIL_FROM: process.env.EMAIL_FROM ? 'SET' : 'NOT SET'
          }
        })
      };
    }

    // Create transporter with Outlook settings
    const transporter = nodemailer.createTransporter({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });

    // Verify transporter
    console.log('Verifying Outlook SMTP connection...');
    await transporter.verify();
    console.log('Outlook SMTP connection verified successfully');

    // Send test email
    const mailOptions = {
      from: `"Scanified Test" <${process.env.EMAIL_FROM}>`,
      to: to,
      subject: '🧪 Direct Outlook SMTP Test - Scanified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">
              🎉 Email Delivery Success!
            </h1>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #155724; margin-top: 0;">✅ Congratulations!</h2>
              <p style="color: #155724; margin-bottom: 0;">
                If you're reading this email, your Outlook SMTP configuration is working perfectly!
              </p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">📧 Test Details:</h3>
              <ul style="color: #6c757d;">
                <li><strong>Service:</strong> Direct Outlook SMTP</li>
                <li><strong>Server:</strong> smtp-mail.outlook.com:587</li>
                <li><strong>Sent to:</strong> ${to}</li>
                <li><strong>Sent from:</strong> ${process.env.EMAIL_FROM}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>

            <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">🚀 What This Means:</h3>
              <ul style="color: #1976d2;">
                <li>Your email delivery system is now fully operational</li>
                <li>Outlook SMTP is working correctly</li>
                <li>You can send emails directly from your application</li>
                <li>No need for external email services</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Powered by <strong>Outlook SMTP</strong><br>
                Sent from <strong>Scanified</strong> Gas Cylinder Management System
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        🎉 EMAIL DELIVERY SUCCESS!
        
        Congratulations! If you're reading this email, your Outlook SMTP configuration is working perfectly.
        
        Test Details:
        - Service: Direct Outlook SMTP
        - Server: smtp-mail.outlook.com:587
        - Sent to: ${to}
        - Sent from: ${process.env.EMAIL_FROM}
        - Time: ${new Date().toLocaleString()}
        
        What This Means:
        ✅ Your email delivery system is now fully operational
        ✅ Outlook SMTP is working correctly
        ✅ You can send emails directly from your application
        ✅ No need for external email services
        
        Powered by Outlook SMTP
        Sent from Scanified Gas Cylinder Management System
      `
    };

    console.log('Sending direct Outlook SMTP test email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Outlook SMTP email sent successfully:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Outlook SMTP test email sent successfully!',
        messageId: info.messageId,
        to: to,
        service: 'Direct Outlook SMTP',
        server: 'smtp-mail.outlook.com:587',
        deliverability: 'Direct - No external service needed'
      })
    };

  } catch (error) {
    console.error('Outlook SMTP test error:', error);
    
    let errorMessage = 'Outlook SMTP test failed';
    if (error.code === 'EAUTH') {
      errorMessage = 'Outlook SMTP Authentication failed - check your credentials';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Outlook SMTP Connection failed - check network settings';
    } else if (error.message.includes('535')) {
      errorMessage = 'Outlook SMTP Authentication failed - incorrect username/password';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        details: error.message,
        code: error.code || 'UNKNOWN',
        service: 'Outlook SMTP'
      })
    };
  }
};
