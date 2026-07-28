# GAS CYLINDER APP - MULTI-TENANCY SETUP GUIDE

## Overview
This guide will help you set up the multi-tenancy system for the Gas Cylinder Management App. Each organization will have complete data isolation and can manage their own users, customers, and inventory.

## Prerequisites
- Supabase project with PostgreSQL database
- Stripe account for payment processing
- Netlify account for serverless functions

## Step 1: Database Setup

### 1.1 Run the Multi-Tenancy Schema
Execute the multi-tenancy schema script to create the organizations table and related structures:

```sql
-- Run this in your Supabase SQL editor
\i multi_tenancy_schema.sql
```

### 1.2 Add Organization Columns
Add organization_id columns to all existing tables:

```sql
-- Run this in your Supabase SQL editor
\i add_organization_columns.sql
```

### 1.3 Apply RLS Policies
Apply the comprehensive Row Level Security policies:

```sql
-- Run this in your Supabase SQL editor
\i multi_tenancy_rls_policies.sql
```

### 1.4 Add Missing Columns (if needed)
If you encounter errors about missing columns, run this script:

```sql
-- Run this in your Supabase SQL editor
\i add_payment_required_column.sql
```

### 1.5 Fix Organizations Table Schema (if needed)
If you get errors about missing columns like `trial_end_date`, run this comprehensive fix:

```sql
-- Run this in your Supabase SQL editor
\i fix_organizations_table.sql
```

### 1.6 Test Basic Functionality
Run this simple test to verify the database structure:

```sql
-- Run this in your Supabase SQL editor
\i simple_test_organizations.sql
```

### 1.7 Clean Up Existing Data
Remove all existing users and data to start fresh:

```sql
-- Run this in your Supabase SQL editor
\i simple_cleanup.sql
```

## Step 2: Create Owner Account

### 2.1 Create the Ultimate Owner
Run the owner account creation script:

```sql
-- Run this in your Supabase SQL editor
\i create_owner_account.sql
```

### 2.2 Owner Account Details
- **Email**: owner@gascylinderapp.com
- **Password**: (set during script execution)
- **Role**: owner
- **Permissions**: Full access to all organizations and data

## Step 3: Environment Configuration

### 3.1 Supabase Environment Variables
Add these to your Supabase project settings:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email (for notifications)
SENDGRID_API_KEY=your_sendgrid_api_key
SMS_API_KEY=your_sms_api_key
```

### 3.2 Netlify Environment Variables
Add the same variables to your Netlify project settings.

## Step 4: Application Setup

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Build and Deploy
```bash
npm run build
```

Deploy to your hosting platform (Netlify, Vercel, etc.).

## Step 5: Organization Registration Flow

### 5.1 Access Owner Dashboard
1. Login with the owner account
2. Navigate to `/owner-dashboard`
3. View all registered organizations

### 5.2 Organization Registration
Organizations can register at `/register` with:
- Company name
- Contact information
- Subscription plan selection
- Payment setup

### 5.3 Trial Period
- All organizations get a 7-day trial
- Payment required after trial period
- Owner can extend trials for customers

## Step 6: User Management

### 6.1 Organization Admins
Each organization can:
- Add users to their organization
- Assign roles (admin, manager, user)
- Remove users from their organization
- Manage user permissions

### 6.2 User Roles
- **Admin**: Full access to organization data and user management
- **Manager**: Access to most features, can manage customers and inventory
- **User**: Basic access to view and update data
- **Owner**: Ultimate access to all organizations (system owner only)

### 6.3 Adding Users
1. Login as organization admin
2. Navigate to "User Management" in sidebar
3. Click "Add User"
4. Enter user details and role
5. User receives email invitation

## Step 7: Data Isolation Verification

### 7.1 Test Organization Isolation
Run the test script to verify data isolation:

```sql
-- Run this in your Supabase SQL editor
\i test_organization_user_management.sql
```

### 7.2 Verify RLS Policies
Check that all tables have proper RLS policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Step 8: Payment Integration

### 8.1 Stripe Setup
1. Configure Stripe webhooks
2. Set up subscription plans
3. Test payment flow

### 8.2 Subscription Plans
- **Basic**: 5 users, basic features
- **Premium**: 10 users, advanced features
- **Enterprise**: Unlimited users, all features

## Step 9: Mobile App Integration

### 9.1 Update Mobile App
The mobile app is already configured for multi-tenancy:
- Users login with organization credentials
- All data is organization-scoped
- Offline sync respects organization boundaries

### 9.2 Mobile Features
- Barcode scanning
- Offline data collection
- Real-time sync
- Organization-specific data

## Step 10: Testing

### 10.1 Create Test Organizations
1. Register multiple test organizations
2. Add users to each organization
3. Verify data isolation

### 10.2 Test User Management
1. Login as organization admin
2. Add new users
3. Change user roles
4. Remove users
5. Verify users can only see their organization's data

### 10.3 Test Payment Flow
1. Complete trial period
2. Process payment
3. Verify subscription activation

## Security Features

### Data Isolation
- Row Level Security (RLS) policies
- Organization-scoped queries
- API-level filtering
- Complete data privacy between organizations

### Access Control
- Role-based permissions
- Organization-scoped user management
- Secure authentication
- Audit logging

### Payment Security
- Stripe integration
- Secure payment processing
- Subscription management
- Trial period controls

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure all tables have organization_id columns
   - Verify RLS policies are applied correctly
   - Check user organization_id is set

2. **User Management Issues**
   - Verify admin role permissions
   - Check organization_id constraints
   - Ensure proper authentication

3. **Payment Issues**
   - Verify Stripe configuration
   - Check webhook endpoints
   - Validate subscription plans

### Support
For issues or questions, check the logs and verify:
- Database schema is correct
- RLS policies are active
- Environment variables are set
- User permissions are correct

## Next Steps

After setup, consider implementing:
1. Advanced analytics per organization
2. Custom branding per organization
3. API rate limiting per organization
4. Advanced reporting features
5. Integration with external systems

## Summary

The multi-tenancy system provides:
- ✅ Complete data isolation between organizations
- ✅ Organization-specific user management
- ✅ Role-based access control
- ✅ Secure payment processing
- ✅ Trial period management
- ✅ Mobile app integration
- ✅ Real-time synchronization
- ✅ Audit logging and compliance

Each organization operates independently with their own:
- Users and permissions
- Customers and data
- Inventory and assets
- Invoices and billing
- Reports and analytics 