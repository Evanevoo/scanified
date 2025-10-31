-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================
-- CRITICAL: Run these commands in your Supabase SQL Editor
-- This provides database-level security to prevent cross-organization data access
-- ============================================================================

-- 1. ENABLE RLS ON BOTTLES TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

-- 2. CREATE RLS POLICY FOR BOTTLES TABLE
-- ----------------------------------------------------------------------------
-- This policy ensures users can only access bottles from their own organization
CREATE POLICY "Users can only access their organization's bottles"
ON bottles
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 3. VERIFY RLS IS ENABLED
-- ----------------------------------------------------------------------------
-- Run this query to verify RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'bottles';
-- Expected result: rowsecurity = true

-- ============================================================================
-- ADDITIONAL TABLES THAT NEED RLS (CRITICAL FOR MULTI-TENANT SAAS)
-- ============================================================================

-- 4. ENABLE RLS ON CUSTOMERS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their organization's customers"
ON customers
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 5. ENABLE RLS ON BOTTLE_SCANS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE bottle_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their organization's scans"
ON bottle_scans
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 6. ENABLE RLS ON IMPORTED_INVOICES TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE imported_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their organization's invoices"
ON imported_invoices
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 7. ENABLE RLS ON RENTALS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their organization's rentals"
ON rentals
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 8. ENABLE RLS ON LOCATIONS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their organization's locations"
ON locations
FOR ALL
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- Test 1: Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bottles', 'customers', 'bottle_scans', 'imported_invoices', 'rentals', 'locations')
ORDER BY tablename;

-- Test 2: Try to access bottles (should only show your organization's bottles)
SELECT COUNT(*) FROM bottles;

-- Test 3: Try to access a bottle from another organization (should return 0 rows)
-- Replace 'other-org-id' with an actual organization ID you don't have access to
-- SELECT * FROM bottles WHERE organization_id = 'other-org-id';
-- Expected: 0 rows (access denied by RLS)

-- ============================================================================
-- ROLLBACK (ONLY IF NEEDED - DO NOT RUN IN PRODUCTION)
-- ============================================================================

-- To disable RLS (NOT RECOMMENDED for production):
-- ALTER TABLE bottles DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can only access their organization's bottles" ON bottles;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. RLS policies are enforced at the database level
-- 2. Even if application code has bugs, RLS will prevent unauthorized access
-- 3. RLS adds slight performance overhead but is essential for multi-tenant security
-- 4. Always test RLS policies thoroughly before deploying to production
-- 5. Use service_role key ONLY for admin operations that need to bypass RLS
-- 6. Regular users should ALWAYS use the anon/authenticated keys that respect RLS

