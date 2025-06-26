-- Fix RLS policies for import tables
-- This migration adds proper RLS policies for imported_invoices and imported_sales_receipts tables

-- First, let's check if the tables exist and have RLS enabled
DO $$
BEGIN
  -- Fix imported_invoices table policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'imported_invoices') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow users to read their own imports" ON imported_invoices;
    DROP POLICY IF EXISTS "Allow users to insert their own imports" ON imported_invoices;
    DROP POLICY IF EXISTS "Allow users to update their own imports" ON imported_invoices;
    DROP POLICY IF EXISTS "Allow users to delete their own imports" ON imported_invoices;
    
    -- Create new policies
    CREATE POLICY "Allow users to read their own imports" ON imported_invoices
    FOR SELECT USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to insert their own imports" ON imported_invoices
    FOR INSERT WITH CHECK (
      uploaded_by = auth.uid()
    );
    
    CREATE POLICY "Allow users to update their own imports" ON imported_invoices
    FOR UPDATE USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to delete their own imports" ON imported_invoices
    FOR DELETE USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
  END IF;
  
  -- Fix imported_sales_receipts table policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'imported_sales_receipts') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow users to read their own imports" ON imported_sales_receipts;
    DROP POLICY IF EXISTS "Allow users to insert their own imports" ON imported_sales_receipts;
    DROP POLICY IF EXISTS "Allow users to update their own imports" ON imported_sales_receipts;
    DROP POLICY IF EXISTS "Allow users to delete their own imports" ON imported_sales_receipts;
    
    -- Create new policies
    CREATE POLICY "Allow users to read their own imports" ON imported_sales_receipts
    FOR SELECT USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to insert their own imports" ON imported_sales_receipts
    FOR INSERT WITH CHECK (
      uploaded_by = auth.uid()
    );
    
    CREATE POLICY "Allow users to update their own imports" ON imported_sales_receipts
    FOR UPDATE USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to delete their own imports" ON imported_sales_receipts
    FOR DELETE USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
  END IF;
  
  -- Fix audit_logs table policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow users to read audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to insert audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to update audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Allow users to delete audit logs" ON audit_logs;
    
    -- Create new policies
    CREATE POLICY "Allow users to read audit logs" ON audit_logs
    FOR SELECT USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
    );
    
    CREATE POLICY "Allow users to update audit logs" ON audit_logs
    FOR UPDATE USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
    
    CREATE POLICY "Allow users to delete audit logs" ON audit_logs
    FOR DELETE USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    );
  END IF;
END $$; 