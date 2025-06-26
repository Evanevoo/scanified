-- Fix Customer Upper ID Index Issue
-- This migration removes the problematic idx_customers_upper_id index that's causing constraint violations

-- Drop the problematic index if it exists
DROP INDEX IF EXISTS idx_customers_upper_id;

-- Also check for any other case-insensitive indexes that might cause issues
DROP INDEX IF EXISTS idx_customers_customerlistid_upper;

-- Verify the indexes that remain
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'customers' 
AND indexname LIKE '%upper%';

-- Show all constraints on the customers table
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'customers'
ORDER BY constraint_name; 