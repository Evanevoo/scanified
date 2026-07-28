-- Fix Bottle Status SQL Script
-- 
-- Updates bottles that are assigned to customers but have status "available"
-- to status "rented" (unless they are customer-owned)
-- 
-- Usage: Run this in Supabase SQL Editor

-- First, check what ownership values exist for these bottles
SELECT 
  ownership,
  COUNT(*) as count,
  organization_id
FROM bottles
WHERE assigned_customer IS NOT NULL
  AND status = 'available'
GROUP BY ownership, organization_id
ORDER BY count DESC;

-- Update bottles assigned to customers from "available" to "rented"
-- But skip customer-owned bottles (where ownership contains "customer" or "owned")
-- Note: Using AND with NOT LIKE means ALL conditions must be true (ownership must NOT contain customer AND NOT contain owned)
-- This is correct - we want to update bottles that are NOT customer-owned
UPDATE bottles
SET status = 'rented'
WHERE assigned_customer IS NOT NULL
  AND status = 'available'
  AND (
    ownership IS NULL 
    OR ownership = ''
    OR (LOWER(TRIM(ownership)) NOT LIKE '%customer%' AND LOWER(TRIM(ownership)) NOT LIKE '%owned%')
  );

-- Show summary of what was updated
SELECT 
  COUNT(*) as bottles_updated,
  organization_id
FROM bottles
WHERE assigned_customer IS NOT NULL
  AND status = 'rented'
GROUP BY organization_id;

-- OPTIONAL: If you want to update ALL assigned bottles to "rented" regardless of ownership,
-- uncomment and run this (this will update the 387 bottles that are still "available"):
UPDATE bottles
SET status = 'rented'
WHERE assigned_customer IS NOT NULL
  AND status = 'available';
