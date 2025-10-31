# 🔒 Row Level Security (RLS) Implementation Guide

## ⚠️ CRITICAL: Read Before Applying

Row Level Security (RLS) is **THE MOST IMPORTANT** security feature for your multi-tenant SaaS application. Without it, a malicious user could potentially access data from other companies.

## 🎯 What is RLS?

RLS is a PostgreSQL feature that adds database-level access control. Even if your application code has bugs, RLS policies will prevent unauthorized data access at the database level.

## 📋 Step-by-Step Implementation

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Select your project: **gas-cylinder-app**
4. Click on **SQL Editor** in the left sidebar

### Step 2: Apply RLS Policies
1. Open the file `supabase-rls-policies.sql` in this repository
2. Copy the ENTIRE contents
3. Paste into the Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)
5. Wait for confirmation: "Success. No rows returned"

### Step 3: Verify RLS is Enabled
Run this query in SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bottles', 'customers', 'bottle_scans', 'imported_invoices', 'rentals', 'locations')
ORDER BY tablename;
```

**Expected Result:**
```
tablename           | rowsecurity
--------------------|------------
bottle_scans        | true
bottles             | true
customers           | true
imported_invoices   | true
locations           | true
rentals             | true
```

All tables should show `rowsecurity = true`.

### Step 4: Test RLS Policies

#### Test 1: Check Your Own Data (Should Work)
```sql
SELECT COUNT(*) FROM bottles;
```
Expected: Shows the count of bottles in YOUR organization

#### Test 2: Check Policies Exist
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('bottles', 'customers')
ORDER BY tablename;
```
Expected: Should list all the RLS policies

#### Test 3: Try Cross-Organization Access (Should Fail)
**Note:** This test requires knowing another organization's ID
```sql
-- This should return 0 rows (blocked by RLS)
SELECT * FROM bottles WHERE organization_id = 'some-other-org-id-here';
```

## ⚙️ How RLS Works

### Authentication Flow:
1. User logs in → Supabase creates JWT token with `auth.uid()`
2. User queries database → RLS policy checks:
   - Get user's `organization_id` from `profiles` table using `auth.uid()`
   - Filter all queries to only return rows matching that `organization_id`
3. Database enforces this AUTOMATICALLY for all queries

### Example:
```sql
-- User runs this query:
SELECT * FROM bottles;

-- RLS automatically converts it to:
SELECT * FROM bottles 
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
);
```

## 🚨 Important Security Notes

### DO:
- ✅ Keep RLS enabled in production
- ✅ Test RLS policies thoroughly
- ✅ Use anon/authenticated keys for client applications
- ✅ Add RLS to ALL multi-tenant tables
- ✅ Regularly audit RLS policies

### DON'T:
- ❌ Disable RLS in production
- ❌ Use service_role key in client-side code
- ❌ Bypass RLS except for legitimate admin operations
- ❌ Forget to add RLS when creating new tables
- ❌ Assume application-level security is sufficient

## 🔑 Supabase API Keys

Your project has multiple API keys:

| Key Type | Usage | RLS Enforcement |
|----------|-------|-----------------|
| `anon` | Client-side (web/mobile apps) | ✅ YES - RLS applies |
| `service_role` | Server-side admin tasks | ❌ NO - Bypasses RLS |

**NEVER expose `service_role` key in client code!**

## 🧪 Testing Checklist

After applying RLS, test these scenarios:

- [ ] Login as User A from Organization A
- [ ] Verify you can see bottles from Organization A
- [ ] Verify you CANNOT see bottles from Organization B
- [ ] Try direct database queries with different user accounts
- [ ] Test all CRUD operations (Create, Read, Update, Delete)
- [ ] Verify search functionality only shows own organization's data
- [ ] Test bulk operations don't affect other organizations
- [ ] Verify imports/exports respect organization boundaries

## 🐛 Troubleshooting

### Issue: "RLS policy blocks legitimate access"
**Solution:** Check that:
1. User has a valid profile with `organization_id`
2. Bottles have correct `organization_id` set
3. User is authenticated (JWT token valid)

### Issue: "Performance slowdown after enabling RLS"
**Solution:** 
1. Add indexes on `organization_id` columns
2. Run `ANALYZE` on affected tables
3. Check query execution plans

```sql
-- Add indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_bottles_organization_id ON bottles(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_organization_id ON bottle_scans(organization_id);
```

### Issue: "Can't insert/update data"
**Solution:** Ensure:
1. Your profile has a valid `organization_id`
2. You're setting `organization_id` in INSERT statements
3. You're not trying to change `organization_id` to another org's ID

## 📊 Monitoring RLS

### Check Active Policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'bottles';
```

### Check RLS Status:
```sql
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public';
```

## 🔄 Updating RLS Policies

To modify a policy:
1. Drop the old policy
2. Create the new policy

```sql
-- Example: Update bottles policy
DROP POLICY IF EXISTS "Users can only access their organization's bottles" ON bottles;

CREATE POLICY "Updated policy name"
ON bottles
FOR ALL
USING (
  -- New policy logic here
  organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenancy Best Practices](https://supabase.com/docs/guides/database/multi-tenancy)

## ✅ Success Criteria

RLS is properly implemented when:
1. All multi-tenant tables have RLS enabled
2. All tables have appropriate policies
3. Cross-organization access attempts return 0 rows
4. Application works normally for authenticated users
5. Performance is acceptable
6. All tests pass

---

**🔴 PRIORITY: CRITICAL**  
**⏰ TIMEFRAME: IMPLEMENT IMMEDIATELY**  
**👥 REQUIRED: Database Admin + Lead Developer**

