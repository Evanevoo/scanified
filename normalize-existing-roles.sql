-- Normalize existing roles to handle case-insensitive matching
-- This fixes issues where "Admin" and "admin" are treated as different roles

-- First, let's see what we have
SELECT 'Current roles in profiles table:' as info, role, count(*) as count
FROM profiles 
WHERE role IS NOT NULL 
GROUP BY role
UNION ALL
SELECT 'Current role_ids in profiles table:' as info, 
       CASE WHEN role_id IS NOT NULL THEN 'Has role_id' ELSE 'No role_id' END, 
       count(*)
FROM profiles 
GROUP BY CASE WHEN role_id IS NOT NULL THEN 'Has role_id' ELSE 'No role_id' END;

-- Normalize role names in profiles table (make them lowercase)
UPDATE profiles SET role = lower(trim(role)) WHERE role IS NOT NULL;

-- Create a function to normalize role matching
CREATE OR REPLACE FUNCTION normalize_role_name(input_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Convert to lowercase, trim whitespace, replace spaces with underscores
    RETURN lower(trim(regexp_replace(input_role, '\s+', '_', 'g')));
END;
$$;

-- Create a function to find role_id by name (case-insensitive)
CREATE OR REPLACE FUNCTION get_role_id_by_name(role_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    role_uuid UUID;
BEGIN
    SELECT id INTO role_uuid 
    FROM roles 
    WHERE normalize_role_name(name) = normalize_role_name(role_name)
    LIMIT 1;
    
    RETURN role_uuid;
END;
$$;

-- Update all profiles to have proper role_id based on their role text
UPDATE profiles 
SET role_id = get_role_id_by_name(role)
WHERE role IS NOT NULL AND role_id IS NULL;

-- For any profiles that still don't have role_id, set to 'user'
UPDATE profiles 
SET role_id = get_role_id_by_name('user')
WHERE role_id IS NULL;

-- Show the results
SELECT 'After normalization:' as info, role, count(*) as count
FROM profiles 
WHERE role IS NOT NULL 
GROUP BY role
UNION ALL
SELECT 'Profiles with role_id:' as info, 
       CASE WHEN role_id IS NOT NULL THEN 'Has role_id' ELSE 'No role_id' END, 
       count(*)
FROM profiles 
GROUP BY CASE WHEN role_id IS NOT NULL THEN 'Has role_id' ELSE 'No role_id' END;
