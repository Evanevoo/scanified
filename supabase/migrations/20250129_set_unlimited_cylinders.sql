-- Set cylinder/bottle limits to unlimited (999999) so organizations can add bottles.
-- Run this in Supabase SQL Editor if you see "Cylinder limit exceeded" when adding a bottle.
--
-- To apply to ALL organizations (recommended for small teams / single-tenant):
UPDATE organizations
SET max_cylinders = 999999,
    max_bottles = 999999
WHERE max_cylinders IS DISTINCT FROM 999999
   OR max_bottles IS DISTINCT FROM 999999;

-- To apply to ONE organization only, use instead (replace YOUR_ORG_ID with your organization UUID):
-- UPDATE organizations
-- SET max_cylinders = 999999, max_bottles = 999999
-- WHERE id = 'YOUR_ORG_ID';
