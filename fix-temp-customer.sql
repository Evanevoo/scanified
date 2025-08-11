-- Quick fix for temp customer duplicate key error
-- Run this in Supabase Dashboard → SQL Editor

-- First, let's see what temp customers already exist
SELECT "CustomerListID", name, organization_id, customer_type, created_at
FROM customers 
WHERE name = 'Temp Customer'
ORDER BY organization_id;

-- If you see temp customers without customer_type, update them:
UPDATE customers 
SET customer_type = 'TEMPORARY'
WHERE name = 'Temp Customer' 
AND (customer_type IS NULL OR customer_type = '');

-- Add customer_type column if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'CUSTOMER' 
CHECK (customer_type IN ('CUSTOMER', 'VENDOR', 'TEMPORARY'));

-- Update any customers without a type
UPDATE customers 
SET customer_type = 'CUSTOMER' 
WHERE customer_type IS NULL AND name != 'Temp Customer';

-- Add ownership column if needed
ALTER TABLE bottles 
ADD COLUMN IF NOT EXISTS ownership TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_bottles_ownership ON bottles(ownership);

-- Now check that everything is working
SELECT "CustomerListID", name, organization_id, customer_type
FROM customers 
WHERE name = 'Temp Customer';

-- Success message
SELECT 'Temp customer fix completed successfully!' as status;