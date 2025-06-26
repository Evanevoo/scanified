-- Fix bottles table foreign key constraint issue
-- This migration addresses the "bottles_assigned_customer_fkey" constraint violation

-- First, check if the constraint exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bottles_assigned_customer_fkey' 
        AND table_name = 'bottles'
    ) THEN
        -- Remove the problematic foreign key constraint
        ALTER TABLE bottles DROP CONSTRAINT bottles_assigned_customer_fkey;
        RAISE NOTICE 'Removed bottles_assigned_customer_fkey constraint';
    ELSE
        RAISE NOTICE 'bottles_assigned_customer_fkey constraint does not exist';
    END IF;
END $$;

-- Clean up any existing bottles with invalid assigned_customer values
UPDATE bottles 
SET assigned_customer = NULL 
WHERE assigned_customer IS NOT NULL 
    AND assigned_customer NOT IN (
        SELECT "CustomerListID" FROM customers
    );

-- Add an index on assigned_customer for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_assigned_customer ON bottles(assigned_customer);

-- Add a comment to document the change
COMMENT ON COLUMN bottles.assigned_customer IS 'Customer ID reference. Can be NULL if no customer is assigned.'; 