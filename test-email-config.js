// Test script to check email configuration and send a test email
import nodemailer from 'nodemailer';

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration...\n');

  // Check environment variables
  console.log('📧 Environment Variables:');
  console.log('SMTP2GO_USER:', process.env.SMTP2GO_USER ? '✅ Set' : '❌ Not set');
  console.log('SMTP2GO_PASSWORD:', process.env.SMTP2GO_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('SMTP2GO_FROM:', process.env.SMTP2GO_FROM ? '✅ Set' : '❌ Not set');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Not set');
  console.log('');

  let transporter;
  let emailService = 'Unknown';

  // Try SMTP2GO first
  if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM) {
    console.log('📧 Using SMTP2GO credentials:');
    console.log('User:', process.env.SMTP2GO_USER);
    console.log('From:', process.env.SMTP2GO_FROM);
    console.log('Host: mail.smtp2go.com');
    console.log('Port: 2525');
    console.log('');

    transporter = nodemailer.createTransport({
      host: 'mail.smtp2go.com',
      port: 2525,
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
  // Fallback to Outlook
  else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM) {
    console.log('📧 Using Outlook credentials:');
    console.log('User:', process.env.EMAIL_USER);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('Host: smtp-mail.outlook.com');
    console.log('Port: 587');
    console.log('');

    transporter = nodemailer.createTransport({
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
    emailService = 'Outlook';
  }
  else {
    console.error('❌ No email service configured!');
    console.log('Please set either SMTP2GO or Outlook environment variables.');
    return;
  }

  // Test connection
  console.log(`🔗 Testing ${emailService} connection...`);
  try {
    await transporter.verify();
    console.log(`✅ ${emailService} connection verified successfully!`);
  } catch (error) {
    console.error(`❌ ${emailService} connection failed:`, error.message);
    return;
  }

  // Send test email
  console.log('\n📤 Sending test email...');
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  const mailOptions = {
    from: process.env.SMTP2GO_FROM || process.env.EMAIL_FROM,
    to: testEmail,
    subject: 'Test Email from Gas Cylinder App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Test Email</h2>
        <p>This is a test email from your Gas Cylinder Management System.</p>
        <p><strong>Service:</strong> ${emailService}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">Sent by Gas Cylinder Management System</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('To:', testEmail);
    console.log('From:', mailOptions.from);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
