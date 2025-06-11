-- Create import approval tables
-- Run this script in your Supabase SQL editor

-- Table for imported invoices awaiting approval
CREATE TABLE imported_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at timestamp DEFAULT now(),
  uploaded_by uuid,
  approved_at timestamp,
  approved_by uuid,
  notes text
);

-- Table for imported sales receipts awaiting approval
CREATE TABLE imported_sales_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at timestamp DEFAULT now(),
  uploaded_by uuid,
  approved_at timestamp,
  approved_by uuid,
  notes text
);

-- Audit logs table for tracking approval actions
CREATE TABLE audit_logs (
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