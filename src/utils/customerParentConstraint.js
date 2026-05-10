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
