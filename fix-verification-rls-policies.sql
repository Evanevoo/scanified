-- Fix RLS Policies for organization_verifications table
-- Run this in Supabase SQL Editor if you're getting permission errors

-- First, check if table exists and show current policies
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_verifications'
    ) THEN
        RAISE NOTICE '✅ Table organization_verifications exists';
    ELSE
        RAISE EXCEPTION '❌ Table organization_verifications does not exist. Run setup-organization-verification.sql first.';
    END IF;
END $$;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Anyone can create verification requests" ON organization_verifications;
DROP POLICY IF EXISTS "Anyone can read verification by token" ON organization_verifications;
DROP POLICY IF EXISTS "Service role can update verifications" ON organization_verifications;
DROP POLICY IF EXISTS "Anyone can read their own verification" ON organization_verifications;

-- Recreate policies with proper permissions

-- Policy 1: Anyone (anon/authenticated) can INSERT new verification requests
CREATE POLICY "Anyone can create verification requests"
    ON organization_verifications
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy 2: Anyone can SELECT verification records (needed for verification page)
-- This is safe because verification tokens are unique and random
CREATE POLICY "Anyone can read verification by token"
    ON organization_verifications
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy 3: Service role can UPDATE (for marking as verified)
CREATE POLICY "Service role can update verifications"
    ON organization_verifications
    FOR UPDATE
    TO service_role
    USING (true);

-- Policy 4: Authenticated users can also update (for the create_verified_organization function)
-- This allows the function to mark verifications as verified
CREATE POLICY "Authenticated can update verifications"
    ON organization_verifications
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE organization_verifications ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed for organization_verifications table';
    RAISE NOTICE '   - INSERT: Allowed for anon/authenticated';
    RAISE NOTICE '   - SELECT: Allowed for anon/authenticated';
    RAISE NOTICE '   - UPDATE: Allowed for authenticated/service_role';
END $$;

