# Fix: Sales Orders RLS Policy Error

## Problem
When submitting orders from the mobile app, you get this error:
```
Failed to create sales order: new row violates row-level security policy for table 'sales_orders'
```

## Root Cause
The `sales_orders` table has RLS enabled but is missing INSERT policies that allow users to create sales orders for their organization.

## Solution

### Step 1: Run the SQL Fix
1. Go to your Supabase Dashboard: https://supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Open the file `fix-sales-orders-rls.sql` from this repository
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **RUN** (or press Ctrl+Enter)
8. Wait for confirmation: "Success. No rows returned"

### Step 2: Verify the Fix
Run this query in SQL Editor to verify:
```sql
SELECT 
  tablename, 
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales_orders') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'sales_orders';
```

**Expected Result:**
- `rowsecurity`: `true`
- `policy_count`: `4` (SELECT, INSERT, UPDATE, DELETE policies)

### Step 3: Test in Mobile App
1. Open the mobile app
2. Scan some items
3. Submit an order
4. The order should now be created successfully without the RLS error

## What the Fix Does

The SQL script:
1. ✅ Enables RLS on `sales_orders` table (if not already enabled)
2. ✅ Creates SELECT policy - allows viewing orders from your organization
3. ✅ Creates INSERT policy - allows creating orders for your organization
4. ✅ Creates UPDATE policy - allows updating orders from your organization
5. ✅ Creates DELETE policy - allows deleting orders from your organization

All policies check that the `organization_id` matches the user's organization from their profile.

## Why This Happened

The `sales_orders` table likely had RLS enabled but was missing the INSERT policy. This is a common issue when:
- RLS was enabled manually without creating all necessary policies
- The table was created before RLS policies were set up
- Policies were accidentally dropped

## Prevention

To prevent this in the future:
- Always create complete RLS policies (SELECT, INSERT, UPDATE, DELETE) when enabling RLS
- Test order creation after enabling RLS
- Include RLS policies in your database migrations

## Additional Notes

- The mobile app code already includes `organization_id` when creating orders
- This fix only affects the database security policies
- No code changes are needed in the mobile app
- The fix applies to both Android and iOS apps

