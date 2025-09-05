# Gas Cylinder Management App - Complete Setup Guide

This guide will walk you through setting up the Gas Cylinder Management App from scratch.

## Prerequisites

- Node.js 16+ and npm installed
- Git installed
- Supabase account (free tier works)
- Stripe account (for payment processing)
- Netlify or Vercel account (for deployment)

## Table of Contents

1. [Database Setup](#1-database-setup)
2. [Environment Configuration](#2-environment-configuration)
3. [Local Development Setup](#3-local-development-setup)
4. [Authentication Setup](#4-authentication-setup)
5. [Payment Integration](#5-payment-integration)
6. [Mobile App Setup](#6-mobile-app-setup)
7. [Deployment](#7-deployment)
8. [Post-Deployment](#8-post-deployment)
9. [Troubleshooting](#9-troubleshooting)

## 1. Database Setup

### Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Save your project URL and anon key - you'll need these later
3. Wait for the project to finish setting up

### Run Database Migration

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the entire contents of `supabase/migrations/20240101000000_initial_schema.sql`
3. Paste it into the SQL editor and click "RUN"
4. Verify all tables were created successfully in the Table Editor

### Create Initial Owner Account

1. Go to Authentication → Users in Supabase
2. Click "Invite User" and create an owner account
3. Note the user ID that's created
4. Run this SQL to set up the owner profile:

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'USER_ID_FROM_STEP_3',
  'owner@yourcompany.com',
  'System Owner',
  'owner'
);
```

## 2. Environment Configuration

### Create Environment File

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your values:

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Required for billing
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional but recommended
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP2GO_USER=your-smtp2go-username
SMTP2GO_PASSWORD=your-smtp2go-password
SMTP2GO_FROM=noreply@yourdomain.com
```

### Validate Configuration

Run the validation script:
```bash
node validate-setup.js
```

This will check:
- Environment variables are set correctly
- Supabase connection works
- Database tables exist
- Node.js version is compatible

## 3. Local Development Setup

### Install Dependencies

```bash
# Install main app dependencies
npm install

# Install mobile app dependencies (if using)
cd gas-cylinder-mobile
npm install
cd ..
```

### Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5174

### First Time Setup

1. Navigate to http://localhost:5174
2. Click "Sign In" and use your owner credentials
3. You'll be redirected to the owner portal
4. From here you can manage organizations and users

## 4. Authentication Setup

### Configure Supabase Auth

1. Go to Authentication → Settings in Supabase
2. Enable Email/Password authentication
3. Configure email templates:
   - Confirmation email
   - Password reset email
   - Magic link email

### Set up Email Templates

1. Go to Authentication → Email Templates
2. Customize each template with your branding
3. Make sure to include the `{{ .ConfirmationURL }}` token

### Configure Redirect URLs

1. Add your production URL to allowed redirect URLs
2. Add `http://localhost:5174/*` for local development

## 5. Payment Integration

### Stripe Setup

1. Create products in Stripe Dashboard:
   - Basic Plan ($29/month)
   - Professional Plan ($99/month)
   - Enterprise Plan ($299/month)

2. Get your price IDs and add to `.env`:
```env
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

### Webhook Configuration

1. In Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://yoursite.netlify.app/.netlify/functions/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## 6. Mobile App Setup

### Prerequisites

- Expo CLI installed globally
- iOS Simulator (Mac) or Android emulator

### Setup Steps

```bash
cd gas-cylinder-mobile

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key

# Start development
npx expo start
```

### Building for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 7. Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   
3. Add environment variables in Netlify dashboard
4. Deploy!

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project root
3. Follow the prompts
4. Add environment variables in Vercel dashboard

### Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Test organization creation
- [ ] Test payment processing
- [ ] Test data import/export
- [ ] Test mobile app connection
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Enable analytics

## 8. Post-Deployment

### Set up Monitoring

1. Configure error tracking (Sentry)
2. Set up uptime monitoring
3. Configure backup automation

### Security Hardening

1. Review RLS policies
2. Enable 2FA for admin accounts
3. Set up API rate limiting
4. Configure CORS properly

### Performance Optimization

1. Enable Supabase connection pooling
2. Set up CDN for static assets
3. Configure caching headers
4. Optimize images

## 9. Troubleshooting

### Common Issues

#### "No organization found" error
- Make sure user has a profile record
- Check organization_id is set correctly
- Verify RLS policies are working

#### Payment not processing
- Check Stripe webhook is configured
- Verify environment variables are set
- Check Netlify function logs

#### Mobile app can't connect
- Verify Supabase URL and key are correct
- Check CORS settings in Supabase
- Ensure RLS policies allow mobile access

#### Slow performance
- Check database indexes are created
- Review query performance in Supabase
- Enable connection pooling
- Optimize frontend bundle size

### Getting Help

1. Check the documentation in `/docs`
2. Review error logs in Supabase Dashboard
3. Check Netlify function logs
4. Contact support at support@yourcompany.com

## Next Steps

1. **Customize Branding**
   - Update logo and colors
   - Modify email templates
   - Customize landing page

2. **Configure Features**
   - Set up notification preferences
   - Configure tax rates by location
   - Set up custom reports

3. **Train Users**
   - Create user documentation
   - Record training videos
   - Set up help center

4. **Scale Operations**
   - Monitor usage and performance
   - Upgrade Supabase plan as needed
   - Add more regions/locations

## Useful Commands

```bash
# Run tests
npm test

# Build for production
npm run build

# Check for outdated packages
npm outdated

# Validate setup
node validate-setup.js

# Run database migrations
npm run migrate
```

## Support

For technical support:
- Email: support@yourcompany.com
- Documentation: /docs
- GitHub Issues: github.com/yourcompany/gas-cylinder-app

---

Congratulations! Your Gas Cylinder Management App is now set up and ready to use. 🎉 