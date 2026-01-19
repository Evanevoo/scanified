exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check which email service is configured
  const config = {
    smtp2go: {
      user: !!process.env.SMTP2GO_USER,
      password: !!process.env.SMTP2GO_PASSWORD,
      from: !!process.env.SMTP2GO_FROM,
      configured: !!(process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM)
    },
    gmail: {
      user: !!process.env.EMAIL_USER,
      password: !!process.env.EMAIL_PASSWORD,
      from: !!process.env.EMAIL_FROM,
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM)
    },
    outlook: {
      user: !!process.env.OUTLOOK_USER,
      password: !!process.env.OUTLOOK_PASSWORD,
      from: !!process.env.OUTLOOK_FROM,
      configured: !!(process.env.OUTLOOK_USER && process.env.OUTLOOK_PASSWORD && process.env.OUTLOOK_FROM)
    }
  };

  const hasAnyConfig = config.smtp2go.configured || config.gmail.configured || config.outlook.configured;
  
  // Determine which service would be used
  let activeService = 'None';
  if (config.smtp2go.configured) {
    activeService = 'SMTP2GO';
  } else if (config.gmail.configured) {
    activeService = 'Gmail';
  } else if (config.outlook.configured) {
    activeService = 'Outlook';
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      configured: hasAnyConfig,
      activeService: activeService,
      configuration: config,
      instructions: hasAnyConfig 
        ? `✅ Email service is configured! Using ${activeService}. If emails still aren't sending, check the function logs for connection errors.`
        : '❌ No email service configured. Please add environment variables in Netlify Dashboard:\n\n' +
          'Option 1 (Recommended): SMTP2GO\n' +
          '- SMTP2GO_USER\n' +
          '- SMTP2GO_PASSWORD\n' +
          '- SMTP2GO_FROM\n\n' +
          'Option 2: Gmail\n' +
          '- EMAIL_USER\n' +
          '- EMAIL_PASSWORD (use App Password, not regular password)\n' +
          '- EMAIL_FROM\n\n' +
          'Option 3: Outlook\n' +
          '- OUTLOOK_USER\n' +
          '- OUTLOOK_PASSWORD\n' +
          '- OUTLOOK_FROM',
      nodeVersion: process.version,
      context: process.env.CONTEXT || 'unknown'
    })
  };
};
