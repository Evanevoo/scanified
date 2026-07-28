# Billing System Setup Guide

## Overview
The billing system now requires credit card payment for plan upgrades. It supports both development and production environments.

## Development Setup

### 1. Environment Variables
Create a `.env` file in the root directory with:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test Payment Flow
1. Navigate to the Billing page
2. You'll see a "Development Mode" indicator
3. Select a paid plan (not Enterprise)
4. Fill in credit card details (any test data works)
5. Complete payment - it will simulate success

## Production Setup

### 1. Netlify Functions
The production environment uses Netlify functions located in `/netlify/functions/`:
- `create-payment-intent.js` - Creates Stripe payment intents

### 2. Environment Variables in Netlify
Set these in your Netlify dashboard:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

### 3. Deploy
```bash
npm run build
# Deploy to Netlify
```

## Testing

### Development Mode
- **No separate server needed** - uses mock payments
- **Any card data works** - no real validation
- **Simulated success** - always succeeds for testing

### Production Mode
- **Real Stripe integration** - actual payment processing
- **Test cards work** - use Stripe test cards

### Stripe Test Cards (Production)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Card Details
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)

## Features

### ✅ Implemented
- Credit card input with validation
- Payment processing with Stripe (production)
- Mock payments for development
- Plan upgrade after successful payment
- Development and production environments
- Error handling and user feedback
- Form clearing after successful payment
- Development mode indicators

### 🚫 Enterprise Plans
- Enterprise plans show "Contact Sales"
- No payment required (redirects to contact page)

### 🔒 Security
- Card details are processed directly by Stripe
- No card data stored in our database
- Secure payment intent creation

## Troubleshooting

### Development Issues
1. **404 Error**: Make sure you're running `npm run dev`
2. **Environment Variables**: Check your `.env` file
3. **Mock Payments**: In development, any card data works

### Production Issues
1. **Netlify Function 404**: Check function deployment in Netlify
2. **Payment Failed**: Verify Stripe account and webhook setup
3. **Environment Variables**: Check Netlify environment variables

## Support
For issues with the billing system, check:
1. Browser console for errors
2. Netlify function logs
3. Stripe dashboard for payment attempts 