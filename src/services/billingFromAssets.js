/** Same normalization as pricingResolution.normalizePricingKey (keep local to avoid import cycle). */
function normalizePricingKey(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Canonical **pricing / SKU** key for a bottle row — must match `asset_type_pricing.product_code`
 * and customer override keys. Do not use free-text description here (breaks rate lookup).
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

/**
 * Human-facing asset type when SKU fields are empty (PDF asset table, rental-only rows).
 */
export function bottleDisplayProductLabel(bottle) {
  const strict = bottleProductCode(bottle);
  if (strict) return strict;
  return String(
    bottle?.display_label
      || bottle?.description
      || bottle?.name
      || bottle?.asset_name
      || ''
  ).trim();
}

/** O(1) bottle lookups for resolving rental rows that omit product fields but link to a bottle. */
export function buildBottleLookupMaps(bottles) {
  const byId = new Map();
  const byBarcode = new Map();
  for (const b of bottles || []) {
    if (b?.id != null && String(b.id).trim() !== '') {
      byId.set(String(b.id).trim(), b);
    }
    const bc = String(b?.barcode_number || b?.barcode || '').trim().toUpperCase();
    if (bc) byBarcode.set(bc, b);
  }
  return { byId, byBarcode };
}

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function clipYmd(v) {
  const s = String(v || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Rental was still on rent to the customer on the last day of the invoice period (date-only).
 * Used so April invoices still bill units returned in May, etc.
 * @param {string} periodEndYmd - YYYY-MM-DD (invoice period end)
 */
export function rentalWasBillableAsOfPeriodEnd(rental, periodEndYmd) {
  const pe = clipYmd(periodEndYmd);
  if (!pe) return false;
  const rs = clipYmd(rental?.rental_start_date);
  if (rs && rs > pe) return false;
  const endRaw = rental?.rental_end_date;
  const hasEnd = endRaw != null && String(endRaw).trim() !== '';
  const re = hasEnd ? clipYmd(endRaw) : null;
  if (re && re <= pe) return false;
  return true;
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

/**
 * Every alias for a subscription/customer used to match bottles & rentals (UUID ↔ QuickBooks ID ↔ display name),
 * aligned with CustomerDetail merged queries and pricingResolution.expandCustomerKeysForOverrides.
 */
function buildTargetCustomerIdSet(subscriptionCustomerId, customerRecord, allCustomers) {
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

  const linkDirectoryRow = (c) => {
    if (!c) return;
    add(c.CustomerListID);
    add(c.id);
    add(c.customer_id);
    add(c.name);
    add(c.Name);
  };

  if (Array.isArray(allCustomers) && allCustomers.length > 0) {
    const raw = String(subscriptionCustomerId ?? '').trim();
    if (raw) {
      for (const c of allCustomers) {
        const id = c?.id != null ? String(c.id).trim() : '';
        const list = c?.CustomerListID != null ? String(c.CustomerListID).trim() : '';
        if (!id && !list) continue;
        if (
          raw === id ||
          raw === list ||
          norm(raw) === norm(id) ||
          norm(raw) === norm(list)
        ) {
          linkDirectoryRow(c);
          break;
        }
      }
    }

    if (customerRecord) {
      const rid = customerRecord.id != null ? String(customerRecord.id).trim() : '';
      const rlist = customerRecord.CustomerListID != null ? String(customerRecord.CustomerListID).trim() : '';
      if (rid || rlist) {
        for (const c of allCustomers) {
          const id = c?.id != null ? String(c.id).trim() : '';
          const list = c?.CustomerListID != null ? String(c.CustomerListID).trim() : '';
          if (
            (rid && (rid === id || rid === list)) ||
            (rlist && (rlist === id || rlist === list))
          ) {
            linkDirectoryRow(c);
            break;
          }
        }
      }
    }

    const subNm = normName(subscriptionCustomerId);
    if (subNm) {
      for (const c of allCustomers) {
        const cn = normName(c.name || c.Name);
        if (cn && cn === subNm) {
          linkDirectoryRow(c);
          break;
        }
      }
    }
  }

  return s;
}

/**
 * Match one bottle field against subscription + customer record (same OR-branches as CustomerDetail bottle queries).
 */
function bottleFieldMatchesSubscription(fieldRaw, subscriptionCustomerId, customerRecord, allCustomers) {
  if (fieldRaw == null || fieldRaw === '') return false;
  const fieldId = norm(fieldRaw);
  const fieldAsName = normName(fieldRaw);
  const subKey = norm(subscriptionCustomerId);
  const subName = normName(subscriptionCustomerId);
  const listId = norm(customerRecord?.CustomerListID);
  const cid = norm(customerRecord?.id);
  const name = normName(customerRecord?.name || customerRecord?.Name);

  const targetIds = buildTargetCustomerIdSet(subscriptionCustomerId, customerRecord, allCustomers);
  if (fieldId && targetIds.has(fieldId)) return true;

  if (subKey && fieldId && fieldId === subKey) return true;
  if (subKey && listId && fieldId === listId) return true;
  if (subKey && cid && fieldId === cid) return true;
  if (subKey && fieldAsName && fieldAsName === normName(subscriptionCustomerId)) return true;
  if (subName && fieldAsName && fieldAsName === subName) return true;
  if (name && fieldAsName && fieldAsName === name) return true;
  if (listId && fieldId && fieldId === listId) return true;
  if (cid && fieldId && fieldId === cid) return true;

  if (name && fieldAsName && fieldAsName === name) return true;
  if (subName && fieldAsName && fieldAsName === subName) return true;

  return false;
}

function singleCustomerAssignmentMatch(bottle, subscriptionCustomerId, customerRecord, allCustomers) {
  const assignedName = normName(bottle.customer_name);

  const subKey = norm(subscriptionCustomerId);
  const subName = normName(subscriptionCustomerId);
  const name = normName(customerRecord?.name || customerRecord?.Name);

  // Do not use assigned_customer || customer_id — legacy rows can have a stale assigned_customer
  // while customer_id still matches (CustomerDetail runs separate queries per column).
  if (bottleFieldMatchesSubscription(bottle.assigned_customer, subscriptionCustomerId, customerRecord, allCustomers)) return true;
  if (bottleFieldMatchesSubscription(bottle.customer_id, subscriptionCustomerId, customerRecord, allCustomers)) return true;

  const assignedNameMatches =
    (subKey && assignedName && assignedName === normName(subscriptionCustomerId)) ||
    (subName && assignedName && assignedName === subName) ||
    (name && assignedName && assignedName === name);
  if (assignedNameMatches) return true;

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
  const { allCustomers } = options;
  if (singleCustomerAssignmentMatch(bottle, subscriptionCustomerId, customerRecord, allCustomers)) return true;
  for (const d of descendants) {
    const kidKey = d.CustomerListID || d.id;
    if (singleCustomerAssignmentMatch(bottle, kidKey, d, allCustomers)) return true;
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
        allCustomers,
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

function isRentalOpen(rental) {
  const end = rental?.rental_end_date;
  return end == null || String(end).trim() === '';
}

/**
 * Customer / hierarchy match for a rental row (open or closed). Used for billing and invoices.
 */
function rentalMatchesCustomerBillable(rental, subscriptionCustomerId, customerRecord, options = {}) {
  const descendants = options.descendantCustomers || [];
  const { allCustomers } = options;
  const assignedBottleIds = options.assignedBottleIds || new Set();
  const assignedBarcodes = options.assignedBarcodes || new Set();
  const allowAssignedBottleRecovery = options.allowAssignedBottleRecovery === true;

  // Duplicate/merge recovery:
  // if an open rental points at a bottle currently assigned to this customer,
  // treat it as billable even when rental.customer_id/customer_name are stale.
  if (allowAssignedBottleRecovery) {
    const rentalBottleId = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
    if (rentalBottleId && assignedBottleIds.has(rentalBottleId)) return true;
    const rentalBarcode = rental?.bottle_barcode != null ? String(rental.bottle_barcode).trim().toUpperCase() : '';
    if (rentalBarcode && assignedBarcodes.has(rentalBarcode)) return true;
  }

  const matchOne = (subId, cust) =>
    bottleFieldMatchesSubscription(rental.customer_id, subId, cust, allCustomers) ||
    bottleFieldMatchesSubscription(rental.customer_name, subId, cust, allCustomers);
  if (matchOne(subscriptionCustomerId, customerRecord)) return true;
  for (const d of descendants) {
    const kidKey = d.CustomerListID || d.id;
    if (matchOne(kidKey, d)) return true;
  }
  return false;
}

function openRentalMatchesCustomer(rental, subscriptionCustomerId, customerRecord, options = {}) {
  if (!isRentalOpen(rental)) return false;
  return rentalMatchesCustomerBillable(rental, subscriptionCustomerId, customerRecord, options);
}

function openRentalBusinessKey(rental) {
  if (rental?.is_dns === true) {
    return `dns:${String(rental?.dns_product_code || rental?.product_code || '').trim()}:${String(
      rental?.bottle_barcode || ''
    ).trim().toUpperCase()}:${String(rental?.customer_id || '').trim()}`;
  }
  if (rental?.bottle_id != null && String(rental.bottle_id).trim() !== '') {
    return `bottle_id:${String(rental.bottle_id).trim()}`;
  }
  if (rental?.bottle_barcode != null && String(rental.bottle_barcode).trim() !== '') {
    return `barcode:${String(rental.bottle_barcode).trim().toUpperCase()}`;
  }
  return `row:${String(rental?.id || '').trim()}`;
}

/** Product / SKU key for an open rental row (DNS uses dns_product_code). */
export function rentalProductCode(rental) {
  return String(
    rental?.dns_product_code ||
      rental?.product_code ||
      rental?.product_type ||
      rental?.asset_type ||
      ''
  ).trim();
}

/**
 * Product/SKU string for billing: rental row fields, then linked bottle (by id or barcode).
 */
export function resolvedRentalProductCode(rental, bottleById, bottleByBarcode) {
  const fromRental = rentalProductCode(rental);
  if (fromRental) return fromRental;
  const bid = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
  if (bid) {
    const b = bottleById.get(bid);
    if (b) {
      const fromBottle = bottleProductCode(b);
      if (fromBottle) return fromBottle;
    }
  }
  const rb = rental?.bottle_barcode != null ? String(rental.bottle_barcode).trim().toUpperCase() : '';
  if (rb) {
    const b = bottleByBarcode.get(rb);
    if (b) {
      const fromBottle = bottleProductCode(b);
      if (fromBottle) return fromBottle;
    }
  }
  return '';
}

/**
 * Billable units for rental-mode billing.
 * Prefer open rental rows, then fall back to assigned bottles when rentals are missing.
 * @param {object} options
 * @param {string} [options.asOfPeriodEnd] - YYYY-MM-DD: count rentals still active on this date (includes closed rentals whose return is after this day). Omit for current open rentals only.
 * @returns {Array<{ productCode: string, count: number }>}
 */
export function groupBillableUnitCountsByProductCode(bottles, rentals, subscriptionCustomerId, customerRecord, options = {}) {
  const { allCustomers, asOfPeriodEnd } = options;
  const allowAssignedBottleRecovery = options.allowAssignedBottleRecovery === true;
  const root = resolveCustomerRowForHierarchy(customerRecord, allCustomers);
  const descendants =
    root?.id && Array.isArray(allCustomers)
      ? getDescendantCustomerRecords(root, allCustomers)
      : [];
  const assignedBottleIds = new Set();
  const assignedBarcodes = new Set();
  if (allowAssignedBottleRecovery) {
    for (const b of bottles || []) {
      if (
        !bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord, {
          descendantCustomers: descendants,
          allCustomers,
        })
      ) continue;
      if (b?.id != null && String(b.id).trim() !== '') {
        assignedBottleIds.add(String(b.id).trim());
      }
      const barcode = String(b?.barcode_number || b?.barcode || '').trim().toUpperCase();
      if (barcode) assignedBarcodes.add(barcode);
    }
  }
  const assignOpts = {
    descendantCustomers: descendants,
    allCustomers,
    assignedBottleIds,
    assignedBarcodes,
    allowAssignedBottleRecovery,
  };

  const map = new Map();
  const seenRentalKeys = new Set();
  const { byId: bottleById, byBarcode: bottleByBarcode } = buildBottleLookupMaps(bottles);

  for (const r of rentals || []) {
    if (asOfPeriodEnd) {
      if (!rentalWasBillableAsOfPeriodEnd(r, asOfPeriodEnd)) continue;
      if (!rentalMatchesCustomerBillable(r, subscriptionCustomerId, customerRecord, assignOpts)) continue;
    } else if (!openRentalMatchesCustomer(r, subscriptionCustomerId, customerRecord, assignOpts)) {
      continue;
    }
    const businessKey = openRentalBusinessKey(r);
    if (seenRentalKeys.has(businessKey)) continue;
    seenRentalKeys.add(businessKey);
    const raw = resolvedRentalProductCode(r, bottleById, bottleByBarcode);
    const key = raw ? normalizePricingKey(raw) : '__unclassified__';
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }

  // As-of billing: add assigned bottles not already represented by a rental row (many orgs track custody on bottles only).
  if (asOfPeriodEnd) {
    const pe = clipYmd(asOfPeriodEnd);
    for (const b of bottles || []) {
      if (
        !bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord, {
          descendantCustomers: descendants,
          allCustomers,
        })
      )
        continue;
      const del = clipYmd(b.rental_start_date || b.delivery_date || b.purchase_date);
      if (pe && del && del > pe) continue;
      const bid = b?.id != null ? String(b.id).trim() : '';
      const bc = String(b?.barcode_number || b?.barcode || '').trim().toUpperCase();
      if (bid && seenRentalKeys.has(`bottle_id:${bid}`)) continue;
      if (bc && seenRentalKeys.has(`barcode:${bc}`)) continue;
      const raw = bottleProductCode(b);
      const pkey = raw ? normalizePricingKey(raw) : '__unclassified__';
      if (!pkey) continue;
      map.set(pkey, (map.get(pkey) || 0) + 1);
    }
  }

  if (map.size === 0) {
    const bottleGroups = groupAssignedBottleCountsByProductCode(bottles, subscriptionCustomerId, customerRecord, {
      allCustomers,
    });
    for (const { productCode, count } of bottleGroups) {
      map.set(productCode, count);
    }
  }

  const out = [];
  for (const [productCode, count] of map.entries()) {
    out.push({ productCode, count });
  }
  return out;
}
