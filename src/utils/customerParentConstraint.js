/**

 * Supabase `customers` constraints (live):

 *

 * check_branch_has_parent:

 *   CHECK (

 *     (account_type IS NULL)

 *     OR ((account_type = 'main') AND (parent_customer_id IS NULL))

 *     OR ((account_type = 'branch') AND (parent_customer_id IS NOT NULL))

 *   )

 *

 * customers_customer_type_check:

 *   CHECK (customer_type IN ('CUSTOMER', 'VENDOR', 'TEMPORARY'))

 *

 * Branch / location hierarchy uses `account_type` + `parent_customer_id`, not `customer_type = 'BRANCH'`.

 */



/** Values allowed in the DB `customer_type` column. */

export const ALLOWED_CUSTOMER_TYPES = ['CUSTOMER', 'VENDOR', 'TEMPORARY'];



/** Form-only label for branch rows (never persisted to `customer_type`). */

export const CUSTOMER_TYPE_BRANCH = 'BRANCH';



export const ACCOUNT_TYPE_MAIN = 'main';

export const ACCOUNT_TYPE_BRANCH = 'branch';



export function hasCustomerParentSelected(parentCustomerId) {

  return parentCustomerId != null && String(parentCustomerId).trim() !== '';

}



export function resolveAccountTypeForParent(parentCustomerId) {

  return hasCustomerParentSelected(parentCustomerId) ? ACCOUNT_TYPE_BRANCH : ACCOUNT_TYPE_MAIN;

}



export function isCustomerBranchAccount(row) {

  if (!row || typeof row !== 'object') return false;

  if (String(row.account_type ?? '').trim().toLowerCase() === ACCOUNT_TYPE_BRANCH) return true;

  if (hasCustomerParentSelected(row.parent_customer_id)) return true;

  return String(row.customer_type ?? '').trim().toUpperCase() === CUSTOMER_TYPE_BRANCH;

}



/** Map UI / legacy values to a DB-safe `customer_type`. */

export function normalizeCustomerTypeForDb(customerType) {

  const t = String(customerType ?? 'CUSTOMER').trim().toUpperCase();

  if (t === CUSTOMER_TYPE_BRANCH || !ALLOWED_CUSTOMER_TYPES.includes(t)) {

    return 'CUSTOMER';

  }

  return t;

}



/** @deprecated Use normalizeCustomerTypeForDb — kept for existing call sites. */

export function resolveCustomerTypeForParentConstraint(customerType) {

  return normalizeCustomerTypeForDb(customerType);

}



/** Form dropdown value: show Branch when row is a branch account. */

export function customerTypeForForm(row) {

  if (isCustomerBranchAccount(row)) return CUSTOMER_TYPE_BRANCH;

  return normalizeCustomerTypeForDb(row?.customer_type);

}



export function getCustomerTypeChipLabel(row) {

  if (isCustomerBranchAccount(row)) {

    const biz = normalizeCustomerTypeForDb(row?.customer_type);

    return biz !== 'CUSTOMER' ? `Branch (${biz})` : 'Branch';

  }

  return normalizeCustomerTypeForDb(row?.customer_type) || 'CUSTOMER';

}



export function getCustomerTypeChipColor(row) {

  if (isCustomerBranchAccount(row)) return 'info';

  const t = normalizeCustomerTypeForDb(row?.customer_type);

  if (t === 'VENDOR') return 'secondary';

  if (t === 'TEMPORARY') return 'warning';

  return 'primary';

}



export function isBranchTypeSelectedInForm(customerType) {

  return String(customerType ?? '').trim().toUpperCase() === CUSTOMER_TYPE_BRANCH;

}



/** User-facing validation before save (after finalize should always pass). */

