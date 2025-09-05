// Test script to test the Netlify email function directly

async function testNetlifyEmailFunction() {
  console.log('🔍 Testing Netlify Email Function...\n');

  // Test the Netlify function endpoint
  const functionUrl = 'http://localhost:8888/.netlify/functions/send-email';
  
  const testData = {
    to: 'test@example.com', // Replace with your email
    subject: 'Test Email from Gas Cylinder App',
    template: 'invite',
    data: {
      inviteLink: 'https://example.com/invite?token=test123',
      organizationName: 'Test Organization',
      inviter: 'Test User'
    }
  };

  console.log('📤 Sending test request to:', functionUrl);
  console.log('📧 Test data:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('📊 Response Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Email function responded successfully!');
    } else {
      console.log('❌ Email function failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to call email function:', error.message);
    console.log('\n💡 Make sure Netlify Dev is running with: netlify dev');
  }
}

// Run the test
testNetlifyEmailFunction().catch(console.error);
