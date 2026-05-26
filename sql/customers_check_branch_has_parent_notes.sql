-- customers.check_branch_has_parent (Scanified / gas-cylinder-app)
--
-- Live CHECK (2026):
--   (account_type IS NULL)
--   OR ((account_type = 'main') AND (parent_customer_id IS NULL))
--   OR ((account_type = 'branch') AND (parent_customer_id IS NOT NULL))
--
-- The web app sets on every insert/update (via finalizeCustomerBranchParentFields):
--   parent set     → account_type = 'branch', customer_type = CUSTOMER (or VENDOR / TEMPORARY)
--   no parent      → account_type = 'main',  customer_type = CUSTOMER / VENDOR / TEMPORARY
--
-- customers_customer_type_check allows ONLY: CUSTOMER, VENDOR, TEMPORARY (not BRANCH).
--
-- Inspect constraint:
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conname = 'check_branch_has_parent';

-- Rows that violate the CHECK (fix before bulk imports)
SELECT id, "CustomerListID", name, account_type, customer_type, parent_customer_id
FROM customers
WHERE NOT (
    account_type IS NULL
    OR (account_type = 'main' AND parent_customer_id IS NULL)
    OR (account_type = 'branch' AND parent_customer_id IS NOT NULL)
  );

-- Repair common bad states (review SELECT first)
-- Parent set but account_type not branch:
-- UPDATE customers SET account_type = 'branch', customer_type = COALESCE(NULLIF(customer_type, 'BRANCH'), 'CUSTOMER')
-- WHERE parent_customer_id IS NOT NULL
--   AND (account_type IS DISTINCT FROM 'branch' OR customer_type = 'BRANCH');

-- Branch account_type without parent:
-- UPDATE customers SET account_type = 'main', customer_type = COALESCE(NULLIF(customer_type, 'BRANCH'), 'CUSTOMER')
-- WHERE parent_customer_id IS NULL AND account_type = 'branch';
