// Quick test to check if Netlify Dev is running and email function is accessible
async function testNetlifyDev() {
  console.log('🔍 Testing Netlify Dev and Email Function...\n');

  try {
    // Test if Netlify Dev is running
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
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('📋 Parsed JSON:', json);
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
      }
    } else {
      console.log('❌ Empty response body');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('💡 Make sure Netlify Dev is running on port 8888');
  }
}

// Make available globally
window.testNetlifyDev = testNetlifyDev;
console.log('🧪 Test function loaded! Run testNetlifyDev() in console.');
