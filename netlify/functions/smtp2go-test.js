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

    console.log('SMTP2GO test starting...');
    console.log('SMTP2GO_USER:', process.env.SMTP2GO_USER ? 'SET' : 'NOT SET');
    console.log('SMTP2GO_PASSWORD:', process.env.SMTP2GO_PASSWORD ? 'SET' : 'NOT SET');
    console.log('SMTP2GO_FROM:', process.env.SMTP2GO_FROM ? 'SET' : 'NOT SET');

    if (!process.env.SMTP2GO_USER || !process.env.SMTP2GO_PASSWORD || !process.env.SMTP2GO_FROM) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'SMTP2GO not configured',
          details: {
            SMTP2GO_USER: process.env.SMTP2GO_USER ? 'SET' : 'NOT SET',
            SMTP2GO_PASSWORD: process.env.SMTP2GO_PASSWORD ? 'SET' : 'NOT SET',
            SMTP2GO_FROM: process.env.SMTP2GO_FROM ? 'SET' : 'NOT SET'
          }
        })
      };
    }

    // Create transporter with SMTP2GO settings
    const transporter = nodemailer.createTransporter({
      host: 'mail.smtp2go.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP2GO_USER,
        pass: process.env.SMTP2GO_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter
    console.log('Verifying SMTP2GO connection...');
    await transporter.verify();
    console.log('SMTP2GO connection verified successfully');

    // Send test email
    const mailOptions = {
      from: `"Scanified via SMTP2GO" <${process.env.SMTP2GO_FROM}>`,
      to: to,
      subject: '🎉 SMTP2GO Test - Email Delivery Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">
              🎉 Email Delivery Success!
            </h1>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #155724; margin-top: 0;">✅ Congratulations!</h2>
              <p style="color: #155724; margin-bottom: 0;">
                If you're reading this email, your SMTP2GO configuration is working perfectly!
              </p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">📧 Test Details:</h3>
              <ul style="color: #6c757d;">
                <li><strong>Service:</strong> SMTP2GO Professional Email Delivery</li>
                <li><strong>Server:</strong> mail.smtp2go.com:587</li>
                <li><strong>Sent to:</strong> ${to}</li>
                <li><strong>Sent from:</strong> ${process.env.SMTP2GO_FROM}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>

            <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">🚀 What This Means:</h3>
              <ul style="color: #1976d2;">
                <li>Your email delivery system is now fully operational</li>
                <li>SMTP2GO will ensure high deliverability rates</li>
                <li>Your emails will bypass spam filters</li>
                <li>You have professional email tracking and analytics</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Powered by <strong>SMTP2GO</strong> Professional Email Delivery<br>
                Sent from <strong>Scanified</strong> Gas Cylinder Management System
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        🎉 EMAIL DELIVERY SUCCESS!
        
        Congratulations! If you're reading this email, your SMTP2GO configuration is working perfectly.
        
        Test Details:
        - Service: SMTP2GO Professional Email Delivery
        - Server: mail.smtp2go.com:587
        - Sent to: ${to}
        - Sent from: ${process.env.SMTP2GO_FROM}
        - Time: ${new Date().toLocaleString()}
        
        What This Means:
        ✅ Your email delivery system is now fully operational
        ✅ SMTP2GO will ensure high deliverability rates
        ✅ Your emails will bypass spam filters
        ✅ You have professional email tracking and analytics
        
        Powered by SMTP2GO Professional Email Delivery
        Sent from Scanified Gas Cylinder Management System
      `
    };

    console.log('Sending SMTP2GO test email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('SMTP2GO email sent successfully:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'SMTP2GO test email sent successfully!',
        messageId: info.messageId,
        to: to,
        service: 'SMTP2GO Professional Email Delivery',
        server: 'mail.smtp2go.com:587',
        deliverability: 'High - Professional email service'
      })
    };

  } catch (error) {
    console.error('SMTP2GO test error:', error);
    
    let errorMessage = 'SMTP2GO test failed';
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP2GO Authentication failed - check your credentials';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'SMTP2GO Connection failed - check network settings';
    } else if (error.message.includes('535')) {
      errorMessage = 'SMTP2GO Authentication failed - incorrect username/password';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        details: error.message,
        code: error.code || 'UNKNOWN',
        service: 'SMTP2GO'
      })
    };
  }
};
