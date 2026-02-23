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

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return createResponse(event, 200, { paymentMethods: paymentMethods.data });
  } catch (error) {
    return createErrorResponse(event, 500, 'Error getting payment methods', error);
  }
}; 