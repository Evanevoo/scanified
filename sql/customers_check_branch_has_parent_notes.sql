-- customers.check_branch_has_parent (Scanified / gas-cylinder-app)
--
-- If saves fail when setting parent_customer_id, inspect the live definition:
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname = 'check_branch_has_parent';
--
-- The web app:
--   sets customer_type = 'BRANCH' whenever parent_customer_id is set (including when
--   the UI had VENDOR — Postgres usually forbids “vendor + parent” because parent ⇒ BRANCH);
--   sets customer_type = 'CUSTOMER' when parent is cleared and type was BRANCH.
--
-- To relax the rule instead (not recommended unless you know your data model):
--   ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_branch_has_parent;
--   -- then add a CHECK that matches your business rules

-- ---------------------------------------------------------------------------
-- Diagnostics (run in Supabase SQL editor or psql)
-- ---------------------------------------------------------------------------

-- 1) Exact CHECK text Postgres enforces
SELECT conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'customers'
  AND c.contype = 'c'
  AND conname = 'check_branch_has_parent';

-- 2) How customer_type is stored (text vs enum + allowed labels)
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name IN ('customer_type', 'parent_customer_id');

-- If udt_name is not 'text' / 'varchar', compare enum labels:
--   SELECT enumlabel FROM pg_enum e
--   JOIN pg_type t ON e.enumtypid = t.oid
--   WHERE t.typname = '<udt_name from above>';

-- 3) Rows that violate the *typical* bidirectional rule (parent <=> BRANCH)
--    Adjust literals if your DB uses different casing (e.g. 'branch' not 'BRANCH').
SELECT id, "CustomerListID", name, customer_type, parent_customer_id
FROM customers
WHERE (
    (parent_customer_id IS NOT NULL AND customer_type IS DISTINCT FROM 'BRANCH')
    OR (customer_type = 'BRANCH' AND parent_customer_id IS NULL)
  );

-- 4) Triggers that might rewrite customer_type / parent on UPDATE
SELECT tgname, pg_get_triggerdef(oid, true) AS trigger_def
FROM pg_trigger
WHERE tgrelid = 'public.customers'::regclass
  AND NOT tgisinternal;
