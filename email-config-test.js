// Email Configuration Test Script
// Run this to test your Gmail configuration

import nodemailer from 'nodemailer';

// Set test environment variables
process.env.EMAIL_USER = 'scanified@gmail.com';
process.env.EMAIL_PASSWORD = 'Bugsbunny.7';
process.env.EMAIL_FROM = 'noreply@scanified.com';

async function testGmailConfig() {
  console.log('🔍 Testing Gmail configuration...\n');

  console.log('📧 Using credentials:');
  console.log('   Email:', process.env.EMAIL_USER);
  console.log('   Password: [HIDDEN]');
  console.log('   From:', process.env.EMAIL_FROM);
  console.log('');

  const transporter = nodemailer.createTransport({
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

  try {
    console.log('🔗 Connecting to Gmail SMTP server...');
    await transporter.verify();
    console.log('✅ Gmail configuration is working!');
    console.log('🚀 Email invitations should now work.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Add these variables to Netlify Environment Variables');
    console.log('2. Deploy your site');
    console.log('3. Test invitation sending');

  } catch (error) {
    console.error('❌ Gmail configuration error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');

    if (error.code === 'EAUTH') {
      console.log('• Double-check your Gmail credentials');
      console.log('• Make sure you\'re using an App Password (not regular password)');
      console.log('• Verify 2FA is enabled on your Gmail account');
    } else if (error.code === 'ENOTFOUND') {
      console.log('• Check your internet connection');
      console.log('• Gmail SMTP server might be temporarily unavailable');
    } else {
      console.log('• Unknown error - check Gmail account settings');
    }
  }
}

testGmailConfig();
