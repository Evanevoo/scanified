-- Fix RLS policies for roles table to allow admins to delete roles

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'roles';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Users can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Users can update roles" ON public.roles;
DROP POLICY IF EXISTS "Users can delete roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

-- Create comprehensive RLS policies for roles table
-- Allow all authenticated users to read roles
CREATE POLICY "Authenticated users can view roles" ON public.roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert roles
CREATE POLICY "Admins can insert roles" ON public.roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'admin' 
                OR profiles.role = 'owner'
                OR EXISTS (
                    SELECT 1 FROM public.roles r 
                    WHERE r.id = profiles.role_id 
                    AND r.name IN ('admin', 'owner')
                )
            )
        )
    );

-- Allow admins to update roles
CREATE POLICY "Admins can update roles" ON public.roles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'admin' 
                OR profiles.role = 'owner'
                OR EXISTS (
                    SELECT 1 FROM public.roles r 
                    WHERE r.id = profiles.role_id 
                    AND r.name IN ('admin', 'owner')
                )
            )
        )
    );

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles" ON public.roles
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'admin' 
                OR profiles.role = 'owner'
                OR EXISTS (
                    SELECT 1 FROM public.roles r 
                    WHERE r.id = profiles.role_id 
                    AND r.name IN ('admin', 'owner')
                )
            )
        )
    );

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'roles';

-- Test query to check if current user can delete (replace with actual role ID)
-- SELECT 'Can delete roles: ' || CASE 
--     WHEN EXISTS (
--         SELECT 1 FROM public.profiles 
--         WHERE profiles.id = auth.uid() 
--         AND (
--             profiles.role = 'admin' 
--             OR profiles.role = 'owner'
--             OR EXISTS (
--                 SELECT 1 FROM public.roles r 
--                 WHERE r.id = profiles.role_id 
--                 AND r.name IN ('admin', 'owner')
--             )
--         )
--     ) THEN 'YES' 
--     ELSE 'NO' 
-- END as can_delete;
