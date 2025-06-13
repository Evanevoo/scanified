-- Fix Row Level Security policies for import tables
-- Run this script in your Supabase SQL editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own imports" ON imported_invoices;
DROP POLICY IF EXISTS "Users can view their own imports" ON imported_invoices;
DROP POLICY IF EXISTS "Users can update their own imports" ON imported_invoices;
DROP POLICY IF EXISTS "Users can delete their own imports" ON imported_invoices;

DROP POLICY IF EXISTS "Users can insert their own imports" ON imported_sales_receipts;
DROP POLICY IF EXISTS "Users can view their own imports" ON imported_sales_receipts;
DROP POLICY IF EXISTS "Users can update their own imports" ON imported_sales_receipts;
DROP POLICY IF EXISTS "Users can delete their own imports" ON imported_sales_receipts;

DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;

-- Create policies for imported_invoices table
CREATE POLICY "Users can insert their own imports" ON imported_invoices
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by OR uploaded_by IS NULL);

CREATE POLICY "Users can view all imports" ON imported_invoices
  FOR SELECT USING (true);

CREATE POLICY "Users can update imports" ON imported_invoices
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete imports" ON imported_invoices
  FOR DELETE USING (true);

-- Create policies for imported_sales_receipts table
CREATE POLICY "Users can insert their own imports" ON imported_sales_receipts
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by OR uploaded_by IS NULL);

CREATE POLICY "Users can view all imports" ON imported_sales_receipts
  FOR SELECT USING (true);

CREATE POLICY "Users can update imports" ON imported_sales_receipts
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete imports" ON imported_sales_receipts
  FOR DELETE USING (true);

-- Create policies for audit_logs table
CREATE POLICY "Users can view audit logs" ON audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Alternative: If you want to disable RLS temporarily for testing
-- ALTER TABLE imported_invoices DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE imported_sales_receipts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('imported_invoices', 'imported_sales_receipts', 'audit_logs')
ORDER BY tablename, policyname; 