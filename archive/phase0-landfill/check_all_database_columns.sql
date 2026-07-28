-- Query to check ALL columns in ALL tables in the ENTIRE database
-- Run this in Supabase SQL Editor and share the results

-- Get all columns from all tables in the public schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Alternative: More detailed view with table info
SELECT 
    t.table_name,
    t.column_name,
    t.data_type,
    t.is_nullable,
    t.column_default,
    t.character_maximum_length,
    t.numeric_precision,
    t.numeric_scale,
    t.ordinal_position,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as is_primary_key
FROM information_schema.columns t
LEFT JOIN (
    SELECT 
        ku.table_name,
        ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
) pk ON t.table_name = pk.table_name AND t.column_name = pk.column_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, t.ordinal_position;
