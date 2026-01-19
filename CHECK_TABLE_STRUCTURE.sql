-- Check the structure of companies and tenants tables
-- to determine which one to use for invoice emails

-- Check companies table columns
SELECT 
  'companies' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- Check tenants table columns
SELECT 
  'tenants' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;
