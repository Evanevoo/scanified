-- Step 1: Create a secure helper function to get the current user's organization ID.
-- This is the most reliable and performant way to handle multi-tenancy checks.
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- SECURITY DEFINER allows this function to bypass RLS to read the user's own profile.
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Step 2: Update all RLS policies to use this simple and secure function.

-- PROFILES Table
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
CREATE POLICY "Allow users to read their own profile" ON profiles
FOR SELECT USING (id = auth.uid());

-- ORGANIZATIONS Table
DROP POLICY IF EXISTS "Allow users to read their own organization" ON organizations;
CREATE POLICY "Allow users to read their own organization" ON organizations
FOR SELECT USING (id = get_my_organization_id());

-- CUSTOMERS Table
DROP POLICY IF EXISTS "Allow users to manage customers in their organization" ON customers;
CREATE POLICY "Allow users to manage customers in their organization" ON customers
FOR ALL USING (organization_id = get_my_organization_id());

-- BOTTLES Table
DROP POLICY IF EXISTS "Allow users to manage bottles in their organization" ON bottles;
CREATE POLICY "Allow users to manage bottles in their organization" ON bottles
FOR ALL USING (organization_id = get_my_organization_id());

-- RENTALS Table
DROP POLICY IF EXISTS "Allow users to manage rentals in their organization" ON rentals;
CREATE POLICY "Allow users to manage rentals in their organization" ON rentals
FOR ALL USING (organization_id = get_my_organization_id());

-- INVOICES Table
DROP POLICY IF EXISTS "Allow users to manage invoices in their organization" ON invoices;
CREATE POLICY "Allow users to manage invoices in their organization" ON invoices
FOR ALL USING (organization_id = get_my_organization_id());

-- Repeat for any other tables as needed.
-- This policy allows all actions (SELECT, INSERT, UPDATE, DELETE).
-- You can create more granular policies if needed, for example:
-- CREATE POLICY "Allow users to read deliveries" ON deliveries FOR SELECT USING (organization_id = get_my_organization_id());
-- CREATE POLICY "Allow users to create deliveries" ON deliveries FOR INSERT WITH CHECK (organization_id = get_my_organization_id()); 