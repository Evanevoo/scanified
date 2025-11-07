-- Fix Organization and Scans Issue
-- This script will:
-- 1. Check which users are assigned to the deleted organization
-- 2. Update users to the active organization
-- 3. Migrate scans from deleted to active organization
-- 4. Show a summary of changes

-- Step 1: Check current state
-- Find users assigned to deleted organization
SELECT 
  p.id as profile_id,
  p.email,
  p.organization_id,
  o.name as org_name,
  o.deleted_at,
  CASE 
    WHEN o.deleted_at IS NOT NULL THEN 'DELETED'
    ELSE 'ACTIVE'
  END as org_status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696' -- Deleted organization
ORDER BY p.email;

-- Step 2: Check scans in deleted organization
SELECT 
  COUNT(*) as total_scans,
  COUNT(DISTINCT barcode_number) as unique_bottles,
  MIN(created_at) as first_scan,
  MAX(created_at) as last_scan
FROM scans
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- Step 3: Update users to active organization
-- IMPORTANT: Review the results from Step 1 before running this!
-- Uncomment the following lines to execute:

-- UPDATE profiles
-- SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d' -- Active organization
-- WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696'; -- Deleted organization

-- Step 4: Migrate scans from deleted to active organization
-- IMPORTANT: This will move ALL scans to the active organization
-- Uncomment the following lines to execute:

-- UPDATE scans
-- SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
-- WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- UPDATE bottle_scans
-- SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
-- WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- Step 5: Verify the migration
SELECT 
  'After Migration - Scans in Active Org' as check_type,
  COUNT(*) as count
FROM scans
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
UNION ALL
SELECT 
  'After Migration - Scans in Deleted Org',
  COUNT(*)
FROM scans
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696'
UNION ALL
SELECT 
  'After Migration - Users in Active Org',
  COUNT(*)
FROM profiles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
UNION ALL
SELECT 
  'After Migration - Users in Deleted Org',
  COUNT(*)
FROM profiles
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

