const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, currency, customerId, metadata } = JSON.parse(event.body);

    // Validate required fields
    if (!amount || !currency) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: amount, currency' })
      };
    }

    let customer = customerId;

    // If no customer ID provided, create a new customer
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customer,
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        customer: customer
      })
    };

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create payment intent',
        details: error.message 
      })
    };
  }
}; 