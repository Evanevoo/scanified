-- Update customers RLS policies
-- 1. Read access
DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's customers." ON public.customers;
CREATE POLICY "Allow read access to customers based on permissions" ON public.customers
FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        (get_my_claim('role_id')::uuid IS NOT NULL AND has_permission('read:customers'))
        OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
);

-- 2. Write (Insert) access
DROP POLICY IF EXISTS "Allow authenticated users to create customers" ON public.customers;
CREATE POLICY "Allow insert access to customers based on permissions" ON public.customers
FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (get_my_claim('role_id')::uuid IS NOT NULL AND has_permission('write:customers'))
        OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
);

-- 3. Update access
DROP POLICY IF EXISTS "Allow authenticated users to update their own organization's customers" ON public.customers;
CREATE POLICY "Allow update access to customers based on permissions" ON public.customers
FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (get_my_claim('role_id')::uuid IS NOT NULL AND has_permission('write:customers'))
        OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
);

-- 4. Delete access
DROP POLICY IF EXISTS "Allow authenticated users to delete their own organization's customers" ON public.customers;
CREATE POLICY "Allow delete access to customers based on permissions" ON public.customers
FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (get_my_claim('role_id')::uuid IS NOT NULL AND has_permission('delete:customers'))
        OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
);

-- Update cylinders RLS policies (example for cylinders)
-- ... (Similar policies for SELECT, INSERT, UPDATE, DELETE on 'cylinders' using has_permission('read:cylinders'), etc.)
-- This would be repeated for all relevant tables like invoices, rentals, etc.

-- Update profiles RLS policy for user management
DROP POLICY IF EXISTS "Allow admin to manage users in their org" ON public.profiles;
CREATE POLICY "Allow user management based on permissions" ON public.profiles
FOR ALL USING (
    (
        (get_my_claim('role_id')::uuid IS NOT NULL AND has_permission('manage:users'))
        AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    id = auth.uid() -- users can always see their own profile
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
); 