# Quick Fix Instructions

## 1. NPM Dependency Issue

The MUI Lab version conflict has been fixed in package.json. Run these commands:

```bash
# Clean install to resolve dependencies
rm -rf node_modules package-lock.json
npm install

# Or if you still get errors, use legacy peer deps
npm install --legacy-peer-deps
```

## 2. Database Column Case Sensitivity Issue

The error `column "customerlistid" does not exist` occurs because PostgreSQL is case-sensitive with quoted identifiers. Since the app uses `CustomerListID` throughout the codebase, we should keep it that way.

### The Problem
The error likely occurs because somewhere in your queries, the column name is being lowercased. This can happen when:
- Using ORM tools that lowercase column names
- Missing quotes around the column name in queries
- Supabase client auto-lowercasing column names

### Solution: Ensure Proper Column References

1. **Check your Supabase client queries** - Make sure you're using the exact case:
```javascript
// Correct
.select('CustomerListID, name')
.eq('CustomerListID', customerId)

// Incorrect (will cause the error)
.select('customerlistid, name')
.eq('customerlistid', customerId)
```

2. **If using the PostgREST API directly**, use double quotes:
```sql
-- When referencing in raw SQL, use quotes for case-sensitive columns
SELECT "CustomerListID", name FROM customers;
```

3. **Create an alias view (if needed)**:
If you have tools that lowercase column names, create a view with lowercase aliases:
```sql
CREATE OR REPLACE VIEW customers_view AS
SELECT 
  id,
  organization_id,
  "CustomerListID" as customerlistid,
  "CustomerListID",  -- Keep both for compatibility
  name,
  customer_number,
  email,
  phone,
  address,
  city,
  province,
  postal_code,
  country,
  location,
  created_at,
  updated_at
FROM customers;

-- Grant permissions
GRANT SELECT ON customers_view TO authenticated;
```

## Alternative: Update Your Query

If you're getting this error in a specific query, check:

1. **Is the column name spelled correctly with proper case?**
2. **Are you using the Supabase client correctly?**
3. **Is there a typo in your JavaScript code?**

Example of a correct query:
```javascript
const { data, error } = await supabase
  .from('customers')
  .select('CustomerListID, name')  // Exact case match
  .eq('organization_id', orgId);
```

## Important Notes

- The original migration is correct and uses `CustomerListID` (with capitals)
- All JavaScript code in the app references `CustomerListID` with capitals
- The error suggests something is lowercasing the column name in your queries
- The SQL linter errors in VS Code can be ignored - they're for a different SQL dialect 