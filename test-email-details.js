// Test the email function and get detailed error information
async function testEmailWithDetails() {
  console.log('🔍 Testing Email Function with Detailed Error Info...\n');

  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'scanified@gmail.com',
        subject: 'Test Email',
        template: 'invite',
        data: {
          organizationName: 'Test Org',
          inviter: 'Test User',
          inviteLink: 'https://example.com/invite/test'
        }
      })
    });

    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📋 Response Text:', text);
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('✅ Email sent successfully:', json);
      } catch (e) {
        console.log('⚠️ Response parsing failed:', e.message);
        console.log('Raw response:', text);
      }
    } else {
      console.log('❌ Email function error:', text);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Make available globally
window.testEmailWithDetails = testEmailWithDetails;
console.log('🧪 Detailed test function loaded! Run testEmailWithDetails() in console.');
