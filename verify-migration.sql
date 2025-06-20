-- Verification Script for Multi-Tenancy Migration
-- Run this after the migration to verify everything is working

-- 1. Check if organizations table exists and has the right columns
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 2. Check if default organization was created
SELECT 
    id, 
    name, 
    slug, 
    subscription_status, 
    trial_ends_at,
    max_users,
    max_customers,
    max_cylinders
FROM organizations 
WHERE slug = 'default';

-- 3. Check if profiles have organization_id
SELECT 
    COUNT(*) as total_profiles,
    COUNT(organization_id) as profiles_with_org,
    COUNT(*) - COUNT(organization_id) as profiles_without_org
FROM profiles;

-- 4. Check RLS policies
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 5. Check if triggers were created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE 'set_organization_id_%'
ORDER BY trigger_name;

-- 6. Check if functions were created
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_my_organization_id', 'is_in_organization', 'set_organization_id')
ORDER BY routine_name;

-- 7. Test the organization_usage view
SELECT 
    organization_id,
    organization_name,
    slug,
    subscription_plan,
    subscription_status,
    current_users,
    current_customers,
    current_cylinders,
    trial_status
FROM organization_usage 
LIMIT 5;

-- 8. Test data isolation (run this as a user to see their organization's data)
-- This will show what data the current user can see
SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count
FROM profiles 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
UNION ALL
SELECT 
    'customers' as table_name,
    COUNT(*) as record_count
FROM customers 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
UNION ALL
SELECT 
    'bottles' as table_name,
    COUNT(*) as record_count
FROM bottles 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- 9. Check if any tables are missing organization_id
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'customers', 'bottles', 'rentals', 'invoices', 'cylinder_fills', 'deliveries', 'notifications', 'audit_logs')
    AND column_name = 'organization_id'
ORDER BY table_name;

-- 10. Summary
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM organizations) as organizations_count,
    (SELECT COUNT(*) FROM profiles WHERE organization_id IS NOT NULL) as profiles_with_org,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as rls_policies_count,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE 'set_organization_id_%') as triggers_count; 