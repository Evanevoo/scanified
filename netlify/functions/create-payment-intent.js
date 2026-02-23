const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { handlePreflight, createResponse, createErrorResponse } = require('./utils/cors');
const { verifyAuth } = require('./utils/auth');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(event, 405, 'Method not allowed');
  }

  const user = await verifyAuth(event);
  if (!user) {
    return createErrorResponse(event, 401, 'Authentication required');
  }

  try {
    const { amount, currency, customerId, metadata } = JSON.parse(event.body);

    if (!amount || !currency) {
      return createErrorResponse(event, 400, 'Missing required fields: amount, currency');
    }

    let customer = customerId;

    if (!customerId && metadata) {
      const customerData = await stripe.customers.create({
        name: metadata.organization_name || 'Unknown Organization',
        email: metadata.organization_email,
        metadata: {
          organization_id: metadata.organization_id,
          organization_slug: metadata.organization_slug
        }
      });
      customer = customerData.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customer,
      metadata: metadata,
      automatic_payment_methods: { enabled: true },
    });

    return createResponse(event, 200, {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      customer: customer
    });
  } catch (error) {
    return createErrorResponse(event, 500, 'Failed to create payment intent', error);
  }
}; 