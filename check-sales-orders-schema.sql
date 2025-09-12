-- Check what columns exist in the sales_orders table
-- Run this in Supabase SQL Editor to see the actual schema

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
ORDER BY ordinal_position;
