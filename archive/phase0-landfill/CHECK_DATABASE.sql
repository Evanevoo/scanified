-- Diagnostic query to check database state
-- Run this FIRST to see what tables exist

-- Check if organizations table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations') 
    THEN '✅ organizations table EXISTS'
    ELSE '❌ organizations table DOES NOT EXIST'
  END AS table_status;

-- List all tables in public schema
SELECT 
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- If organizations exists, show its columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;
