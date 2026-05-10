/** Same normalization as pricingResolution.normalizePricingKey (keep local to avoid import cycle). */
function normalizePricingKey(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Structured SKU fields only (matches `asset_type_pricing.product_code` when present).
 */
export function bottleStrictProductCode(bottle) {
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
 * Canonical **pricing / SKU** key for a bottle row — prefers structured codes;
 * falls back to display/description when imports omit SKU columns (avoids everything showing as Unclassified).
 */
export function bottleProductCode(bottle) {
  const strict = bottleStrictProductCode(bottle);
  if (strict) return strict;
  return String(
    bottle?.display_label
      || bottle?.description
      || bottle?.name
      || bottle?.asset_name
      || ''
  ).trim();
}

/**
 * Human-facing asset type label (same resolution order as {@link bottleProductCode}).
 */
export function bottleDisplayProductLabel(bottle) {
  return bottleProductCode(bottle);
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

/**
 * Display names like "Parent LP – Field Division" often appear on subscriptions while DNS rows
 * only carry a segment ("Field Division"). Adds the full normalized name plus each dash-separated
 * segment as lookup keys so both sides intersect.
 */
export function expandBillingNameLookupKeys(name) {
  const raw = String(name || '').trim();
  if (!raw) return [];
  const keys = [];
  const full = normName(raw);
  if (full) keys.push(full);
  const parts = raw.split(/\s*[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    const seg = normName(p);
    if (seg && !keys.includes(seg)) keys.push(seg);
  }
  return keys;
}

/**
 * Customer-owned / customer-property cylinders should not generate monthly rental charges
 * (they are not company fleet on rent). Uses the same ownership hints as AssetDetail / imports.
 */
export function isCustomerOwnedForBilling(bottle) {
  if (!bottle) return false;
  const o = String(bottle.ownership || '').trim().toLowerCase();
  if (!o) return false;
  if (o === 'customer owned' || o.includes('customer-owned')) return true;
  if (o.includes('customer') && (o.includes('owned') || /\bown(ed)?\b/.test(o))) return true;
  return false;
}

/**
 * Fleet cylinders marked lost (`bottles.status` / `asset_status`) are not billable.
 * Aligns with Asset Detail normalization (stored value `lost`).
 */
export function isBottleLostForBilling(bottle) {
  if (!bottle) return false;
  const s = String(bottle.status ?? bottle.asset_status ?? '').trim().toLowerCase();
  return s === 'lost';
}

/**
 * When a rental/DNS row resolves to inventory, skip billing if that asset is lost.
 */
export function rentalExcludedBecauseLinkedAssetLost(rental, bottleById, bottleByBarcode) {
  const b = resolveBottleForRental(rental, bottleById, bottleByBarcode);
  return Boolean(b && isBottleLostForBilling(b));
}

/** Linked bottle row for a rental when bottle_id / barcode resolves in inventory. */
export function resolveBottleForRental(rental, bottleById, bottleByBarcode) {
  const bid = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
  if (bid) {
    const b = bottleById.get(bid);
    if (b) return b;
  }
  const rb = rental?.bottle_barcode != null ? String(rental.bottle_barcode).trim().toUpperCase() : '';
  if (rb) {
    return bottleByBarcode.get(rb) || null;
  }
  return null;
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
    if (isCustomerOwnedForBilling(b)) continue;
    if (isBottleLostForBilling(b)) continue;
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

export function isRentalOpen(rental) {
  const end = rental?.rental_end_date;
  return end == null || String(end).trim() === '';
}

/**
 * DNS check aligned with CustomerDetail (`r.is_dns` truthy).
 * Tolerates Postgres boolean variants ('t', 'true'), 1/'1', 'yes'/'y' so
 * subscription totals match the on-hand roll-up shown on the customer page.
 */
export function rentalIsDnsForBilling(rental) {
  if (!rental) return false;
  const v = rental?.is_dns;
  // Align with CustomerDetail: `locationAssets.filter(r => r.is_dns)` (any truthy counts as DNS).
  if (v === false || v === 0 || v === null || v === undefined || v === '') return false;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    if (s === 'false' || s === '0' || s === 'f' || s === 'no' || s === 'n') return false;
    return s.length > 0;
  }
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}

/**
 * Normalized id/name keys for subscription billing lookup: the customer row, parent chain,
 * and descendant locations — so rentals/DNS keyed under parent or child both match (e.g. LP vs Field Division).
 */
export function subscriptionBillingLookupKeys(customerRecord, allCustomers) {
  const keys = new Set();
  const addId = (v) => {
    const n = norm(v);
    if (n) keys.add(n);
  };
  const addNm = (v) => {
    const n = normName(v);
    if (n) keys.add(n);
  };

  const root = resolveCustomerRowForHierarchy(customerRecord, allCustomers);
  if (!root) {
    addId(customerRecord?.id);
    addId(customerRecord?.CustomerListID);
    for (const nk of expandBillingNameLookupKeys(customerRecord?.name || customerRecord?.Name)) {
      keys.add(nk);
    }
    return keys;
  }

  const descendants =
    root.id && Array.isArray(allCustomers) ? getDescendantCustomerRecords(root, allCustomers) : [];

  const lineage = [];
  let cur = root;
  const seenAnc = new Set();
  while (cur && cur.id && !seenAnc.has(cur.id)) {
    seenAnc.add(cur.id);
    lineage.push(cur);
    const pid = cur.parent_customer_id;
    if (!pid || !Array.isArray(allCustomers)) break;
    cur = allCustomers.find((c) => c.id === pid);
  }

  for (const c of [...lineage, ...descendants]) {
    if (!c) continue;
    addId(c.id);
    addId(c.CustomerListID);
    addId(c.customer_id);
    for (const nk of expandBillingNameLookupKeys(c.name || c.Name)) {
      keys.add(nk);
    }
  }
  return keys;
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

export function openRentalMatchesCustomer(rental, subscriptionCustomerId, customerRecord, options = {}) {
  if (!isRentalOpen(rental)) return false;
  return rentalMatchesCustomerBillable(rental, subscriptionCustomerId, customerRecord, options);
}

/**
 * Options for {@link openRentalMatchesCustomer} with assigned-bottle recovery enabled
 * (matches CustomerDetail / groupBillableUnitCountsByProductCode when recovery is on).
 */
export function buildOpenRentalMatchOptionsForSubscription(
  bottles,
  subscriptionCustomerId,
  customerRecord,
  allCustomers,
) {
  const root = resolveCustomerRowForHierarchy(customerRecord, allCustomers);
  const descendants =
    root?.id && Array.isArray(allCustomers)
      ? getDescendantCustomerRecords(root, allCustomers)
      : [];
  const assignedBottleIds = new Set();
  const assignedBarcodes = new Set();
  for (const b of bottles || []) {
    if (isCustomerOwnedForBilling(b)) continue;
    if (isBottleLostForBilling(b)) continue;
    if (
      !bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord, {
        descendantCustomers: descendants,
        allCustomers,
      })
    )
      continue;
    if (b?.id != null && String(b.id).trim() !== '') {
      assignedBottleIds.add(String(b.id).trim());
    }
    const barcode = String(b?.barcode_number || b?.barcode || '').trim().toUpperCase();
    if (barcode) assignedBarcodes.add(barcode);
  }
  return {
    descendantCustomers: descendants,
    allCustomers,
    assignedBottleIds,
    assignedBarcodes,
    allowAssignedBottleRecovery: true,
  };
}

/**
 * RNB/RNS DNS rows are shown on the customer profile but should not add billable units
 * (aligned with CustomerDetail "dns only" vs return-exception rows).
 */
export function isDnsRentalExcludedFromBillableCount(rental) {
  if (!rental || !rentalIsDnsForBilling(rental)) return false;
  const d = String(rental.dns_description || '').toLowerCase();
  if (d.includes('return not on balance')) return true;
  if (d.includes('return not scanned')) return true;
  return false;
}

/**
 * Bucket keys for indexing a rental under `rentalsByCustomerKey` on the Rentals page.
 * Expands `customer_id` / `customer_name` through the customer directory so DNS and legacy
 * rows still match subscription lookups keyed by UUID, CustomerListID, or display name.
 *
 * When `bottleById` / `bottleByBarcode` are provided, also index under the assigned bottle's
 * customer keys (stale rental.customer_id on DNS rows) so counts match CustomerDetail open rows.
 */
export function rentalCustomerIndexKeys(rental, allCustomers, bottleById = null, bottleByBarcode = null) {
  const keys = new Set();
  const add = (v) => {
    const n = norm(v);
    if (n) keys.add(n);
  };

  add(rental?.customer_id);
  for (const nk of expandBillingNameLookupKeys(rental?.customer_name)) {
    keys.add(nk);
  }

  if (Array.isArray(allCustomers) && allCustomers.length > 0) {
    const rId = String(rental?.customer_id ?? '').trim();
    const rIdNorm = norm(rId);
    const rNameNorm = normName(rental?.customer_name || '');

    for (const c of allCustomers) {
      const list = String(c.CustomerListID ?? '').trim();
      const cid = String(c.id ?? '').trim();
      const cname = normName(c.name || c.Name || '');

      let linked = false;
      if (
        rId &&
        (rId === list || rId === cid || rIdNorm === norm(list) || rIdNorm === norm(cid))
      ) {
        linked = true;
      }
      if (rNameNorm && cname && rNameNorm === cname) {
        linked = true;
      }
      if (!linked && rNameNorm) {
        for (const nk of expandBillingNameLookupKeys(c.name || c.Name)) {
          if (nk && nk === rNameNorm) {
            linked = true;
            break;
          }
        }
      }
      if (!linked) continue;

      for (const k of subscriptionBillingLookupKeys(c, allCustomers)) {
        keys.add(k);
      }
    }
  }

  const hasMaps = bottleById instanceof Map && bottleByBarcode instanceof Map;
  if (hasMaps) {
    const b = resolveBottleForRental(rental, bottleById, bottleByBarcode);
    if (b && !isCustomerOwnedForBilling(b)) {
      const ac = String(b.assigned_customer ?? '').trim();
      const bcust = String(b.customer_id ?? '').trim();
      const bname = String(b.customer_name ?? '').trim();
      const primary = norm(ac || bcust) || normName(bname);
      if (primary) keys.add(primary);
      for (const nk of expandBillingNameLookupKeys(bname)) {
        keys.add(nk);
      }
      if (Array.isArray(allCustomers) && allCustomers.length > 0) {
        for (const c of allCustomers) {
          const list = String(c.CustomerListID ?? '').trim();
          const cid = String(c.id ?? '').trim();
          const hit =
            (ac && (norm(ac) === norm(list) || norm(ac) === norm(cid)))
            || (bcust && (norm(bcust) === norm(list) || norm(bcust) === norm(cid)));
          if (!hit) continue;
          for (const k of subscriptionBillingLookupKeys(c, allCustomers)) {
            keys.add(k);
          }
        }
      }
    }
  }

  return keys;
}

/**
 * One open rental → one physical billable unit key, aligned with CustomerDetail rental dedupe:
 * prefer bottle_id; resolve barcode to inventory bottle id when possible (avoids double-counting
 * duplicate rental rows that use id on one row and barcode on another).
 */
export function openRentalBillableUnitKey(rental, bottleById, bottleByBarcode) {
  const byId = bottleById || new Map();
  const byBc = bottleByBarcode || new Map();
  if (rentalIsDnsForBilling(rental)) {
    const rid = String(rental?.id || '').trim();
    if (rid) return `dns_row:${rid}`;
    const start = String(rental?.rental_start_date || '').trim();
    const created = String(rental?.created_at || '').trim();
    return `dns:${String(rental?.dns_product_code || rental?.product_code || '').trim()}:${String(
      rental?.bottle_barcode || ''
    ).trim().toUpperCase()}:${String(rental?.customer_id || '').trim()}:${start}:${created}`;
  }
  const bid = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
  if (bid) return `bottle:${bid}`;
  const bc = rental?.bottle_barcode != null ? String(rental.bottle_barcode).trim().toUpperCase() : '';
  if (bc) {
    const hit = byBc.get(bc);
    if (hit?.id != null && String(hit.id).trim() !== '') return `bottle:${String(hit.id).trim()}`;
    return `barcode:${bc}`;
  }
  return `row:${String(rental?.id || '').trim()}`;
}

/**
 * Synonym keys for one inventory bottle so month-end billing can merge with rental rows that
 * reference the same asset by id only, barcode only, or both (avoids 27 physical + 28 billed).
 */
function billingPhysicalSynonymKeysForBottle(b) {
  const keys = [];
  if (b?.id != null && String(b.id).trim() !== '') keys.push(`billphys:id:${String(b.id).trim()}`);
  const bc = String(b?.barcode_number || b?.barcode || '').trim().toUpperCase();
  if (bc) keys.push(`billphys:bc:${bc}`);
  return keys;
}

/** Synonyms for one open rental (non-DNS expands id + barcode + resolved inventory id). */
function billingPhysicalSynonymKeysForRental(r, bottleByBarcode) {
  const byBc = bottleByBarcode || new Map();
  if (rentalIsDnsForBilling(r)) {
    const inner = openRentalBillableUnitKey(r, new Map(), byBc);
    return inner ? [`billphys:${inner}`] : [];
  }
  const keys = [];
  const bid = r?.bottle_id != null ? String(r.bottle_id).trim() : '';
  if (bid) keys.push(`billphys:id:${bid}`);
  const bc = String(r?.bottle_barcode || '').trim().toUpperCase();
  if (bc) {
    keys.push(`billphys:bc:${bc}`);
    const hit = byBc.get(bc);
    if (hit?.id != null && String(hit.id).trim() !== '') {
      keys.push(`billphys:id:${String(hit.id).trim()}`);
    }
  }
  if (keys.length > 0) return [...new Set(keys)];
  const inner = openRentalBillableUnitKey(r, new Map(), byBc);
  return inner ? [`billphys:${inner}`] : [];
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
      if (isCustomerOwnedForBilling(b)) continue;
      if (isBottleLostForBilling(b)) continue;
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

  if (asOfPeriodEnd) {
    const pe = clipYmd(asOfPeriodEnd);
    /** Any synonym hit means this physical unit was already billed from bottles or an earlier rental. */
    const claimedSynonyms = new Set();
    const claimUnit = (synonyms, pkey) => {
      if (!synonyms?.length || !pkey) return;
      for (const s of synonyms) {
        if (claimedSynonyms.has(s)) return;
      }
      for (const s of synonyms) claimedSynonyms.add(s);
      map.set(pkey, (map.get(pkey) || 0) + 1);
    };

    // Prefer bottle rows first (custody + SKU are authoritative); then rental-only units (DNS, etc.).
    for (const b of bottles || []) {
      if (isCustomerOwnedForBilling(b)) continue;
      if (isBottleLostForBilling(b)) continue;
      if (
        !bottleAssignedToCustomer(b, subscriptionCustomerId, customerRecord, {
          descendantCustomers: descendants,
          allCustomers,
        })
      )
        continue;
      const del = clipYmd(b.rental_start_date || b.delivery_date || b.purchase_date);
      if (pe && del && del > pe) continue;
      const synonyms = billingPhysicalSynonymKeysForBottle(b);
      if (synonyms.length === 0) continue;
      const raw = bottleProductCode(b);
      const pkey = raw ? normalizePricingKey(raw) : '__unclassified__';
      if (!pkey) continue;
      claimUnit(synonyms, pkey);
    }

    for (const r of rentals || []) {
      if (isDnsRentalExcludedFromBillableCount(r)) continue;
      if (!rentalWasBillableAsOfPeriodEnd(r, asOfPeriodEnd)) continue;
      if (!rentalMatchesCustomerBillable(r, subscriptionCustomerId, customerRecord, assignOpts)) continue;
      if (rentalExcludedBecauseLinkedAssetLost(r, bottleById, bottleByBarcode)) continue;
      if (
        !rentalIsDnsForBilling(r)
        && isCustomerOwnedForBilling(resolveBottleForRental(r, bottleById, bottleByBarcode))
      )
        continue;
      const synonyms = billingPhysicalSynonymKeysForRental(r, bottleByBarcode);
      if (synonyms.length === 0) continue;
      const raw = resolvedRentalProductCode(r, bottleById, bottleByBarcode);
      const pkey = raw ? normalizePricingKey(raw) : '__unclassified__';
      if (!pkey) continue;
      claimUnit(synonyms, pkey);
    }
  } else {
    for (const r of rentals || []) {
      if (isDnsRentalExcludedFromBillableCount(r)) continue;
      if (!openRentalMatchesCustomer(r, subscriptionCustomerId, customerRecord, assignOpts)) continue;
      if (rentalExcludedBecauseLinkedAssetLost(r, bottleById, bottleByBarcode)) continue;
      if (
        !rentalIsDnsForBilling(r)
        && isCustomerOwnedForBilling(resolveBottleForRental(r, bottleById, bottleByBarcode))
      )
        continue;
      const businessKey = openRentalBillableUnitKey(r, bottleById, bottleByBarcode);
      if (seenRentalKeys.has(businessKey)) continue;
      seenRentalKeys.add(businessKey);
      const raw = resolvedRentalProductCode(r, bottleById, bottleByBarcode);
      const key = raw ? normalizePricingKey(raw) : '__unclassified__';
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
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
