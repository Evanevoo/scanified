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
    const { name, email, metadata = {} } = JSON.parse(event.body);

    if (!name || !email) {
      return createErrorResponse(event, 400, 'Name and email are required');
    }

    const customer = await stripe.customers.create({
      name,
      email,
      metadata
    });

    return createResponse(event, 200, {
      customerId: customer.id,
      customer: customer
    });
  } catch (error) {
    return createErrorResponse(event, 500, 'Error creating customer', error);
  }
}; 