-- Fix customer-bottle foreign key constraint issues
-- This script addresses the root cause of the foreign key violations

-- 1. First, let's check what customers actually exist
SELECT 
  'Current customers in database:' as info,
  COUNT(*) as customer_count
FROM customers 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- 2. Check what bottles are trying to reference non-existent customers
SELECT 
  'Bottles with invalid customer references:' as info,
  COUNT(*) as invalid_bottles
FROM bottles b
LEFT JOIN customers c ON b.assigned_customer = c."CustomerListID"
WHERE b.assigned_customer IS NOT NULL 
  AND c."CustomerListID" IS NULL;

-- 3. Fix bottles that reference non-existent customers by setting assigned_customer to NULL
UPDATE bottles 
SET assigned_customer = NULL
WHERE assigned_customer IS NOT NULL 
  AND assigned_customer NOT IN (
    SELECT "CustomerListID" FROM customers WHERE "CustomerListID" IS NOT NULL
  );

-- 4. Ensure the foreign key constraint is properly set up
-- Drop and recreate the foreign key constraint to be more permissive
ALTER TABLE bottles DROP CONSTRAINT IF EXISTS bottles_assigned_customer_fkey;

-- Recreate the foreign key constraint with proper handling
ALTER TABLE bottles 
ADD CONSTRAINT bottles_assigned_customer_fkey 
FOREIGN KEY (assigned_customer) 
REFERENCES customers("CustomerListID") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 5. Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_assigned_customer ON bottles(assigned_customer);

-- 6. Verify the fix
SELECT 
  'After fix - bottles with valid customer references:' as info,
  COUNT(*) as valid_bottles
FROM bottles b
INNER JOIN customers c ON b.assigned_customer = c."CustomerListID";

SELECT 
  'After fix - bottles with NULL customer references:' as info,
  COUNT(*) as null_customer_bottles
FROM bottles 
WHERE assigned_customer IS NULL;
