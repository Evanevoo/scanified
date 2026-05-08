/**
 * Billing basis for rental charges: same merge + dedupe as Customer Detail
 * (`fetchMergedOpenRentalsForCustomer` → Rental History "N open — billing basis").
 *
 * Open rentals are merged by CustomerListID match plus legacy `customer_name` /
 * `customer_id`-as-display-name rows, then deduped per bottle / DNS business key.
 */

import {
  buildBottleLookupMaps,
  isRentalOpen,
  resolvedRentalProductCode,
} from './billingFromAssets';
import { normalizePricingKey } from './pricingResolution';

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
 * @param {Array<object>} openRentals - open rentals only (see filterRentalsForBillingBasisSnapshot)
 * @param {{ customerListId?: string, customerName?: string }} keys
 */
export function mergeOpenRentalsForBillingBasis(openRentals, { customerListId, customerName }) {
  const listId = String(customerListId || '').trim();
  const name = String(customerName || '').trim();

  let rentalById = [];
  if (listId) {
    rentalById = (openRentals || []).filter((r) => String(r.customer_id || '').trim() === listId);
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
 */
export function summarizeMergedOpenRentalsByProduct(mergedRows, bottles) {
  const { byId, byBarcode } = buildBottleLookupMaps(bottles || []);
  const map = new Map();
  for (const r of mergedRows || []) {
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
