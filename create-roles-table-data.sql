-- Create roles in the roles table to align with role_permissions system
-- This will fix the N/A display issue in user management

-- Insert standard roles into the roles table
INSERT INTO roles (id, name, description, created_at) VALUES
  (gen_random_uuid(), 'admin', 'Administrator with full access to all features', NOW()),
  (gen_random_uuid(), 'manager', 'Manager with access to operations and reporting', NOW()),
  (gen_random_uuid(), 'user', 'Standard user with basic access', NOW()),
  (gen_random_uuid(), 'owner', 'Organization owner with full control', NOW())
ON CONFLICT (name) DO NOTHING;

-- Update existing user profiles to use role_id instead of role text
-- This will map text roles to UUID roles

-- First, let's see what we're working with
DO $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
    owner_role_id UUID;
BEGIN
    -- Get the role IDs
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO manager_role_id FROM roles WHERE name = 'manager';
    SELECT id INTO user_role_id FROM roles WHERE name = 'user';
    SELECT id INTO owner_role_id FROM roles WHERE name = 'owner';
    
    -- Update profiles with text roles to use role_id
    UPDATE profiles SET role_id = admin_role_id WHERE role = 'admin' AND role_id IS NULL;
    UPDATE profiles SET role_id = manager_role_id WHERE role = 'manager' AND role_id IS NULL;
    UPDATE profiles SET role_id = user_role_id WHERE role = 'user' AND role_id IS NULL;
    UPDATE profiles SET role_id = owner_role_id WHERE role = 'owner' AND role_id IS NULL;
    
    -- For any profiles that still don't have role_id, default to user
    UPDATE profiles SET role_id = user_role_id WHERE role_id IS NULL;
    
    RAISE NOTICE 'Roles created and profiles updated successfully';
END $$;

-- Verify the results
SELECT 'roles table:' as table_name, count(*) as count FROM roles
UNION ALL
SELECT 'profiles with role_id:' as table_name, count(*) as count FROM profiles WHERE role_id IS NOT NULL
UNION ALL  
SELECT 'profiles with role text:' as table_name, count(*) as count FROM profiles WHERE role IS NOT NULL;
