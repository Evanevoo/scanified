/**
 * Supabase `customers.check_branch_has_parent` — typical shape:
 *   (parent_customer_id IS NULL OR customer_type = 'BRANCH')
 *   AND (customer_type <> 'BRANCH' OR parent_customer_id IS NOT NULL)
 * i.e. parent ⇔ BRANCH (bidirectional). There is no “VENDOR under parent” row shape.
 *
 * - With parent: always BRANCH (CUSTOMER / TEMPORARY / VENDOR / empty → BRANCH).
 * - Without parent: BRANCH → CUSTOMER (a “branch” line must have a parent).
 */
export function resolveCustomerTypeForParentConstraint(customerType, parentCustomerId) {
  const t = String(customerType ?? 'CUSTOMER').trim().toUpperCase();
  const hasParent =
    parentCustomerId != null && String(parentCustomerId).trim() !== '';

  if (!hasParent) {
    if (t === 'BRANCH') {
      return 'CUSTOMER';
    }
    return t || 'CUSTOMER';
  }
  return 'BRANCH';
}

/**
 * Apply `customer_type` + trimmed `parent_customer_id` for INSERT/UPSERT payloads so Postgres
 * `check_branch_has_parent` passes even when the table default for `customer_type` is wrong
 * (e.g. default BRANCH with null parent).
 */
export function finalizeCustomerBranchParentFields(row) {
  if (!row || typeof row !== 'object') return row;
  const parent =
    row.parent_customer_id != null && String(row.parent_customer_id).trim() !== ''
      ? String(row.parent_customer_id).trim()
      : null;
  const customer_type = resolveCustomerTypeForParentConstraint(row.customer_type, parent);
  // Redundant guard: Postgres `check_branch_has_parent` requires parent ⇔ BRANCH in lockstep.
  return {
    ...row,
    parent_customer_id: parent,
    customer_type: parent ? 'BRANCH' : customer_type,
  };
}
