const Stripe = require('stripe');
const { handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { applyRateLimit } = require('./utils/rateLimit');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return createResponse(event, 405, { error: 'Method not allowed' });
  }

  // Apply rate limiting for subscription operations
  const rateLimitResponse = applyRateLimit(event, 'create-subscription', 'subscription');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check Stripe configuration
  if (!process.env.STRIPE_SECRET_KEY) {
    return createErrorResponse(event, 500, 'Payment service configuration error');
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { priceId, customerId, metadata = {} } = JSON.parse(event.body);

    if (!priceId || !customerId) {
      return createResponse(event, 400, { error: 'Price ID and Customer ID are required' });
    }

    // Validate inputs
    if (typeof priceId !== 'string' || typeof customerId !== 'string') {
      return createResponse(event, 400, { error: 'Invalid input format' });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return createResponse(event, 200, {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    // Don't expose Stripe error details
    console.error('Subscription error:', error.type, error.code);
    return createErrorResponse(event, 500, 'Failed to create subscription', error);
  }
}; 