-- Fix Customer-Owned Bottles Status
-- 
-- Updates customer-owned bottles that have status "rented" back to "available"
-- Customer-owned bottles should always have status "available" regardless of assignment
-- 
-- Usage: Run this in Supabase SQL Editor

-- First, check how many customer-owned bottles have status "rented"
SELECT 
  COUNT(*) as customer_owned_with_rented_status,
  organization_id
FROM bottles
WHERE assigned_customer IS NOT NULL
  AND status = 'rented'
  AND (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%' 
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  )
GROUP BY organization_id;

-- Update customer-owned bottles from "rented" back to "available"
UPDATE bottles
SET status = 'available'
WHERE assigned_customer IS NOT NULL
  AND status = 'rented'
  AND (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%' 
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  );

-- Verify the fix
SELECT 
  COUNT(*) as customer_owned_bottles,
  status,
  organization_id
FROM bottles
WHERE assigned_customer IS NOT NULL
  AND (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%' 
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  )
GROUP BY status, organization_id;
