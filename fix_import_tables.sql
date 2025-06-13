-- Fix import tables by adding missing columns
-- Run this script in your Supabase SQL editor

-- Add missing columns to imported_invoices table
ALTER TABLE imported_invoices 
ADD COLUMN IF NOT EXISTS uploaded_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS notes text;

-- Add missing columns to imported_sales_receipts table
ALTER TABLE imported_sales_receipts 
ADD COLUMN IF NOT EXISTS uploaded_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS notes text;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  import_id uuid,
  user_id uuid,
  timestamp timestamp DEFAULT now(),
  details jsonb,
  old_value jsonb,
  new_value jsonb,
  warning text
);

-- Enable Row Level Security
ALTER TABLE imported_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Add status check constraint if not exists
ALTER TABLE imported_invoices 
DROP CONSTRAINT IF EXISTS imported_invoices_status_check;

ALTER TABLE imported_invoices 
ADD CONSTRAINT imported_invoices_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE imported_sales_receipts 
DROP CONSTRAINT IF EXISTS imported_sales_receipts_status_check;

ALTER TABLE imported_sales_receipts 
ADD CONSTRAINT imported_sales_receipts_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Verify the tables exist and have the correct structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('imported_invoices', 'imported_sales_receipts', 'audit_logs')
ORDER BY table_name, ordinal_position; 