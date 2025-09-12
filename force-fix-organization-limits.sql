-- Check the current state of the check_organization_limits function
-- This will help us see if our update actually took effect

-- 1. Check the current function definition
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'check_organization_limits';

-- 2. Check what triggers are using this function
SELECT 
    tgname, 
    pg_get_triggerdef(t.oid) 
FROM 
    pg_trigger t
JOIN 
    pg_class c ON t.tgrelid = c.oid
WHERE 
    c.relname IN ('customers', 'profiles', 'bottles');

-- 3. Check the organization's current max_customers setting
SELECT id, name, max_customers 
FROM organizations 
WHERE max_customers = -1;

-- 4. If the function still has the old logic, we need to force update it
-- Let's drop and recreate it completely
DROP FUNCTION IF EXISTS check_organization_limits() CASCADE;

-- Create the corrected function
CREATE FUNCTION check_organization_limits()
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
        IF org_record.max_users IS NOT NULL AND org_record.max_users != -1 AND user_count >= org_record.max_users THEN
            RAISE EXCEPTION 'User limit reached for this organization (max: %)', org_record.max_users;
        END IF;
    END IF;
    
    -- Check customer limits when adding customers
    IF TG_TABLE_NAME = 'customers' THEN
        SELECT COUNT(*) INTO customer_count FROM customers WHERE organization_id = NEW.organization_id;
        -- Only check limit if max_customers is not -1 (unlimited)
        IF org_record.max_customers IS NOT NULL AND org_record.max_customers != -1 AND customer_count >= org_record.max_customers THEN
            RAISE EXCEPTION 'Customer limit reached for this organization (max: %)', org_record.max_customers;
        END IF;
    END IF;
    
    -- Check bottle limits when adding bottles
    IF TG_TABLE_NAME = 'bottles' THEN
        SELECT COUNT(*) INTO bottle_count FROM bottles WHERE organization_id = NEW.organization_id;
        -- Only check limit if max_bottles is not -1 (unlimited)
        IF org_record.max_bottles IS NOT NULL AND org_record.max_bottles != -1 AND bottle_count >= org_record.max_bottles THEN
            RAISE EXCEPTION 'Bottle limit reached for this organization (max: %)', org_record.max_bottles;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER check_organization_limits_customers
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION check_organization_limits();

CREATE TRIGGER check_organization_limits_profiles
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_organization_limits();

CREATE TRIGGER check_organization_limits_bottles
    BEFORE INSERT ON bottles
    FOR EACH ROW
    EXECUTE FUNCTION check_organization_limits();

-- Verify the function was updated
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'check_organization_limits';
