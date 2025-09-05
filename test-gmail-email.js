// Test script to test email configuration with provided credentials
import nodemailer from 'nodemailer';

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration with provided credentials...\n');

  // Set the credentials
  const emailUser = 'scanified@gmail.com';
  const emailPassword = 'fhul uznc onpq foha'; // App Password
  const emailFrom = 'scanified@gmail.com';

  console.log('📧 Using Gmail credentials:');
  console.log('User:', emailUser);
  console.log('From:', emailFrom);
  console.log('Host: smtp.gmail.com');
  console.log('Port: 587');
  console.log('');

  // Create transporter for Gmail
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Test connection
  console.log('🔗 Testing Gmail connection...');
  try {
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully!');
  } catch (error) {
    console.error('❌ Gmail connection failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Gmail Authentication Error - Common Solutions:');
      console.log('• Make sure you\'re using an App Password, not your regular password');
      console.log('• Enable 2-factor authentication on your Google account');
      console.log('• Generate an App Password: https://myaccount.google.com/apppasswords');
      console.log('• Use the App Password instead of your regular password');
    }
    return;
  }

  // Send test email
  console.log('\n📤 Sending test email...');
  const testEmail = 'scanified@gmail.com'; // Send to yourself for testing
  
  const mailOptions = {
    from: emailFrom,
    to: testEmail,
    subject: 'Test Email from Gas Cylinder App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Test Email</h2>
        <p>This is a test email from your Gas Cylinder Management System.</p>
        <p><strong>Service:</strong> Gmail</p>
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
