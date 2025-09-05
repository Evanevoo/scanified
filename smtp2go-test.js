// SMTP2GO Configuration Test Script
// Run this to test your SMTP2GO configuration

import nodemailer from 'nodemailer';

// Set test environment variables for SMTP2GO
process.env.SMTP2GO_USER = 'scanified@gmail.com'; // Replace with your SMTP2GO username
process.env.SMTP2GO_PASSWORD = 'Bugsbunny.7'; // Replace with your SMTP2GO password
process.env.SMTP2GO_FROM = 'scanified@gmail.com'; // Replace with your domain

async function testSMTP2GOConfig() {
  console.log('🔍 Testing SMTP2GO configuration...\n');

  console.log('📧 Using SMTP2GO credentials:');
  console.log('   Username:', process.env.SMTP2GO_USER);
  console.log('   Password: [HIDDEN]');
  console.log('   From:', process.env.SMTP2GO_FROM);
  console.log('');

  const transporter = nodemailer.createTransport({
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

  try {
    console.log('🔗 Connecting to SMTP2GO server...');
    await transporter.verify();
    console.log('✅ SMTP2GO configuration is working!');
    console.log('🚀 Email invitations should now work.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Add these variables to Netlify Environment Variables');
    console.log('2. Deploy your site');
    console.log('3. Test invitation sending');
    console.log('');
    console.log('🔧 Required Netlify Environment Variables:');
    console.log('SMTP2GO_USER=' + process.env.SMTP2GO_USER);
    console.log('SMTP2GO_PASSWORD=' + process.env.SMTP2GO_PASSWORD);
    console.log('SMTP2GO_FROM=' + process.env.SMTP2GO_FROM);

  } catch (error) {
    console.error('❌ SMTP2GO configuration error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');

    if (error.code === 'EAUTH') {
      console.log('• Double-check your SMTP2GO username and password');
      console.log('• Make sure your SMTP2GO account is active');
      console.log('• Verify you have SMTP access enabled in SMTP2GO');
    } else if (error.code === 'ENOTFOUND') {
      console.log('• Check your internet connection');
      console.log('• SMTP2GO server might be temporarily unavailable');
    } else {
      console.log('• Check your SMTP2GO account settings');
      console.log('• Contact SMTP2GO support if issues persist');
    }

    console.log('');
    console.log('📖 SMTP2GO Setup Help:');
    console.log('1. Go to https://www.smtp2go.com/');
    console.log('2. Sign up for a free account');
    console.log('3. Go to Settings → API Keys & SMTP');
    console.log('4. Create SMTP credentials');
    console.log('5. Use those credentials in this script');
  }
}

testSMTP2GOConfig();
