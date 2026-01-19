-- Fix Bottles at Locations Incorrectly Assigned to Customers
-- 
-- This script identifies and fixes bottles that are at locations (warehouses/facilities)
-- but were incorrectly assigned to customers during import
-- 
-- Usage: Run this in Supabase SQL Editor

-- Step 1: Check how many bottles are at locations but assigned to customers
-- These should be unassigned (they're in-house inventory)
SELECT 
  location,
  COUNT(*) as total_bottles,
  COUNT(CASE WHEN assigned_customer IS NOT NULL THEN 1 END) as incorrectly_assigned,
  COUNT(CASE WHEN assigned_customer IS NULL THEN 1 END) as correctly_unassigned
FROM bottles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND location IS NOT NULL
  AND location != ''
  AND (
    LOWER(location) LIKE '%saskatoon%' 
    OR LOWER(location) LIKE '%regina%'
    OR LOWER(location) LIKE '%chilliwack%'
    OR LOWER(location) LIKE '%prince george%'
    OR LOWER(location) LIKE '%warehouse%'
    OR LOWER(location) LIKE '%facility%'
  )
GROUP BY location
ORDER BY incorrectly_assigned DESC;

-- Step 2: Check if location names match customer names (this could cause incorrect assignment)
SELECT 
  b.location,
  b.assigned_customer,
  c.name as customer_name,
  COUNT(*) as count
FROM bottles b
LEFT JOIN customers c ON b.assigned_customer = c."CustomerListID" AND b.organization_id = c.organization_id
WHERE b.organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND b.location IS NOT NULL
  AND b.location != ''
  AND b.assigned_customer IS NOT NULL
  AND (
    LOWER(b.location) LIKE '%saskatoon%' 
    OR LOWER(b.location) LIKE '%regina%'
    OR LOWER(b.location) LIKE '%chilliwack%'
    OR LOWER(b.location) LIKE '%prince george%'
    OR LOWER(b.location) LIKE '%warehouse%'
    OR LOWER(b.location) LIKE '%facility%'
  )
GROUP BY b.location, b.assigned_customer, c.name
ORDER BY count DESC;

-- Step 3: Unassign bottles at facility locations that shouldn't have customers
-- ONLY run this if you're sure these bottles should be unassigned!
-- Review the results from Step 1 and Step 2 first
UPDATE bottles
SET 
  assigned_customer = NULL,
  customer_name = NULL,
  status = 'available'
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND location IS NOT NULL
  AND location != ''
  AND assigned_customer IS NOT NULL
  AND (
    -- Facility locations that shouldn't have customer assignments
    LOWER(location) LIKE '%warehouse%' 
    OR LOWER(location) LIKE '%facility%'
    OR LOWER(location) LIKE '%depot%'
    OR LOWER(location) LIKE '%yard%'
    -- Or specific location names if they're your facilities
    OR LOWER(location) IN ('saskatoon', 'regina', 'chilliwack', 'prince george', 'prince_george')
  )
  -- Only unassign if customer_name matches location (likely incorrect assignment)
  AND (
    LOWER(customer_name) = LOWER(location)
    OR LOWER(customer_name) LIKE '%' || LOWER(location) || '%'
  );

-- Step 4: Verify the fix
SELECT 
  location,
  COUNT(*) as total_bottles,
  COUNT(CASE WHEN assigned_customer IS NOT NULL THEN 1 END) as still_assigned,
  COUNT(CASE WHEN assigned_customer IS NULL THEN 1 END) as unassigned,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available_status
FROM bottles
WHERE organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'  -- Replace with your organization_id
  AND location IS NOT NULL
  AND location != ''
GROUP BY location
ORDER BY total_bottles DESC;
