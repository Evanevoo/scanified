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
 * Whether a bottle is assigned to the subscription's customer (List ID, UUID, or display name).
 */
export function bottleAssignedToCustomer(bottle, subscriptionCustomerId, customerRecord) {
  const assignedId = norm(bottle.assigned_customer || bottle.customer_id);
  const assignedName = normName(bottle.customer_name);
  const subKey = norm(subscriptionCustomerId);
  const listId = norm(customerRecord?.CustomerListID);
  const cid = norm(customerRecord?.id);
  const name = normName(customerRecord?.name || customerRecord?.Name);

  if (subKey && assignedId && assignedId === subKey) return true;
  if (subKey && listId && assignedId === listId) return true;
  if (subKey && cid && assignedId === cid) return true;
  if (subKey && assignedName && assignedName === normName(subscriptionCustomerId)) return true;
  if (name && assignedName && assignedName === name) return true;
  if (listId && assignedId && assignedId === listId) return true;
  if (cid && assignedId && assignedId === cid) return true;
  return false;
}

/**
 * Live assigned bottle counts grouped by normalized product_code (for pricingResolution keys).
 * @returns {Array<{ productCode: string, count: number }>}
 */
export function groupAssignedBottleCountsByProductCode(bottles, subscriptionCustomerId, customerRecord) {
  const map = new Map();
  for (const b of bottles || []) {
    if (!bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord)) continue;
    const raw = bottleProductCode(b);
    if (!raw) continue;
    const key = normalizePricingKey(raw);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const out = [];
  for (const [productCode, count] of map.entries()) {
    out.push({ productCode, count });
  }
  return out;
}
