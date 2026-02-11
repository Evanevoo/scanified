-- Fix bottles that are at a customer but have wrong status.
-- When assigned_customer is set, status should be 'rented' (or 'available' only for customer-owned).
-- 1) filled/full => rented (fill action overwrote status)
-- 2) available => rented (import/upload left status as available when at customer)

-- Bottles at a customer should have status 'rented', not 'filled' or 'full'.
UPDATE bottles
SET status = 'rented'
WHERE assigned_customer IS NOT NULL
  AND status IN ('filled', 'full');

-- Bottles at a customer should have status 'rented', not 'available'.
UPDATE bottles
SET status = 'rented'
WHERE assigned_customer IS NOT NULL
  AND status = 'available';

-- Bottles that have a *customer* stored in location (wrong column). That value is a customer, not a location.
-- e.g. "STEVENSON INDUSTRIAL - HEADER ONLY:STEVENSON INDUSTRIAL REFRIG - SASKATOON (80000635-1596735793A)".
-- Match ID in parentheses to customers, set assigned_customer/customer_name/status, and clear location.
UPDATE bottles b
SET
  assigned_customer = c."CustomerListID",
  customer_name = c.name,
  status = 'rented',
  location = ''
FROM customers c
WHERE b.organization_id = c.organization_id
  AND b.assigned_customer IS NULL
  AND b.location ~ '\([A-Za-z0-9\-]+\)?\s*$'
  AND (regexp_match(b.location, '\(([A-Za-z0-9\-]+)\)?\s*$'))[1] IS NOT NULL
  AND UPPER(trim((regexp_match(b.location, '\(([A-Za-z0-9\-]+)\)?\s*$'))[1])) = UPPER(c."CustomerListID");
