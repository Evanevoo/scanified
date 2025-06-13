-- Fix bottles table by adding missing columns for days_at_location tracking
-- Run this script in your Supabase SQL editor

-- Add missing columns to bottles table
ALTER TABLE bottles 
ADD COLUMN IF NOT EXISTS days_at_location INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_location_update DATE DEFAULT CURRENT_DATE;

-- If bottles table doesn't exist, create it with all required columns
CREATE TABLE IF NOT EXISTS bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_number text UNIQUE,
  serial_number text,
  product_code text,
  type text,
  category text,
  group_name text,
  description text,
  gas_type text,
  location text,
  assigned_customer text,
  rental_start_date date,
  status text DEFAULT 'available',
  days_at_location integer DEFAULT 0,
  last_location_update date DEFAULT CURRENT_DATE,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_barcode ON bottles(barcode_number);
CREATE INDEX IF NOT EXISTS idx_bottles_serial ON bottles(serial_number);
CREATE INDEX IF NOT EXISTS idx_bottles_location ON bottles(location);
CREATE INDEX IF NOT EXISTS idx_bottles_customer ON bottles(assigned_customer);
CREATE INDEX IF NOT EXISTS idx_bottles_days_at_location ON bottles(days_at_location);

-- Enable Row Level Security
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bottles'
ORDER BY ordinal_position; 