export function getCustomerBranchParentValidationError(row) {

  if (!row || typeof row !== 'object') return null;

  const parent = hasCustomerParentSelected(row.parent_customer_id);

  const accountType = String(row.account_type ?? '').trim().toLowerCase();



  if (accountType === ACCOUNT_TYPE_BRANCH && !parent) {

    return 'Branch accounts must have a parent selected under “Part of (parent customer)”.';

  }

  if (accountType === ACCOUNT_TYPE_MAIN && parent) {

    return 'Main accounts cannot have a parent. Clear the parent field or use Branch / location.';

  }

  if (parent && accountType && accountType !== ACCOUNT_TYPE_BRANCH) {

    return 'When a parent customer is selected, account type must be branch.';

  }

  if (isBranchTypeSelectedInForm(row.customer_type) && !parent) {

    return 'Branch / location customers must have a parent account selected under “Part of (parent customer)”.';

  }

  return null;

}



/**

 * Apply `account_type`, DB-safe `customer_type`, and trimmed `parent_customer_id` for INSERT/UPDATE payloads.

 */

export function finalizeCustomerBranchParentFields(row) {

  if (!row || typeof row !== 'object') return row;

  const parent = hasCustomerParentSelected(row.parent_customer_id)

    ? String(row.parent_customer_id).trim()

    : null;

  const account_type = resolveAccountTypeForParent(parent);

  const customer_type = normalizeCustomerTypeForDb(row.customer_type);

  return {

    ...row,

    parent_customer_id: parent,

    account_type,

    customer_type,

  };

}

/** `customers.id` → parent `name` for hierarchy labels (e.g. rentals list). */
export function buildCustomerParentNameMap(customers) {
  const map = new Map();
  for (const c of customers || []) {
    const id = c?.id != null ? String(c.id).trim() : '';
    if (!id) continue;
    const name = String(c.name || c.Name || '').trim();
    if (name) map.set(id, name);
  }
  return map;
}

/**
 * QuickBooks-style sub-customer label: `Parent Co:Branch Co`.
 * Uses `parent_customer_id` + parent directory name; skips duplicate prefix if `name` already includes it.
 */
export function formatCustomerHierarchyDisplayName(customer, parentNameMap) {
  if (!customer) return '';
  const name = String(customer.name || customer.Name || '').trim();
  if (!name) return '';
  const parentId =
    customer.parent_customer_id != null ? String(customer.parent_customer_id).trim() : '';
  if (!parentId) return name;

  const parentName =
    parentNameMap instanceof Map
      ? String(parentNameMap.get(parentId) || '').trim()
      : String(parentNameMap?.[parentId] || '').trim();
  if (!parentName) return name;

  const prefix = `${parentName}:`;
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) return name;
  return `${parentName}:${name}`;
}

/** Attach `displayName` for UI (rentals table, exports) without changing stored `name`. */
export function withCustomerHierarchyDisplayName(customer, parentNameMap) {
  if (!customer || typeof customer !== 'object') return customer;
  const displayName = formatCustomerHierarchyDisplayName(customer, parentNameMap);
  const base = String(customer.name || customer.Name || '').trim();
  if (!displayName || displayName === base) {
    return customer.displayName ? customer : { ...customer, displayName: base || displayName };
  }
  return { ...customer, displayName };
}

/** Prefer hierarchy label when present (UI only — never use for billing keys). */
export function getCustomerDisplayLabel(customer, parentNameMap) {
  if (!customer) return '';
  if (customer.displayName) return String(customer.displayName).trim();
  return (
    formatCustomerHierarchyDisplayName(customer, parentNameMap) ||
    String(customer.name || customer.Name || '').trim()
  );
}

/**
 * Canonical customer number for billing, bottles, and exports (branch’s own ID — not the parent’s).
 */
export function getCustomerListId(customer, fallbackId = '') {
  return String(
    customer?.CustomerListID ||
      customer?.customer_id ||
      fallbackId ||
      ''
  ).trim();
}

/** Branch portion of a `Parent:Child` label — matching helper only. */
export function branchNameFromHierarchyLabel(label) {
  const s = String(label || '').trim();
  if (!s.includes(':')) return s;
  const branch = s.slice(s.indexOf(':') + 1).trim();
  return branch || s;
}


