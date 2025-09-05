// Test script to test email sending from the browser
async function testBrowserEmail() {
  console.log('🔍 Testing Email Sending from Browser...\n');

  const testData = {
    to: 'scanified@gmail.com',
    subject: 'Test Email from Browser',
    template: 'invite',
    data: {
      organizationName: 'Test Organization',
      inviter: 'Test User',
      inviteLink: 'https://example.com/invite/test123'
    }
  };

  console.log('📤 Sending test email...');
  console.log('To:', testData.to);
  console.log('Subject:', testData.subject);
  console.log('Template:', testData.template);
  console.log('');

  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('📋 Response:');
    console.log('Status:', response.status);
    console.log('Result:', result);
    
    if (response.ok) {
      console.log('\n✅ Email sent successfully!');
      console.log('Service:', result.service);
      console.log('Message ID:', result.messageId);
    } else {
      console.log('\n❌ Email sending failed!');
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Make the function available globally
window.testBrowserEmail = testBrowserEmail;

console.log('📧 Email test function loaded!');
console.log('Run testBrowserEmail() in the console to test email sending.');
