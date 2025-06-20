-- Fix RLS policies that might be causing issues
-- This script addresses potential circular dependencies in RLS policies

-- 1. Drop and recreate the organizations RLS policy to be less restrictive
DROP POLICY IF EXISTS "Allow users to read their own organization" ON organizations;
CREATE POLICY "Allow users to read their own organization"
ON organizations FOR SELECT
USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
);

-- 2. Add a policy to allow users to read organizations they belong to
DROP POLICY IF EXISTS "Allow users to read organizations they belong to" ON organizations;
CREATE POLICY "Allow users to read organizations they belong to"
ON organizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.organization_id = organizations.id 
        AND profiles.id = auth.uid()
    )
);

-- 3. Fix profiles RLS policy to be less restrictive
DROP POLICY IF EXISTS "Allow users to read profiles in their organization" ON profiles;
CREATE POLICY "Allow users to read profiles in their organization" ON profiles
FOR SELECT USING (
    id = auth.uid()  -- Users can always read their own profile
    OR 
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())  -- Or profiles in their org
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'  -- Or if they're an owner
);

-- 4. Add a fallback policy for profiles
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
CREATE POLICY "Allow users to read their own profile" ON profiles
FOR SELECT USING (id = auth.uid());

-- 5. Test the policies by checking if they exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'organizations')
ORDER BY tablename, policyname; 