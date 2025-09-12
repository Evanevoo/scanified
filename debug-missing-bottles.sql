-- Debug the missing bottles issue
-- Let's find out what's happening with the 51 bottles that aren't being counted

-- 1. Check bottles with empty/null gas_type
SELECT 
  'Bottles with Empty Gas Type' as info,
  COUNT(*) as count,
  COUNT(CASE WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 1 END) as no_customer,
  COUNT(CASE WHEN assigned_customer IS NOT NULL AND assigned_customer != '' THEN 1 END) as has_customer,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as status_available,
  COUNT(CASE WHEN status = 'rented' THEN 1 END) as status_rented,
  COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as status_null
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (gas_type IS NULL OR gas_type = '');

-- 2. Check bottles with non-empty gas_type
SELECT 
  'Bottles with Gas Type' as info,
  gas_type,
  COUNT(*) as count,
  COUNT(CASE WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 1 END) as no_customer,
  COUNT(CASE WHEN assigned_customer IS NOT NULL AND assigned_customer != '' THEN 1 END) as has_customer,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as status_available,
  COUNT(CASE WHEN status = 'rented' THEN 1 END) as status_rented,
  COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as status_null
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND gas_type IS NOT NULL AND gas_type != ''
GROUP BY gas_type
ORDER BY gas_type;

-- 3. Show sample bottles with empty gas_type
SELECT 
  'Sample Bottles with Empty Gas Type' as info,
  barcode_number,
  gas_type,
  status,
  assigned_customer,
  customer_name,
  product_code,
  description
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (gas_type IS NULL OR gas_type = '')
LIMIT 10;

-- 4. Check if the issue is in the counting logic
SELECT 
  'Detailed Count Analysis' as info,
  gas_type,
  COUNT(*) as total,
  -- Available count
  COUNT(CASE 
    WHEN (assigned_customer IS NULL OR assigned_customer = '') 
         AND (status IS NULL OR status = 'available' OR status = '')
    THEN 1 
  END) as available_count,
  -- Rented count  
  COUNT(CASE 
    WHEN assigned_customer IS NOT NULL 
         AND assigned_customer != '' 
         AND status NOT IN ('maintenance', 'lost', 'retired')
    THEN 1 
  END) as rented_count,
  -- Other statuses
  COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_count,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count,
  COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_count,
  -- Uncounted bottles
  COUNT(*) - (
    COUNT(CASE 
      WHEN (assigned_customer IS NULL OR assigned_customer = '') 
           AND (status IS NULL OR status = 'available' OR status = '')
      THEN 1 
    END) +
    COUNT(CASE 
      WHEN assigned_customer IS NOT NULL 
           AND assigned_customer != '' 
           AND status NOT IN ('maintenance', 'lost', 'retired')
      THEN 1 
    END) +
    COUNT(CASE WHEN status = 'maintenance' THEN 1 END) +
    COUNT(CASE WHEN status = 'lost' THEN 1 END) +
    COUNT(CASE WHEN status = 'retired' THEN 1 END)
  ) as uncounted_bottles
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY gas_type
ORDER BY gas_type;
