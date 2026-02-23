const Stripe = require('stripe');
const { getCorsHeaders, handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { verifyAuth } = require('./utils/auth');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  const user = await verifyAuth(event);
  if (!user) {
    return createErrorResponse(event, 401, 'Authentication required');
  }

  try {
    const { customerId } = event.queryStringParameters || {};

    if (!customerId) {
      return createErrorResponse(event, 400, 'Customer ID is required');
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    return createResponse(event, 200, { invoices: invoices.data });
  } catch (error) {
    return createErrorResponse(event, 500, 'Error getting invoices', error);
  }
}; 