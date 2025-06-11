-- TEMPORARY IMPORT TABLES FOR APPROVAL WORKFLOW
-- These tables store imported data that needs approval before being processed

-- Table for imported invoices awaiting approval
CREATE TABLE IF NOT EXISTS imported_invoices (
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
CREATE TABLE IF NOT EXISTS imported_sales_receipts (
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