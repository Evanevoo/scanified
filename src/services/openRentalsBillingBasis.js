/**
 * Billing basis for rental charges: same merge + dedupe as Customer Detail
 * (`fetchMergedOpenRentalsForCustomer` → Rental History "N open — billing basis").
 *
 * Open rentals are merged by CustomerListID match plus legacy `customer_name` /
 * `customer_id`-as-display-name rows, then deduped per bottle / DNS business key.
 */

import {
  buildBottleLookupMaps,
  isDnsRentalExcludedFromBillableCount,
  isRentalOpen,
  rentalExcludedBecauseLinkedAssetLost,
  resolvedRentalProductCode,
} from './billingFromAssets';
import { normalizePricingKey } from './pricingResolution';

const RENTAL_CUSTOMER_PK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clipYmd(v) {
  const s = String(v || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * True if the rental was active on `asOfYmd` (end-of-day), aligned with period snapshots.
 */
export function isRentalOpenAsOf(rental, asOfYmd) {
  const pe = clipYmd(asOfYmd);
  if (!pe || !rental) return false;
  const rs = clipYmd(rental.rental_start_date);
  const re = clipYmd(rental.rental_end_date);
  if (!rs) return false;
  if (rs > pe) return false;
  if (!re) return true;
  return re > pe;
}

/**
 * @param {Array} rentals - org-scoped rentals (caller filters org)
 * @param {string|null|undefined} asOfYmd - if omitted, only currently open rows (`rental_end_date` null), matching Customer Detail.
 */
export function filterRentalsForBillingBasisSnapshot(rentals, asOfYmd) {
  if (!asOfYmd) {
    return (rentals || []).filter(isRentalOpen);
  }
  return (rentals || []).filter((r) => isRentalOpenAsOf(r, asOfYmd));
}

function dedupeKeyForRental(row) {
  if (row?.is_dns === true) {
    return `dns_row:${String(row?.id || '').trim() || `${row?.dns_product_code || row?.product_code || ''}:${String(row?.bottle_barcode || '').trim().toUpperCase()}:${String(row?.customer_id || '').trim()}:${String(row?.rental_start_date || '').trim()}:${String(row?.created_at || '').trim()}`}`;
  }
  if (row?.bottle_id) return `bottle_id:${row.bottle_id}`;
  if (row?.bottle_barcode) return `barcode:${String(row.bottle_barcode).trim().toUpperCase()}`;
  return `row:${String(row?.id || '').trim()}`;
}

/**
 * Index open rentals by customer_id and customer_name for O(1) lookups on the Rentals grid.
 * @param {Array<object>} openRentals
 */
export function buildOpenRentalsBillingIndex(openRentals) {
  const byCustomerId = new Map();
  const byCustomerName = new Map();
  for (const r of openRentals || []) {
    const cid = String(r.customer_id || '').trim();
    const cname = String(r.customer_name || '').trim();
    if (cid) {
      const list = byCustomerId.get(cid);
      if (list) list.push(r);
      else byCustomerId.set(cid, [r]);
    }
    if (cname) {
      const list = byCustomerName.get(cname);
      if (list) list.push(r);
      else byCustomerName.set(cname, [r]);
    }
  }
  return { byCustomerId, byCustomerName };
}

function collectMergedRentalsFromIndex(index, { customerListId, customerName, customerPkId }) {
  const listId = String(customerListId || '').trim();
  const name = String(customerName || '').trim();
  const pkTrim = String(customerPkId || '').trim();
  const seen = new Set();
  const merged = [];
  const push = (rows) => {
    (rows || []).forEach((r) => {
      if (r?.id && !seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    });
  };
  if (listId && index?.byCustomerId?.has(listId)) {
    push(index.byCustomerId.get(listId));
  }
  if (pkTrim && RENTAL_CUSTOMER_PK_UUID_RE.test(pkTrim) && index?.byCustomerId?.has(pkTrim)) {
    push(index.byCustomerId.get(pkTrim));
  }
  if (name) {
    if (index?.byCustomerName?.has(name)) push(index.byCustomerName.get(name));
    if (index?.byCustomerId?.has(name)) push(index.byCustomerId.get(name));
  }
  return merged;
}

/**
 * Same as mergeOpenRentalsForBillingBasis but uses a pre-built index (Rentals page hot path).
 */
export function mergeOpenRentalsForBillingBasisFromIndex(index, keys) {
  const merged = collectMergedRentalsFromIndex(index, keys);
  const byKey = new Map();
  const rank = (r) => {
    const start = Date.parse(r?.rental_start_date || '') || 0;
    const updated = Date.parse(r?.updated_at || '') || 0;
    const created = Date.parse(r?.created_at || '') || 0;
    return [start, updated, created];
  };
  const isNewer = (next, cur) => {
    const [ns, nu, nc] = rank(next);
    const [cs, cu, cc] = rank(cur);
    if (ns !== cs) return ns > cs;
    if (nu !== cu) return nu > cu;
    return nc >= cc;
  };
  merged.forEach((row) => {
    const key = dedupeKeyForRental(row);
    const existing = byKey.get(key);
    if (!existing || isNewer(row, existing)) {
      byKey.set(key, row);
    }
  });
  return Array.from(byKey.values());
}

/**
 * @param {Array<object>} openRentals - open rentals only (see filterRentalsForBillingBasisSnapshot)
 * @param {{ customerListId?: string, customerName?: string, customerPkId?: string }} keys
 */
export function mergeOpenRentalsForBillingBasis(openRentals, { customerListId, customerName, customerPkId }) {
  const listId = String(customerListId || '').trim();
  const name = String(customerName || '').trim();
  const pkTrim = String(customerPkId || '').trim();

  let rentalById = [];
  if (listId) {
    rentalById = (openRentals || []).filter((r) => String(r.customer_id || '').trim() === listId);
  }
  let rentalByPk = [];
  if (pkTrim && RENTAL_CUSTOMER_PK_UUID_RE.test(pkTrim)) {
    rentalByPk = (openRentals || []).filter((r) => String(r.customer_id || '').trim() === pkTrim);
  }
  let rentalByName = [];
  let rentalByNameAsId = [];
  if (name) {
    rentalByName = (openRentals || []).filter((r) => String(r.customer_name || '').trim() === name);
    rentalByNameAsId = (openRentals || []).filter((r) => String(r.customer_id || '').trim() === name);
  }

  const seen = new Set();
  const merged = [];
  const push = (rows) => {
    (rows || []).forEach((r) => {
      if (r?.id && !seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    });
  };
  push(rentalById);
  push(rentalByPk);
  push(rentalByName);
  push(rentalByNameAsId);

  const byKey = new Map();
  const rank = (r) => {
    const start = Date.parse(r?.rental_start_date || '') || 0;
    const updated = Date.parse(r?.updated_at || '') || 0;
    const created = Date.parse(r?.created_at || '') || 0;
    return [start, updated, created];
  };
  const isNewer = (next, cur) => {
    const [ns, nu, nc] = rank(next);
    const [cs, cu, cc] = rank(cur);
    if (ns !== cs) return ns > cs;
    if (nu !== cu) return nu > cu;
    return nc >= cc;
  };

  merged.forEach((row) => {
    const key = dedupeKeyForRental(row);
    const existing = byKey.get(key);
    if (!existing || isNewer(row, existing)) {
      byKey.set(key, row);
    }
  });

  return Array.from(byKey.values());
}

/**
 * Per-SKU counts for pricing / PDF lines (normalized keys, same as `groupBillableUnitCountsByProductCode`).
 * Skips RNB/RNS DNS exception rows — only plain DNS (delivered-not-scanned shippers) add billable units here.
 */
export function summarizeMergedOpenRentalsByProduct(mergedRows, bottles) {
  const { byId, byBarcode } = buildBottleLookupMaps(bottles || []);
  const map = new Map();
  for (const r of mergedRows || []) {
    if (isDnsRentalExcludedFromBillableCount(r)) continue;
    if (rentalExcludedBecauseLinkedAssetLost(r, byId, byBarcode)) continue;
    const raw = resolvedRentalProductCode(r, byId, byBarcode);
    const pkey = raw ? normalizePricingKey(raw) : '__unclassified__';
    map.set(pkey, (map.get(pkey) || 0) + 1);
  }
  const out = [];
  for (const [productCode, count] of map.entries()) {
    if (count > 0) out.push({ productCode, count });
  }
  return out;
}
