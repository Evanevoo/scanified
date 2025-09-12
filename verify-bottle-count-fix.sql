-- Verify bottle counting fix
-- This will show you the correct counts after the fix

-- 1. Count bottles using the NEW logic (mutually exclusive)
SELECT 
  'Fixed Bottle Counts' as info,
  COALESCE(gas_type, 'Unknown Gas Type') as gas_type,
  COUNT(*) as total_bottles,
  -- Available: no assigned_customer OR status is available (but not if assigned)
  COUNT(CASE 
    WHEN (assigned_customer IS NULL OR assigned_customer = '') 
         AND (status IS NULL OR status = 'available' OR status = '')
    THEN 1 
  END) as available_bottles,
  -- Rented: has assigned_customer AND not maintenance/lost/retired
  COUNT(CASE 
    WHEN assigned_customer IS NOT NULL 
         AND assigned_customer != '' 
         AND status NOT IN ('maintenance', 'lost', 'retired')
    THEN 1 
  END) as rented_bottles,
  -- Maintenance
  COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_bottles,
  -- Lost
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bottles,
  -- Retired
  COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_bottles
FROM bottles 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
GROUP BY COALESCE(gas_type, 'Unknown Gas Type')
ORDER BY COALESCE(gas_type, 'Unknown Gas Type');

-- 2. Show the math to verify no double counting
SELECT 
  'Verification Math' as info,
  COALESCE(gas_type, 'Unknown Gas Type') as gas_type,
  total_bottles,
  available_bottles,
  rented_bottles,
  maintenance_bottles,
  lost_bottles,
  retired_bottles,
  (available_bottles + rented_bottles + maintenance_bottles + lost_bottles + retired_bottles) as calculated_total,
  CASE 
    WHEN total_bottles = (available_bottles + rented_bottles + maintenance_bottles + lost_bottles + retired_bottles)
    THEN '✅ CORRECT - No double counting'
    ELSE '❌ ERROR - Double counting detected'
  END as verification_result
FROM (
  SELECT 
    COALESCE(gas_type, 'Unknown Gas Type') as gas_type,
    COUNT(*) as total_bottles,
    COUNT(CASE 
      WHEN (assigned_customer IS NULL OR assigned_customer = '') 
           AND (status IS NULL OR status = 'available' OR status = '')
      THEN 1 
    END) as available_bottles,
    COUNT(CASE 
      WHEN assigned_customer IS NOT NULL 
           AND assigned_customer != '' 
           AND status NOT IN ('maintenance', 'lost', 'retired')
      THEN 1 
    END) as rented_bottles,
    COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_bottles,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bottles,
    COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_bottles
  FROM bottles 
  WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  GROUP BY COALESCE(gas_type, 'Unknown Gas Type')
) counts
ORDER BY gas_type;
