-- ============================================================================
-- FIX RLS POLICY FOR sales_orders TABLE
-- ============================================================================
-- This fixes the "row-level security policy" error when creating sales orders
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Enable RLS on sales_orders table (if not already enabled)
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their organization's sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can insert sales orders for their organization" ON sales_orders;
DROP POLICY IF EXISTS "Users can update their organization's sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can delete their organization's sales orders" ON sales_orders;

-- 3. Create SELECT policy - Users can view sales orders from their organization
CREATE POLICY "Users can view their organization's sales orders"
ON sales_orders
FOR SELECT
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Create INSERT policy - Users can insert sales orders for their organization
CREATE POLICY "Users can insert sales orders for their organization"
ON sales_orders
FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 5. Create UPDATE policy - Users can update sales orders from their organization
CREATE POLICY "Users can update their organization's sales orders"
ON sales_orders
FOR UPDATE
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 6. Create DELETE policy - Users can delete sales orders from their organization
CREATE POLICY "Users can delete their organization's sales orders"
ON sales_orders
FOR DELETE
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 7. Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales_orders') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'sales_orders';

-- Expected result:
-- tablename: sales_orders
-- rowsecurity: true
-- policy_count: 4

-- ============================================================================
-- TEST THE POLICIES
-- ============================================================================

-- Test 1: Check if you can see your organization's sales orders
-- SELECT COUNT(*) FROM sales_orders;
-- Should return count of sales orders for your organization

-- Test 2: Check policies exist
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sales_orders';
-- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE

