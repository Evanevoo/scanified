-- Check RLS policies on the roles table
-- This will help us understand why role deletion might be failing

-- Check if RLS is enabled on roles table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'roles';

-- List all policies on roles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'roles';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'roles' 
ORDER BY ordinal_position;

-- Check if there are any foreign key constraints preventing deletion
SELECT
    tc.table_name, 
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
WHERE tc.table_name = 'roles' OR ccu.table_name = 'roles';

-- Show current user and their role
SELECT 
    'Current auth user:' as info,
    auth.uid() as user_id,
    auth.role() as auth_role;

-- Show profiles that reference roles
SELECT 
    'Profiles referencing roles:' as info,
    p.email,
    p.role as text_role,
    p.role_id as uuid_role,
    r.name as role_name
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id
WHERE p.role_id IS NOT NULL
LIMIT 5;
