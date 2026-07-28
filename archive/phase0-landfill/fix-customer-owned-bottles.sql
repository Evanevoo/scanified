-- Fix Customer-Owned Bottles Status
--
-- Customer-owned bottles are the customer's property, not company rental stock.
-- They must not be "rented" or use fleet fill statuses (filled/empty).
-- Uses status = 'available' (allowed by bottles_status_check; app displays as N/A).
--
-- Usage: Run this in Supabase SQL Editor

-- Preview: customer-owned bottles with invalid fleet-style statuses
SELECT
  COUNT(*) AS bottles_to_fix,
  status,
  organization_id
FROM bottles
WHERE (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%'
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  )
  AND LOWER(TRIM(status)) IN ('rented', 'filled', 'full', 'empty')
GROUP BY status, organization_id;

-- Fix: rented / filled / empty -> available (lost is kept)
UPDATE bottles
SET status = 'available'
WHERE (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%'
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  )
  AND LOWER(TRIM(status)) IN ('rented', 'filled', 'full', 'empty');

-- Verify
SELECT
  COUNT(*) AS customer_owned_bottles,
  status,
  organization_id
FROM bottles
WHERE (
    LOWER(TRIM(ownership)) LIKE '%customer%owned%'
    OR LOWER(TRIM(ownership)) LIKE '%owned%customer%'
    OR LOWER(TRIM(ownership)) LIKE '%customer owned%'
  )
GROUP BY status, organization_id;
