-- Simple fix for the organization limits trigger
-- This will update the function to handle -1 as unlimited

-- First, let's see what triggers exist
SELECT 
    tgname, 
    pg_get_triggerdef(t.oid) 
FROM 
    pg_trigger t
JOIN 
    pg_class c ON t.tgrelid = c.oid
WHERE 
    c.relname IN ('customers', 'profiles', 'bottles');

-- Update the function to handle unlimited (-1) properly
CREATE OR REPLACE FUNCTION check_organization_limits()
RETURNS TRIGGER AS $$
DECLARE
    org_record RECORD;
    user_count INTEGER;
    customer_count INTEGER;
    bottle_count INTEGER;
    is_owner BOOLEAN;
BEGIN
    -- Check if user is owner (skip limits for owner)
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
    ) INTO is_owner;
    
    IF is_owner THEN
        RETURN NEW;
    END IF;
    
    -- Get organization details
    SELECT * INTO org_record FROM organizations WHERE id = NEW.organization_id;
    
    -- Check user limits when adding profiles
    IF TG_TABLE_NAME = 'profiles' THEN
        SELECT COUNT(*) INTO user_count FROM profiles WHERE organization_id = NEW.organization_id;
        -- Only check limit if max_users is not -1 (unlimited)
        IF org_record.max_users != -1 AND user_count >= org_record.max_users THEN
            RAISE EXCEPTION 'User limit reached for this organization (max: %)', org_record.max_users;
        END IF;
    END IF;
    
    -- Check customer limits when adding customers
    IF TG_TABLE_NAME = 'customers' THEN
        SELECT COUNT(*) INTO customer_count FROM customers WHERE organization_id = NEW.organization_id;
        -- Only check limit if max_customers is not -1 (unlimited)
        IF org_record.max_customers != -1 AND customer_count >= org_record.max_customers THEN
            RAISE EXCEPTION 'Customer limit reached for this organization (max: %)', org_record.max_customers;
        END IF;
    END IF;
    
    -- Check bottle limits when adding bottles
    IF TG_TABLE_NAME = 'bottles' THEN
        SELECT COUNT(*) INTO bottle_count FROM bottles WHERE organization_id = NEW.organization_id;
        -- Only check limit if max_bottles is not -1 (unlimited)
        IF org_record.max_bottles != -1 AND bottle_count >= org_record.max_bottles THEN
            RAISE EXCEPTION 'Bottle limit reached for this organization (max: %)', org_record.max_bottles;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was updated
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'check_organization_limits';
