-- Check what gas_type values exist in your bottles
-- This will show you exactly how the bottles are being grouped

SELECT 
  'Gas Type Distribution' as info,
  COALESCE(gas_type, 'NULL/EMPTY') as gas_type_display,
  COUNT(*) as bottle_count,
  COUNT(CASE WHEN assigned_customer IS NULL OR assigned_customer = '' THEN 1 END) as available_count,
  COUNT(CASE WHEN assigned_customer IS NOT NULL AND assigned_customer != '' THEN 1 END) as rented_count
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY gas_type
ORDER BY gas_type;

-- Check if there are bottles with empty gas_type that should be ARGON
SELECT 
  'Bottles with Empty Gas Type' as info,
  barcode_number,
  gas_type,
  product_code,
  description,
  assigned_customer,
  customer_name
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (gas_type IS NULL OR gas_type = '')
LIMIT 10;

-- Check if the empty gas_type bottles have ARGON in their description or product_code
SELECT 
  'Empty Gas Type - Check for ARGON' as info,
  COUNT(*) as total_empty_gas_type,
  COUNT(CASE WHEN UPPER(description) LIKE '%ARGON%' THEN 1 END) as description_has_argon,
  COUNT(CASE WHEN UPPER(product_code) LIKE '%ARGON%' THEN 1 END) as product_code_has_argon,
  COUNT(CASE WHEN UPPER(description) LIKE '%ARGON%' OR UPPER(product_code) LIKE '%ARGON%' THEN 1 END) as either_has_argon
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND (gas_type IS NULL OR gas_type = '');
