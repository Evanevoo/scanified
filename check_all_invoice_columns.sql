-- Query to check ALL columns in ALL invoicing-related tables
-- Run this in Supabase SQL Editor and share the results

-- Check invoice_settings table
SELECT 
    'invoice_settings' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_settings'
ORDER BY ordinal_position;

-- Check rental_invoices table
SELECT 
    'rental_invoices' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'rental_invoices'
ORDER BY ordinal_position;

-- Check invoice_line_items table
SELECT 
    'invoice_line_items' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_line_items'
ORDER BY ordinal_position;

-- Combined view of all invoicing tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('invoice_settings', 'rental_invoices', 'invoice_line_items')
ORDER BY table_name, ordinal_position;

