-- CLEAN TEST ENVIRONMENT FOR PRODUCTION-READY MULTI-TENANCY
-- Use this to clean your test data and prepare for real organizations

-- 1. Find your test organization ID
SELECT 
  'YOUR TEST ORGANIZATION' as info,
  id as organization_id,
  name,
  created_at,
  (SELECT COUNT(*) FROM customers WHERE organization_id = o.id) as customer_count,
  (SELECT COUNT(*) FROM bottles WHERE organization_id = o.id) as bottle_count,
  (SELECT COUNT(*) FROM profiles WHERE organization_id = o.id) as user_count
FROM organizations o
ORDER BY created_at DESC
LIMIT 5;

-- 2. Clean test data for your organization (REPLACE 'YOUR_TEST_ORG_ID')
-- WARNING: This will delete ALL data for the specified organization
-- Uncomment and run ONLY after confirming the organization ID is correct

-- Step 2a: Backup your test data first (optional)
-- SELECT * FROM export_organization_customers('YOUR_TEST_ORG_ID');
-- SELECT * FROM export_organization_bottles('YOUR_TEST_ORG_ID');

-- Step 2b: Clean bottles first (to avoid foreign key issues)
-- DELETE FROM bottles WHERE organization_id = 'YOUR_TEST_ORG_ID';

-- Step 2c: Clean customers  
-- DELETE FROM customers WHERE organization_id = 'YOUR_TEST_ORG_ID';

-- Step 2d: Clean other organization-specific data
-- DELETE FROM rentals WHERE organization_id = 'YOUR_TEST_ORG_ID';
-- DELETE FROM scans WHERE organization_id = 'YOUR_TEST_ORG_ID';
-- DELETE FROM invoices WHERE organization_id = 'YOUR_TEST_ORG_ID';

-- 3. Verify clean state
-- IMPORTANT: Replace 'REPLACE_WITH_YOUR_ORG_ID' with your actual UUID
-- SELECT 
--   'AFTER CLEANUP' as info,
--   'customers' as table_name,
--   COUNT(*) as remaining_records
-- FROM customers 
-- WHERE organization_id = 'REPLACE_WITH_YOUR_ORG_ID'
-- UNION ALL
-- SELECT 
--   'AFTER CLEANUP' as info,
--   'bottles' as table_name,
--   COUNT(*) as remaining_records
-- FROM bottles 
-- WHERE organization_id = 'REPLACE_WITH_YOUR_ORG_ID';

-- 4. Set up Row Level Security (RLS) for production
-- This ensures organizations can ONLY see their own data

-- Enable RLS on all multi-tenant tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers table
DROP POLICY IF EXISTS "customers_isolation" ON customers;
CREATE POLICY "customers_isolation" ON customers
  USING (organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ));

-- Create RLS policies for bottles table  
DROP POLICY IF EXISTS "bottles_isolation" ON bottles;
CREATE POLICY "bottles_isolation" ON bottles
  USING (organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ));

-- 5. Test RLS is working (should return 0 for other organizations)
SELECT 
  'RLS TEST' as info,
  COUNT(*) as visible_customers
FROM customers;

-- 6. Create organization onboarding checklist
SELECT 
  'PRODUCTION READINESS CHECKLIST' as item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_isolation') 
    THEN '✅ RLS enabled for customers'
    ELSE '❌ RLS missing for customers'
  END as status
UNION ALL
SELECT 
  'PRODUCTION READINESS CHECKLIST' as item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bottles' AND policyname = 'bottles_isolation') 
    THEN '✅ RLS enabled for bottles'
    ELSE '❌ RLS missing for bottles'
  END as status
UNION ALL
SELECT 
  'PRODUCTION READINESS CHECKLIST' as item,
  CASE 
    WHEN (SELECT COUNT(DISTINCT organization_id) FROM customers WHERE organization_id IS NOT NULL) > 0
    THEN '✅ Multi-tenant data structure'
    ELSE '❌ Single tenant detected'
  END as status;
