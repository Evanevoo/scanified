-- Fix scans table to include order and customer information
-- This will allow mobile scans to sync with Import Approvals page

-- Add missing columns to scans table
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_id TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_scans_order_number ON scans(order_number);
CREATE INDEX IF NOT EXISTS idx_scans_customer_name ON scans(customer_name);
CREATE INDEX IF NOT EXISTS idx_scans_customer_id ON scans(customer_id);

-- Add comments for documentation
COMMENT ON COLUMN scans.order_number IS 'Order number associated with this scan';
COMMENT ON COLUMN scans.customer_name IS 'Customer name associated with this scan';
COMMENT ON COLUMN scans.customer_id IS 'Customer ID associated with this scan';

-- Update RLS policies to include the new columns
-- (The existing policies should still work as they're based on organization_id)
