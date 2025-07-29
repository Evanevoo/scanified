-- Fix RLS policy for customers table
-- This script fixes the Row Level Security policy that's blocking customer creation

-- First, let's see the current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'customers';

-- Drop existing policies for customers table
DROP POLICY IF EXISTS "Users can view their organization's customers" ON customers;
DROP POLICY IF EXISTS "Users can create customers for their organization" ON customers;
DROP POLICY IF EXISTS "Users can update their organization's customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their organization's customers" ON customers;
DROP POLICY IF EXISTS "Owners can view all customers" ON customers;
DROP POLICY IF EXISTS "Owners can manage all customers" ON customers;

-- Create new, more permissive policies for customers table
-- Users can view customers from their organization
CREATE POLICY "Users can view their organization's customers" ON customers
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Users can create customers for their organization
CREATE POLICY "Users can create customers for their organization" ON customers
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Users can update customers in their organization
CREATE POLICY "Users can update their organization's customers" ON customers
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Users can delete customers in their organization
CREATE POLICY "Users can delete their organization's customers" ON customers
  FOR DELETE USING (
    organization_id = (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Owners can view all customers across all organizations
CREATE POLICY "Owners can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Owners can manage all customers across all organizations
CREATE POLICY "Owners can manage all customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Verify the new policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'customers';

-- Test the policy by checking current user's organization
SELECT 
  p.id,
  p.email,
  p.organization_id,
  o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();

-- Check if there are any customers in the current user's organization
SELECT COUNT(*) as customer_count
FROM customers
WHERE organization_id = (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid()
); 