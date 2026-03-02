-- Add customer_name and customer_id to bottle_scans so "Change customer" on import approval detail works
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS customer_id TEXT;
