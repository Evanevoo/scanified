/** Same normalization as pricingResolution.normalizePricingKey (keep local to avoid import cycle). */
function normalizePricingKey(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Canonical product key for a bottle row (matches subscription / pricing SKU resolution).
 */
export function bottleProductCode(bottle) {
  return String(
    bottle?.product_code
      || bottle?.product_type
      || bottle?.asset_type
      || bottle?.cylinder_type
      || bottle?.gas_type
      || bottle?.sku
      || ''
  ).trim();
}

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Direct/indirect child customers under `parentRecord.id` (public.customers.parent_customer_id).
 */
export function getDescendantCustomerRecords(parentRecord, allCustomers) {
  if (!parentRecord?.id || !Array.isArray(allCustomers)) return [];
  const byParentId = new Map();
  for (const c of allCustomers) {
    const pid = c.parent_customer_id;
    if (!pid) continue;
    if (!byParentId.has(pid)) byParentId.set(pid, []);
    byParentId.get(pid).push(c);
  }
  const out = [];
  const queue = [...(byParentId.get(parentRecord.id) || [])];
  let qi = 0;
  while (qi < queue.length) {
    const node = queue[qi++];
    out.push(node);
    const kids = byParentId.get(node.id) || [];
    for (const k of kids) queue.push(k);
  }
  return out;
}

function buildTargetCustomerIdSet(subscriptionCustomerId, customerRecord) {
  const s = new Set();
  const add = (v) => {
    const n = norm(v);
    if (n) s.add(n);
  };
  add(subscriptionCustomerId);
  if (customerRecord) {
    add(customerRecord.CustomerListID);
    add(customerRecord.id);
    add(customerRecord.customer_id);
  }
  return s;
}

function singleCustomerAssignmentMatch(bottle, subscriptionCustomerId, customerRecord) {
  const assignedRaw = bottle.assigned_customer || bottle.customer_id;
  const assignedId = norm(assignedRaw);
  const assignedName = normName(bottle.customer_name);
  const subKey = norm(subscriptionCustomerId);
  const subName = normName(subscriptionCustomerId);
  const listId = norm(customerRecord?.CustomerListID);
  const cid = norm(customerRecord?.id);
  const name = normName(customerRecord?.name || customerRecord?.Name);

  const targetIds = buildTargetCustomerIdSet(subscriptionCustomerId, customerRecord);
  if (assignedId && targetIds.has(assignedId)) return true;

  if (subKey && assignedId && assignedId === subKey) return true;
  if (subKey && listId && assignedId === listId) return true;
  if (subKey && cid && assignedId === cid) return true;
  if (subKey && assignedName && assignedName === normName(subscriptionCustomerId)) return true;
  if (subName && assignedName && assignedName === subName) return true;
  if (name && assignedName && assignedName === name) return true;
  if (listId && assignedId && assignedId === listId) return true;
  if (cid && assignedId && assignedId === cid) return true;

  // assigned_customer may store the display name rather than a canonical ID;
  // compare it (as a name) against the customer record name.
  const assignedAsName = normName(assignedRaw);
  if (name && assignedAsName && assignedAsName === name) return true;
  if (subName && assignedAsName && assignedAsName === subName) return true;

  return false;
}

/**
 * Whether a bottle is assigned to the subscription customer or any of its child locations
 * (same org hierarchy: parent_customer_id).
 * @param {object} [options]
 * @param {Array} [options.descendantCustomers] — from getDescendantCustomerRecords; omit to skip rollup
 */
export function bottleAssignedToCustomer(bottle, subscriptionCustomerId, customerRecord, options = {}) {
  const descendants = options.descendantCustomers || [];
  if (singleCustomerAssignmentMatch(bottle, subscriptionCustomerId, customerRecord)) return true;
  for (const d of descendants) {
    const kidKey = d.CustomerListID || d.id;
    if (singleCustomerAssignmentMatch(bottle, kidKey, d)) return true;
  }
  return false;
}

function resolveCustomerRowForHierarchy(customerRecord, allCustomers) {
  if (!customerRecord) return null;
  if (customerRecord.id) return customerRecord;
  const list = customerRecord.CustomerListID != null ? String(customerRecord.CustomerListID).trim() : '';
  if (list && Array.isArray(allCustomers)) {
    const found = allCustomers.find(
      (c) =>
        String(c.CustomerListID || '').trim() === list ||
        String(c.id || '').trim() === list
    );
    if (found) return found;
  }
  return customerRecord;
}

/**
 * Live assigned bottle counts grouped by normalized product_code (for pricingResolution keys).
 * Pass `allCustomers` so bottles on child locations roll up to a parent subscription row.
 * @returns {Array<{ productCode: string, count: number }>}
 */
export function groupAssignedBottleCountsByProductCode(bottles, subscriptionCustomerId, customerRecord, options = {}) {
  const { allCustomers } = options;
  const root = resolveCustomerRowForHierarchy(customerRecord, allCustomers);
  const descendants =
    root?.id && Array.isArray(allCustomers)
      ? getDescendantCustomerRecords(root, allCustomers)
      : [];

  const map = new Map();
  for (const b of bottles || []) {
    if (
      !bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord, {
        descendantCustomers: descendants,
      })
    )
      continue;
    const raw = bottleProductCode(b);
    const key = raw ? normalizePricingKey(raw) : '__unclassified__';
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const out = [];
  for (const [productCode, count] of map.entries()) {
    out.push({ productCode, count });
  }
  return out;
}
