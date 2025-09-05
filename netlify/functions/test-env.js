// Test function to check environment variables
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Environment Variables Test',
      emailUser: process.env.EMAIL_USER || 'NOT_SET',
      emailPassword: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT_SET',
      emailFrom: process.env.EMAIL_FROM || 'NOT_SET',
      allEnvVars: Object.keys(process.env).filter(key => key.includes('EMAIL'))
    })
  };
};
