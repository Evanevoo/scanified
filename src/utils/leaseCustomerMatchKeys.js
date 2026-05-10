/**
 * Lease matching: `lease_agreements.customer_id` / `lease_contracts.customer_id` may store
 * CustomerListID, UUID, or (legacy) display name — align keys like Subscriptions / Lease workspace.
 */

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function isActiveCustomerRecord(customer) {
  if (!customer) return false;
  if (customer.deleted_at) return false;
  if (customer.is_deleted === true) return false;
  if (customer.is_active === false) return false;
  if (customer.archived === true) return false;
  return true;
}

/** Id / name variants for matching subscriptions and lease rows to the customer directory. */
export function customerKeysForLeaseMatch(subCustomerId, customer) {
  const keys = new Set();
  const add = (v) => {
    const k = normalize(String(v || '').trim());
    if (k) keys.add(k);
  };
  add(subCustomerId);
  add(customer?.CustomerListID);
  add(customer?.id);
  add(customer?.customer_id);
  add(customer?.name);
  add(customer?.Name);
  const nk = normalizeName(customer?.name || customer?.Name || '');
  if (nk) keys.add(nk);
  return keys;
}

/**
 * Merge id/name aliases across `customers` rows so List ID ↔ UUID ↔ name all match lease rows.
 */
export function expandLeaseMatchKeys(subCustomerId, customer, allCustomers) {
  const keys = customerKeysForLeaseMatch(subCustomerId, customer);
  if (!allCustomers?.length) return keys;
  const addFromRecord = (c) => {
    const add = (v) => {
      const k = normalize(String(v || '').trim());
      if (k) keys.add(k);
    };
    add(c?.CustomerListID);
    add(c?.id);
    add(c?.customer_id);
    const nk = normalizeName(c?.name || c?.Name || '');
    if (nk) keys.add(nk);
  };
  for (let pass = 0; pass < 3; pass += 1) {
    let grew = false;
    const beforeSize = keys.size;
    for (const c of allCustomers) {
      if (!isActiveCustomerRecord(c)) continue;
      const candKeys = [
        normalize(String(c.CustomerListID || '').trim()),
        normalize(String(c.id || '').trim()),
        normalizeName(c.name || c.Name || ''),
      ].filter(Boolean);
      if (!candKeys.some((k) => keys.has(k))) continue;
      const sz = keys.size;
      addFromRecord(c);
      if (keys.size > sz) grew = true;
    }
    if (!grew && keys.size === beforeSize) break;
  }
  return keys;
}
