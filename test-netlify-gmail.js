// Test script to test Netlify email function with Gmail credentials
async function testNetlifyEmailFunction() {
  console.log('🔍 Testing Netlify Email Function with Gmail credentials...\n');

  // Set environment variables for the test
  process.env.EMAIL_USER = 'scanified@gmail.com';
  process.env.EMAIL_PASSWORD = 'fhul uznc onpq foha';
  process.env.EMAIL_FROM = 'scanified@gmail.com';

  console.log('📧 Environment variables set:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('EMAIL_PASSWORD: [HIDDEN]');
  console.log('');

  // Test data for invitation email
  const testData = {
    to: 'scanified@gmail.com',
    subject: 'Test Invitation from Gas Cylinder App',
    template: 'invite',
    data: {
      organizationName: 'Test Organization',
      inviter: 'Test User',
      inviteLink: 'https://example.com/invite/test123'
    }
  };

  console.log('📤 Sending test invitation email...');
  console.log('To:', testData.to);
  console.log('Subject:', testData.subject);
  console.log('Template:', testData.template);
  console.log('');

  try {
    // Import the Netlify function
    const { handler } = await import('./netlify/functions/send-email.js');
    
    // Create a mock event object
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify(testData)
    };

    // Call the function
    const result = await handler(event, {});
    
    console.log('📋 Function Response:');
    console.log('Status Code:', result.statusCode);
    console.log('Body:', JSON.parse(result.body));
    
    if (result.statusCode === 200) {
      console.log('\n✅ Netlify email function test successful!');
      console.log('Email should be sent via Gmail service.');
    } else {
      console.log('\n❌ Netlify email function test failed!');
    }
    
  } catch (error) {
    console.error('❌ Error testing Netlify function:', error.message);
  }
}

// Run the test
testNetlifyEmailFunction().catch(console.error);
