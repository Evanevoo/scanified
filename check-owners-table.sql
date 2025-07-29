-- Check the owners table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'owners'
ORDER BY column_name;

-- Check what's in the owners table
SELECT id, name, organization_id, created_at
FROM owners
LIMIT 10;

-- Check if there are any customer-owned entries
SELECT DISTINCT owner_type, owner_name
FROM bottles
WHERE owner_type = 'customer'
LIMIT 10; 