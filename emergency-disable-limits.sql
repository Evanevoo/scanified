-- Emergency fix: Completely disable the organization limits trigger
-- This will allow customer creation to proceed without any limits

-- 1. Drop all triggers that use check_organization_limits
DROP TRIGGER IF EXISTS check_organization_limits_customers ON customers;
DROP TRIGGER IF EXISTS check_organization_limits_profiles ON profiles;
DROP TRIGGER IF EXISTS check_organization_limits_bottles ON bottles;

-- 2. Drop the function completely
DROP FUNCTION IF EXISTS check_organization_limits() CASCADE;

-- 3. Check what organization we're dealing with
SELECT id, name, max_customers, max_users, max_bottles 
FROM organizations 
WHERE id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- 4. Set this organization to unlimited everything
UPDATE organizations 
SET max_customers = -1, max_users = -1, max_bottles = -1
WHERE id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- 5. Check if audit_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'audit_logs';

-- 6. If audit_logs doesn't exist, create a simple one
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id)
);

-- 7. Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policy for audit_logs
CREATE POLICY "Users can view audit logs for their organization" ON audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 9. Verify the organization settings
SELECT id, name, max_customers, max_users, max_bottles 
FROM organizations 
WHERE id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';
