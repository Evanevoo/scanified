-- Fix customers table trigger for organization_id
-- This script adds the missing trigger to automatically set organization_id for customers

-- Create trigger function for customers table
CREATE OR REPLACE FUNCTION set_customer_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
BEGIN
    -- Get the user's organization_id
    SELECT organization_id INTO user_org_id
    FROM profiles 
    WHERE id = auth.uid();
    
    -- If user has an organization_id, set it
    IF user_org_id IS NOT NULL THEN
        NEW.organization_id = user_org_id;
    ELSE
        -- If no organization_id, raise an error
        RAISE EXCEPTION 'User must be assigned to an organization to create customers';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_organization_id_customers ON customers;

-- Create trigger for customers table
CREATE TRIGGER set_organization_id_customers
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_organization_id();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'set_organization_id_customers'; 