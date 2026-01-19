-- Check Last Backup
-- 
-- Query to check when the last backup was created
-- 
-- Usage: Run this in Supabase SQL Editor

-- Step 1: Check if backup_logs table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backup_logs') THEN
    RAISE NOTICE '✅ backup_logs table exists';
  ELSE
    RAISE NOTICE '⚠️ backup_logs table does NOT exist. Run the migration: supabase/migrations/create_backup_logs_table.sql';
  END IF;
END $$;

-- Step 2: Check backup logs for the most recent backup
SELECT 
  id,
  backup_type,
  started_at,
  completed_at,
  status,
  records_backed_up,
  backup_size,
  created_at,
  metadata->>'total_tenants' as total_tenants,
  metadata->>'successful_tenants' as successful_tenants
FROM backup_logs
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: If no results above, check storage bucket manually:
-- 
-- OPTION A: Via Supabase Dashboard
-- 1. Go to Supabase Dashboard > Storage
-- 2. Open the 'backups' bucket
-- 3. Check folders for dates (YYYY-MM-DD format)
-- 4. Most recent folder = last backup date
--
-- OPTION B: Via SQL (if you have storage functions)
-- Note: Storage must be checked via API, not SQL
--
-- OPTION C: Check if backups bucket exists
-- Run this in Supabase Dashboard > Storage to see if 'backups' bucket exists

-- Step 4: Check for tenant-specific backups (if any organizations exist)
SELECT 
  id,
  name,
  created_at as org_created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- Note: If backup_logs is empty, backups may still exist in Storage.
-- Check Supabase Dashboard > Storage > backups bucket for actual backup files.
