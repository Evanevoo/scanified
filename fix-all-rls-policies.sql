-- Comprehensive RLS Policy Fix for Gas Cylinder App
-- This script fixes all RLS policies that might be blocking access

-- 1. Fix profiles table policies
DROP POLICY IF EXISTS "Allow users to read profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;

-- Create profiles policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to read their own profile') THEN
        CREATE POLICY "Allow users to read their own profile" ON profiles
        FOR SELECT USING (id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to update their own profile') THEN
        CREATE POLICY "Allow users to update their own profile" ON profiles
        FOR UPDATE USING (id = auth.uid());
    END IF;
END $$;

-- 2. Fix organizations table policies
DROP POLICY IF EXISTS "Allow users to read their own organization" ON organizations;
DROP POLICY IF EXISTS "Allow owners to manage their organization" ON organizations;

-- Create organizations policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Allow users to read their own organization') THEN
        CREATE POLICY "Allow users to read their own organization" ON organizations
        FOR SELECT USING (
          id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Allow owners to manage their organization') THEN
        CREATE POLICY "Allow owners to manage their organization" ON organizations
        FOR ALL USING (
          (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
          AND id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
END $$;

-- 3. Fix customers table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read customers in their organization" ON customers;
    DROP POLICY IF EXISTS "Allow users to insert customers in their organization" ON customers;
    DROP POLICY IF EXISTS "Allow users to update customers in their organization" ON customers;
    DROP POLICY IF EXISTS "Allow users to delete customers in their organization" ON customers;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow users to read customers in their organization') THEN
        CREATE POLICY "Allow users to read customers in their organization" ON customers
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow users to insert customers in their organization') THEN
        CREATE POLICY "Allow users to insert customers in their organization" ON customers
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow users to update customers in their organization') THEN
        CREATE POLICY "Allow users to update customers in their organization" ON customers
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow users to delete customers in their organization') THEN
        CREATE POLICY "Allow users to delete customers in their organization" ON customers
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 4. Fix bottles table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bottles') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read bottles in their organization" ON bottles;
    DROP POLICY IF EXISTS "Allow users to insert bottles in their organization" ON bottles;
    DROP POLICY IF EXISTS "Allow users to update bottles in their organization" ON bottles;
    DROP POLICY IF EXISTS "Allow users to delete bottles in their organization" ON bottles;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bottles' AND policyname = 'Allow users to read bottles in their organization') THEN
        CREATE POLICY "Allow users to read bottles in their organization" ON bottles
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bottles' AND policyname = 'Allow users to insert bottles in their organization') THEN
        CREATE POLICY "Allow users to insert bottles in their organization" ON bottles
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bottles' AND policyname = 'Allow users to update bottles in their organization') THEN
        CREATE POLICY "Allow users to update bottles in their organization" ON bottles
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bottles' AND policyname = 'Allow users to delete bottles in their organization') THEN
        CREATE POLICY "Allow users to delete bottles in their organization" ON bottles
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 5. Fix rentals table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rentals') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read rentals in their organization" ON rentals;
    DROP POLICY IF EXISTS "Allow users to insert rentals in their organization" ON rentals;
    DROP POLICY IF EXISTS "Allow users to update rentals in their organization" ON rentals;
    DROP POLICY IF EXISTS "Allow users to delete rentals in their organization" ON rentals;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rentals' AND policyname = 'Allow users to read rentals in their organization') THEN
        CREATE POLICY "Allow users to read rentals in their organization" ON rentals
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rentals' AND policyname = 'Allow users to insert rentals in their organization') THEN
        CREATE POLICY "Allow users to insert rentals in their organization" ON rentals
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rentals' AND policyname = 'Allow users to update rentals in their organization') THEN
        CREATE POLICY "Allow users to update rentals in their organization" ON rentals
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rentals' AND policyname = 'Allow users to delete rentals in their organization') THEN
        CREATE POLICY "Allow users to delete rentals in their organization" ON rentals
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 6. Fix invoices table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read invoices in their organization" ON invoices;
    DROP POLICY IF EXISTS "Allow users to insert invoices in their organization" ON invoices;
    DROP POLICY IF EXISTS "Allow users to update invoices in their organization" ON invoices;
    DROP POLICY IF EXISTS "Allow users to delete invoices in their organization" ON invoices;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow users to read invoices in their organization') THEN
        CREATE POLICY "Allow users to read invoices in their organization" ON invoices
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow users to insert invoices in their organization') THEN
        CREATE POLICY "Allow users to insert invoices in their organization" ON invoices
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow users to update invoices in their organization') THEN
        CREATE POLICY "Allow users to update invoices in their organization" ON invoices
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow users to delete invoices in their organization') THEN
        CREATE POLICY "Allow users to delete invoices in their organization" ON invoices
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 7. Fix cylinder_fills table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cylinder_fills') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read cylinder_fills in their organization" ON cylinder_fills;
    DROP POLICY IF EXISTS "Allow users to insert cylinder_fills in their organization" ON cylinder_fills;
    DROP POLICY IF EXISTS "Allow users to update cylinder_fills in their organization" ON cylinder_fills;
    DROP POLICY IF EXISTS "Allow users to delete cylinder_fills in their organization" ON cylinder_fills;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cylinder_fills' AND policyname = 'Allow users to read cylinder_fills in their organization') THEN
        CREATE POLICY "Allow users to read cylinder_fills in their organization" ON cylinder_fills
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cylinder_fills' AND policyname = 'Allow users to insert cylinder_fills in their organization') THEN
        CREATE POLICY "Allow users to insert cylinder_fills in their organization" ON cylinder_fills
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cylinder_fills' AND policyname = 'Allow users to update cylinder_fills in their organization') THEN
        CREATE POLICY "Allow users to update cylinder_fills in their organization" ON cylinder_fills
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cylinder_fills' AND policyname = 'Allow users to delete cylinder_fills in their organization') THEN
        CREATE POLICY "Allow users to delete cylinder_fills in their organization" ON cylinder_fills
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 8. Fix deliveries table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'deliveries') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read deliveries in their organization" ON deliveries;
    DROP POLICY IF EXISTS "Allow users to insert deliveries in their organization" ON deliveries;
    DROP POLICY IF EXISTS "Allow users to update deliveries in their organization" ON deliveries;
    DROP POLICY IF EXISTS "Allow users to delete deliveries in their organization" ON deliveries;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow users to read deliveries in their organization') THEN
        CREATE POLICY "Allow users to read deliveries in their organization" ON deliveries
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow users to insert deliveries in their organization') THEN
        CREATE POLICY "Allow users to insert deliveries in their organization" ON deliveries
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow users to update deliveries in their organization') THEN
        CREATE POLICY "Allow users to update deliveries in their organization" ON deliveries
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow users to delete deliveries in their organization') THEN
        CREATE POLICY "Allow users to delete deliveries in their organization" ON deliveries
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 9. Fix notifications table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read notifications in their organization" ON notifications;
    DROP POLICY IF EXISTS "Allow users to insert notifications in their organization" ON notifications;
    DROP POLICY IF EXISTS "Allow users to update notifications in their organization" ON notifications;
    DROP POLICY IF EXISTS "Allow users to delete notifications in their organization" ON notifications;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow users to read notifications in their organization') THEN
        CREATE POLICY "Allow users to read notifications in their organization" ON notifications
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow users to insert notifications in their organization') THEN
        CREATE POLICY "Allow users to insert notifications in their organization" ON notifications
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow users to update notifications in their organization') THEN
        CREATE POLICY "Allow users to update notifications in their organization" ON notifications
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow users to delete notifications in their organization') THEN
        CREATE POLICY "Allow users to delete notifications in their organization" ON notifications
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 10. Fix audit_logs table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow users to read audit_logs in their organization" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to insert audit_logs in their organization" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to update audit_logs in their organization" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to delete audit_logs in their organization" ON audit_logs;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow users to read audit_logs in their organization') THEN
        CREATE POLICY "Allow users to read audit_logs in their organization" ON audit_logs
        FOR SELECT USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow users to insert audit_logs in their organization') THEN
        CREATE POLICY "Allow users to insert audit_logs in their organization" ON audit_logs
        FOR INSERT WITH CHECK (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow users to update audit_logs in their organization') THEN
        CREATE POLICY "Allow users to update audit_logs in their organization" ON audit_logs
        FOR UPDATE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow users to delete audit_logs in their organization') THEN
        CREATE POLICY "Allow users to delete audit_logs in their organization" ON audit_logs
        FOR DELETE USING (
          organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- 11. Show summary of policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 