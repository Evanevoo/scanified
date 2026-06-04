/**
 * Verified Orders list: one row per order number.
 * Prefer invoice import over receipt over scanned-only bundle when the same order appears twice.
 */

export function normalizeVerifiedOrderNumber(num) {
  if (num == null || num === '') return '';
  const s = String(num).trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
  return s;
}

/** Higher wins when two verified rows share the same order number. */
export function verifiedOrderTypePriority(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'invoice') return 30;
  if (t === 'receipt') return 20;
  if (t === 'scanned') return 10;
  return 0;
}

export function resolveOrderNumberFromListEntry(order) {
  if (!order) return '';
  let orderNum =
    order.order_number ||
    order.data_parsed?.order_number ||
    order.data_parsed?.reference_number ||
    order.data_parsed?.invoice_number;
  if (!orderNum && order.data_parsed?.rows?.[0]) {
    const r = order.data_parsed.rows[0];
    orderNum =
      r.order_number ||
      r.invoice_number ||
      r.reference_number ||
      r.sales_receipt_number;
  }
  return orderNum == null ? '' : String(orderNum).trim();
}

function verifiedOrderTimestamp(order) {
  return new Date(order?.approved_at || order?.verified_at || order?.created_at || 0).getTime();
}

/** Prefer higher type priority; tie-break by latest verified timestamp. */
export function pickPreferredVerifiedOrder(a, b) {
  const pa = verifiedOrderTypePriority(a?.type);
  const pb = verifiedOrderTypePriority(b?.type);
  if (pa !== pb) return pa > pb ? a : b;
  return verifiedOrderTimestamp(b) > verifiedOrderTimestamp(a) ? b : a;
}

/**
 * @param {object[]} orders
 * @returns {object[]}
 */
export function dedupeVerifiedOrdersByOrderNumber(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const orderMap = new Map();

  for (const order of list) {
    const norm = normalizeVerifiedOrderNumber(resolveOrderNumberFromListEntry(order));
    const key = norm || `_id_${order.id}`;
    const existing = orderMap.get(key);
    if (!existing) {
      orderMap.set(key, order);
      continue;
    }
    orderMap.set(key, pickPreferredVerifiedOrder(existing, order));
  }

  return Array.from(orderMap.values());
}
