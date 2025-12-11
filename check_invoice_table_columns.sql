-- Query to check all columns in rental_invoices table
-- Run this in Supabase SQL Editor and share the results

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'rental_invoices'
ORDER BY ordinal_position;

-- Also check if the table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'rental_invoices';

