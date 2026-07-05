const norm = (v) => String(v || '').trim().toLowerCase();

const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * True when any bottle-side identity field matches the order/verify customer id or name.
 * @param {string|null|undefined} orderId - CustomerListID, customers.id, or import id
 * @param {string|null|undefined} orderName - Display name
 * @param {...(string|null|undefined)} bottleFields - assigned_customer, customer_name, etc.
 */
export function isSameCustomerIdentity(orderId, orderName, ...bottleFields) {
  const orderKeys = new Set();
  const oId = norm(orderId);
  const oName = normName(orderName);
  if (oId) orderKeys.add(oId);
  if (oName) orderKeys.add(oName);
  if (orderKeys.size === 0) return false;

  for (const raw of bottleFields) {
    if (raw == null || String(raw).trim() === '') continue;
    const v = norm(raw);
    const n = normName(raw);
    if (v && orderKeys.has(v)) return true;
    if (n && orderKeys.has(n)) return true;
    if (oName && n === oName) return true;
  }
  return false;
}
