const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  console.log('Starting yearly invoice notification generation');

  try {
    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based month
    const currentDay = now.getDate();
    
    console.log(`Current date: ${currentYear}-${currentMonth}-${currentDay}`);

    // Only run this function in January (month 1)
    if (currentMonth !== 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Not January (current month: ${currentMonth}). Yearly invoice notifications only generated in January.`,
          year: currentYear,
          month: currentMonth
        })
      };
    }

    // Call the PostgreSQL function to generate yearly rental notifications
    console.log('Calling generate_yearly_rental_notifications function...');
    const { data, error } = await supabase.rpc('generate_yearly_rental_notifications');

    if (error) {
      console.error('Error calling generate_yearly_rental_notifications:', error);
      throw error;
    }

    console.log('Successfully generated yearly rental notifications');

    // Get summary of notifications created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: notificationsCreated, error: countError } = await supabase
      .from('notifications')
      .select('id, organization_id, type, title')
      .eq('type', 'yearly_invoice')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });

    if (countError) {
      console.error('Error fetching notification count:', countError);
    }

    const notificationCount = notificationsCreated?.length || 0;
    console.log(`Created ${notificationCount} yearly invoice notifications`);

    // Optionally send a summary email to system administrators
    if (notificationCount > 0 && process.env.ADMIN_EMAIL) {
      await sendAdminSummaryEmail(notificationCount, currentYear, notificationsCreated);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully generated yearly invoice notifications for ${currentYear}`,
        year: currentYear,
        notificationsCreated: notificationCount,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in yearly-invoice-notifications function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate yearly invoice notifications',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Helper function to send summary email to administrators
async function sendAdminSummaryEmail(notificationCount, year, notifications) {
  try {
    console.log('Sending admin summary email...');
    
    // Group notifications by organization
    const orgGroups = notifications.reduce((groups, notif) => {
      const orgId = notif.organization_id;
      if (!groups[orgId]) {
        groups[orgId] = [];
      }
      groups[orgId].push(notif);
      return groups;
    }, {});

    const orgCount = Object.keys(orgGroups).length;

    const emailBody = `
Yearly Invoice Notifications Generated - ${year}

Summary:
- Total notifications created: ${notificationCount}
- Organizations affected: ${orgCount}
- Generation date: ${new Date().toISOString()}

Notifications by Organization:
${Object.entries(orgGroups).map(([orgId, notifs]) => `
Organization ${orgId}: ${notifs.length} notifications
${notifs.map(n => `  - ${n.title}`).join('\n')}
`).join('\n')}

This is an automated message from the Asset Management System.
Yearly rental invoice notifications have been generated and sent to organizations.
    `;

    // You can integrate with your email service here
    // For example, using SendGrid, Amazon SES, or the existing send-email function
    console.log('Admin summary email content:', emailBody);
    
    // If you have a send-email function, you can call it here:
    // await sendEmail(process.env.ADMIN_EMAIL, `Yearly Invoice Notifications Generated - ${year}`, emailBody);
    
  } catch (error) {
    console.error('Error sending admin summary email:', error);
    // Don't throw - this is optional functionality
  }
}

// Test endpoint - can be called manually to test the function
// GET /api/yearly-invoice-notifications?test=true
exports.testHandler = async (event, context) => {
  if (event.queryStringParameters?.test === 'true') {
    console.log('Test mode - generating notifications regardless of date');
    
    try {
      const { data, error } = await supabase.rpc('generate_yearly_rental_notifications');
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Test successful - yearly invoice notifications generated',
          timestamp: new Date().toISOString()
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Test failed',
          message: error.message
        })
      };
    }
  }
  
  return exports.handler(event, context);
};