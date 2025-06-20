# Complete Multi-Tenancy Setup Guide

This guide will help you set up the complete multi-tenancy system for your gas cylinder management app, ensuring all data is properly isolated by organization.

## Overview

The multi-tenancy system allows you to:
- ✅ Sell to multiple companies
- ✅ Each company has isolated data
- ✅ Subscription-based billing
- ✅ Company-specific user management
- ✅ Scalable architecture
- ✅ Mobile app integration with organization isolation

## Database Setup

### 1. Run the Complete Migration

Execute the SQL migration in your Supabase SQL editor:

```sql
-- Run the complete multi-tenancy migration
-- This will create the organizations table and update all existing tables
```

**File to run:** `supabase/migrations/20240422000004_complete_multi_tenancy.sql`

This migration will:
- Create the `organizations` table
- Add `organization_id` to all existing tables
- Create a default organization for existing data
- Set up Row Level Security (RLS) policies
- Create triggers to automatically set organization_id
- Create helper functions for organization management

### 2. Verify the Setup

Check that the following tables have been created/updated:
- `organizations` - New table for tenant management
- `profiles` - Updated with `organization_id` column
- `customers` - Updated with `organization_id` column
- `bottles` - Updated with `organization_id` column
- `rentals` - Updated with `organization_id` column
- `invoices` - Updated with `organization_id` column
- `cylinder_fills` - Updated with `organization_id` column
- `deliveries` - Updated with `organization_id` column
- `notifications` - Updated with `organization_id` column
- `audit_logs` - Updated with `organization_id` column

### 3. Test Data Isolation

Run these queries to verify data isolation:

```sql
-- Check that users can only see their organization's data
SELECT * FROM customers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Check organization usage
SELECT * FROM organization_usage WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
```

## Web Application Updates

### 1. Authentication Context

The web app now includes:
- Organization data in the auth context
- Automatic organization creation during signup
- Organization-based data filtering

### 2. Data Operations

All data operations now automatically include organization_id:
- Customer creation/updates
- Cylinder management
- Rental tracking
- Invoice generation
- All other data operations

### 3. User Management

Users are automatically assigned to organizations:
- New users create their own organization
- Existing users are assigned to a default organization
- Organization owners can invite additional users

## Mobile Application Updates

### 1. Authentication Hook

The mobile app's `useAuth` hook now includes:
- Organization data fetching
- Organization-based permissions
- Proper data isolation

### 2. Sync Service

The mobile app's sync service ensures:
- All offline data includes organization_id
- Data is synced to the correct organization
- Proper error handling for organization-related issues

### 3. Data Operations

All mobile app data operations use:
- `getDataWithOrganization()` - Fetch data for current organization
- `insertWithOrganization()` - Insert data with organization_id
- `updateWithOrganization()` - Update data within organization
- `deleteWithOrganization()` - Delete data within organization

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Supabase Configuration (if not already set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard
3. Create products and prices for each plan:
   - Basic: $29/month
   - Professional: $79/month
   - Enterprise: $199/month

### 2. Configure Webhooks

Set up webhooks in your Stripe dashboard to handle:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Webhook endpoint: `https://your-domain.com/.netlify/functions/stripe-webhook`

## Application Features

### 1. Organization Setup

New users will be redirected to `/setup` to create their organization:
- Organization name and slug
- Subscription plan selection
- Admin user setup

### 2. User Management

Admins can:
- Invite new users to their organization
- Manage user roles (admin, manager, user)
- View usage statistics
- Enforce plan limits

### 3. Billing Management

Users can:
- View current subscription
- Upgrade/downgrade plans
- Cancel subscriptions
- View usage statistics

### 4. Data Isolation

All data is automatically scoped to the user's organization:
- Customers
- Cylinders
- Rentals
- Invoices
- All other data

## Usage Limits

Each subscription plan has limits:

| Plan | Users | Customers | Cylinders | Price |
|------|-------|-----------|-----------|-------|
| Basic | 5 | 100 | 1,000 | $29/month |
| Professional | 15 | 500 | 5,000 | $79/month |
| Enterprise | Unlimited | Unlimited | Unlimited | $199/month |

## Testing the Setup

### 1. Create Test Organization

1. Sign up with a new email
2. You'll be redirected to `/setup`
3. Create an organization
4. Select a subscription plan

### 2. Test Data Isolation

1. Create customers, cylinders, etc.
2. Sign up with another email
3. Create a different organization
4. Verify data is isolated

### 3. Test User Management

1. As an admin, invite new users
2. Test role permissions
3. Verify usage limits

### 4. Test Mobile App

1. Login to mobile app with organization user
2. Create offline data
3. Sync data and verify organization isolation
4. Test all mobile app features

## Migration from Single-Tenant

If you have existing data:

1. **Backup your data** before running the schema
2. **Run the migration** - existing data will be assigned to a "Default Organization"
3. **Test thoroughly** to ensure data integrity
4. **Gradually migrate** users to their own organizations

## Customization

### 1. Subscription Plans

Edit the plans in:
- `src/pages/OrganizationSetup.jsx` (lines 8-30)
- `src/services/subscriptionService.js` (lines 60-85)

### 2. Usage Limits

Update limits in the database:
```sql
UPDATE organizations 
SET max_users = 10, max_customers = 200, max_bottles = 2000
WHERE slug = 'your-organization-slug';
```

### 3. Custom Domains

To support custom domains:
1. Set up DNS for your domain
2. Configure subdomain routing
3. Update the organization setup to include domain field

## Monitoring

### 1. Usage Tracking

Monitor organization usage with the `organization_usage` view:
```sql
SELECT * FROM organization_usage WHERE subscription_plan = 'basic';
```

### 2. Billing Alerts

Set up alerts for:
- Organizations approaching limits
- Failed payments
- Subscription cancellations

## Security Considerations

1. **Row Level Security (RLS)** is enabled on all tables
2. **Organization isolation** is enforced at the database level
3. **User permissions** are scoped to their organization
4. **API endpoints** validate organization access
5. **Mobile app** respects organization boundaries

## Troubleshooting

### Common Issues

1. **"Organization not found" error**
   - Check that the user has an `organization_id` in their profile
   - Verify the organization exists in the database

2. **"User limit reached" error**
   - Check the organization's subscription plan
   - Verify current user count vs. limit

3. **Data not showing**
   - Check RLS policies are working
   - Verify `organization_id` is set on records

4. **Mobile app sync issues**
   - Check organization_id is being set correctly
   - Verify offline data includes organization information

### Debug Queries

```sql
-- Check user's organization
SELECT p.*, o.name as org_name 
FROM profiles p 
JOIN organizations o ON p.organization_id = o.id 
WHERE p.id = auth.uid();

-- Check organization usage
SELECT * FROM organization_usage 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('customers', 'bottles', 'rentals', 'invoices');
```

## Next Steps

1. **Deploy the migration** to your production database
2. **Test thoroughly** with multiple organizations
3. **Set up Stripe** for billing
4. **Configure webhooks** for subscription management
5. **Monitor usage** and adjust limits as needed

## Support

If you encounter issues:
1. Check the debug queries above
2. Verify all environment variables are set
3. Check the browser console for errors
4. Review the Supabase logs for database errors
5. Test with a fresh organization to isolate issues 