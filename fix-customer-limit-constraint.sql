-- Fix customer limit constraint to handle unlimited (-1) properly
-- This will check for and fix any database constraints or triggers

-- First, let's see what constraints exist on the customers table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'customers';

-- Check for any triggers on the customers table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'customers';

-- Check for any functions that might be enforcing customer limits
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%customer%limit%' 
   OR routine_definition LIKE '%max_customers%';

-- If there's a constraint or trigger enforcing the limit, we need to drop it
-- and recreate it to handle -1 as unlimited

-- Example: If there's a check constraint, we might need to drop and recreate it
-- (This will be customized based on what we find above)

-- For now, let's try to insert a test customer to see what specific error we get
-- This will help us identify the exact constraint causing the issue

-- Test insert (this will fail and show us the exact constraint)
-- INSERT INTO customers (name, "CustomerListID", organization_id) 
-- VALUES ('Test Customer', 'TEST-123', 'f98daa10-2884-49b9-a6a6-9725e27e7696');
