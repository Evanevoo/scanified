const Stripe = require('stripe');
const { getCorsHeaders, handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { verifyAuth } = require('./utils/auth');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  const headers = getCorsHeaders(event);

  const user = await verifyAuth(event);
  if (!user) {
    return createErrorResponse(event, 401, 'Authentication required');
  }

  try {
    const { subscriptionId } = JSON.parse(event.body);

    if (!subscriptionId) {
      return createErrorResponse(event, 400, 'Subscription ID is required');
    }

    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return createResponse(event, 200, {
      subscriptionId: subscription.id,
      status: subscription.status
    });
  } catch (error) {
    return createErrorResponse(event, 500, 'Error cancelling subscription', error);
  }
}; 