const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock payment intent creation for development
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, customerId, metadata } = req.body;

    // Validate required fields
    if (!amount || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, currency' 
      });
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

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      customer: customer
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Development payment server running on http://localhost:${PORT}`);
  console.log('Make sure to set your STRIPE_SECRET_KEY environment variable');
});

module.exports = app; 