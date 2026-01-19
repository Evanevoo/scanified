-- Check Bottles at Locations vs Assigned to Customers
-- 
-- This query helps identify bottles that might be incorrectly assigned to customers
-- when they should just be at locations (in-house)
-- 
-- Usage: Run this in Supabase SQL Editor

-- Check bottles that have a location but might be incorrectly assigned
-- Bottles at locations (warehouses) should typically NOT have assigned_customer
SELECT 
  location,
  COUNT(*) as total_bottles,
  COUNT(CASE WHEN assigned_customer IS NOT NULL THEN 1 END) as assigned_to_customers,
  COUNT(CASE WHEN assigned_customer IS NULL THEN 1 END) as unassigned_at_location,
  COUNT(CASE WHEN status = 'rented' AND assigned_customer IS NOT NULL THEN 1 END) as rented_at_location,
  COUNT(CASE WHEN status = 'available' AND assigned_customer IS NULL THEN 1 END) as available_at_location
FROM bottles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND location IS NOT NULL
  AND location != ''
GROUP BY location
ORDER BY total_bottles DESC;

-- Check if there are bottles assigned to customers but at warehouse locations
-- These might need to be unassigned if they're just at warehouses
SELECT 
  location,
  assigned_customer,
  status,
  COUNT(*) as count
FROM bottles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND assigned_customer IS NOT NULL
  AND location IS NOT NULL
  AND location != ''
  AND (
    LOWER(location) LIKE '%warehouse%' 
    OR LOWER(location) LIKE '%facility%'
    OR LOWER(location) IN ('saskatoon', 'regina', 'chilliwack', 'prince george')
  )
GROUP BY location, assigned_customer, status
ORDER BY count DESC;

-- Summary: How many bottles are at locations vs assigned to customers
SELECT 
  CASE 
    WHEN assigned_customer IS NULL THEN 'At Location (No Customer)'
    WHEN assigned_customer IS NOT NULL THEN 'Assigned to Customer'
  END as assignment_type,
  status,
  COUNT(*) as count
FROM bottles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND location IS NOT NULL
  AND location != ''
GROUP BY 
  CASE 
    WHEN assigned_customer IS NULL THEN 'At Location (No Customer)'
    WHEN assigned_customer IS NOT NULL THEN 'Assigned to Customer'
  END,
  status
ORDER BY assignment_type, status;
