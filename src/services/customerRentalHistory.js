/**
 * Per-customer monthly rental history.
 *
 * Strict customer matching: a unit (bottle or rental) belongs to a customer
 * ONLY if its customer-id field literally matches the target customer's
 * id / CustomerListID. No fuzzy name aliasing across customers, no merging
 * by shared display names, no parent/child rollup — that prevents bottles
 * from being attributed to unrelated customers that happen to share a name.
 *
 * Counts are unit-deduplicated across the bottle and rental tables: a bottle
 * + its rental row contribute one unit, not two.
 *
 * Output shape (one row per product code per month):
 *   { productCode, startCount, ship, rtn, endCount, rentDays }
 *
 *   START_COUNT — units that were on rent at the start of the period
 *   SHIP        — units delivered during the period
 *   RTN         — units returned during the period
 *   END_COUNT   — units that were on rent at the end of the period
 *
 * (END_COUNT == START_COUNT + SHIP - RTN as a sanity invariant.)
 */

import {
  bottleProductCode,
  buildBottleLookupMaps,
  isCustomerOwnedForBilling,
  resolveBottleForRental,
} from './billingFromAssets';

function clipYmd(v) {
  const s = String(v || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Strict customer-key set for a single customer record.
 *
 * Always includes id-based keys (id, CustomerListID, customer_id).
 *
 * Conditionally includes the customer's NAME — but ONLY if that name does not
 * collide with any other customer in `allCustomers`. This lets us catch legacy
 * bottles that have customer_name set but no customer_id, while still preventing
 * the "Industrial" over-counting bug where multiple customers share a name.
 */
export function buildStrictCustomerKeys(customerRecord, allCustomers) {
  const keys = new Set();
  if (!customerRecord) return keys;
  const add = (v) => {
    const k = norm(v);
    if (k) keys.add(k);
  };
  add(customerRecord.id);
  add(customerRecord.CustomerListID);
  add(customerRecord.customer_id);

  if (Array.isArray(allCustomers) && allCustomers.length > 0) {
    const nm = normName(customerRecord.name || customerRecord.Name);
    if (nm) {
      let collisions = 0;
      const ownIdNorm = norm(customerRecord.id);
      const ownListNorm = norm(customerRecord.CustomerListID);
      for (const c of allCustomers) {
        if (c === customerRecord) continue;
        const otherIdNorm = norm(c.id);
        const otherListNorm = norm(c.CustomerListID);
        if (
          (ownIdNorm && otherIdNorm && ownIdNorm === otherIdNorm) ||
          (ownListNorm && otherListNorm && ownListNorm === otherListNorm)
        ) continue;
        const otherNm = normName(c.name || c.Name);
        if (otherNm && otherNm === nm) {
          collisions += 1;
          if (collisions > 0) break;
        }
      }
      if (collisions === 0) keys.add(nm);
    }
  }
  return keys;
}

/**
 * Membership test for a rental row against the strict key set.
 * Checks id-style fields plus the (collision-free) name if it's present in keys.
 */
export function rentalBelongsToCustomerStrict(rental, strictKeys) {
  if (!rental || !(strictKeys instanceof Set) || strictKeys.size === 0) return false;
  const cid = norm(rental.customer_id);
  if (cid && strictKeys.has(cid)) return true;
  const nm = normName(rental.customer_name);
  if (nm && strictKeys.has(nm)) return true;
  return false;
}

/**
 * Membership test for a bottle row against the strict key set.
 * Checks `customer_id`, `assigned_customer`, and the (collision-free) name.
 */
export function bottleBelongsToCustomerStrict(bottle, strictKeys) {
  if (!bottle || !(strictKeys instanceof Set) || strictKeys.size === 0) return false;
  const cid = norm(bottle.customer_id);
  if (cid && strictKeys.has(cid)) return true;
  const ac = norm(bottle.assigned_customer);
  if (ac && strictKeys.has(ac)) return true;
  const acNm = normName(bottle.assigned_customer);
  if (acNm && acNm !== ac && strictKeys.has(acNm)) return true;
  const nm = normName(bottle.customer_name);
  if (nm && strictKeys.has(nm)) return true;
  return false;
}

/**
 * Resolve a SKU/product_code for a rental row, falling back to its linked bottle.
 */
export function rentalProductCodeForHistory(rental, bottleById, bottleByBarcode) {
  const fromRental = String(
    rental?.dns_product_code || rental?.product_code || rental?.product_type || rental?.asset_type || ''
  ).trim();
  if (fromRental) return fromRental;
  const b = resolveBottleForRental(rental, bottleById, bottleByBarcode);
  if (b) {
    const fromBottle = bottleProductCode(b);
    if (fromBottle) return fromBottle;
  }
  return '';
}

/**
 * @param {Array} rentals     — pre-loaded rentals (open + closed) for the org
 * @param {Array} bottles     — pre-loaded bottles for the org
 * @param {object} customerRecord — { id, CustomerListID, name, ... }
 * @param {string} periodStart — YYYY-MM-DD
 * @param {string} periodEnd   — YYYY-MM-DD
 * @returns {Array<{ productCode, startCount, ship, rtn, endCount, rentDays }>}
 *          rentDays is the *typical* days-on-rent within the period (capped at the period length).
 */
function bottleUnitKey(bottle) {
  if (bottle?.id != null && String(bottle.id).trim() !== '') return `bottle:${String(bottle.id).trim()}`;
  const bc = String(bottle?.barcode_number || bottle?.barcode || '').trim().toUpperCase();
  return bc ? `barcode:${bc}` : null;
}

function rentalUnitKey(rental, bottleById, bottleByBarcode) {
  const bid = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
  if (bid) return `bottle:${bid}`;
  const bc = rental?.bottle_barcode != null ? String(rental.bottle_barcode).trim().toUpperCase() : '';
  if (bc) {
    const hit = bottleByBarcode.get(bc);
    if (hit?.id != null && String(hit.id).trim() !== '') return `bottle:${String(hit.id).trim()}`;
    return `barcode:${bc}`;
  }
  return `rental:${String(rental?.id || '').trim()}`;
}

export function computeCustomerRentalHistory({
  rentals = [],
  bottles = [],
  customerRecord,
  allCustomers,
  periodStart,
  periodEnd,
}) {
  const ps = clipYmd(periodStart);
  const pe = clipYmd(periodEnd);
  if (!ps || !pe || ps > pe) return [];
  const strictKeys = buildStrictCustomerKeys(customerRecord, allCustomers);
  if (strictKeys.size === 0) return [];

  const { byId, byBarcode } = buildBottleLookupMaps(bottles);
  const psDate = new Date(`${ps}T00:00:00`);
  const peDate = new Date(`${pe}T23:59:59`);
  const periodDays = Math.max(
    1,
    Math.round((peDate.getTime() - psDate.getTime()) / 86_400_000) + 1
  );

  // Per-unit tracking. A "unit" is a physical cylinder; we want it counted at
  // most once even when both a bottle row AND a rental row exist for it.
  // For each unit we record:
  //   { productCode, atStart, shipped, returned, atEnd, rentDays }
  const units = new Map();
  const ensureUnit = (key, productCode) => {
    if (!units.has(key)) {
      units.set(key, {
        productCode: productCode || '__unclassified__',
        atStart: false,
        shipped: false,
        returned: false,
        atEnd: false,
        rentDays: 0,
      });
    } else if (productCode && units.get(key).productCode === '__unclassified__') {
      units.get(key).productCode = productCode;
    }
    return units.get(key);
  };

  // 1) Bottle table — the source-of-truth "what does the customer hold today"
  //    and the only signal we have for many imports that don't create rental rows.
  //    We treat each currently-assigned bottle as on-rent for the period.
  for (const b of bottles) {
    if (!bottleBelongsToCustomerStrict(b, strictKeys)) continue;
    if (isCustomerOwnedForBilling(b)) continue;
    const uk = bottleUnitKey(b);
    if (!uk) continue;
    const code = bottleProductCode(b);
    const u = ensureUnit(uk, code);
    const del = clipYmd(b.rental_start_date || b.delivery_date || b.purchase_date);
    if (del && del > pe) continue; // not delivered yet by period end
    u.atEnd = true;
    if (!del || del <= ps) {
      u.atStart = true;
    } else if (del >= ps && del <= pe) {
      u.shipped = true;
    }
  }

  // 2) Rental table — adds proper start/return tracking when present, and
  //    captures units that have been returned (so they appear in RTN even
  //    though the bottle is no longer assigned to the customer today).
  for (const r of rentals) {
    if (!rentalBelongsToCustomerStrict(r, strictKeys)) continue;
    const linkedBottle = resolveBottleForRental(r, byId, byBarcode);
    if (linkedBottle && isCustomerOwnedForBilling(linkedBottle)) continue;
    const rs = clipYmd(r.rental_start_date);
    if (!rs) continue;
    const re = clipYmd(r.rental_end_date);
    if (re && rs > re) continue;

    const uk = rentalUnitKey(r, byId, byBarcode);
    if (!uk) continue;
    const code = rentalProductCodeForHistory(r, byId, byBarcode);
    const u = ensureUnit(uk, code);

    const onAtStart = rs <= ps && (!re || re > ps);
    const shippedInPeriod = rs >= ps && rs <= pe;
    const returnedInPeriod = !!re && re >= ps && re <= pe;
    const onAtEnd = rs <= pe && (!re || re > pe);

    if (onAtStart) u.atStart = true;
    if (shippedInPeriod) u.shipped = true;
    if (returnedInPeriod) u.returned = true;
    if (onAtEnd) {
      u.atEnd = true;
    } else if (returnedInPeriod) {
      u.atEnd = false;
    }

    const effectiveStart = rs > ps ? rs : ps;
    const effectiveEnd = !re ? pe : (re < pe ? re : pe);
    if (effectiveStart <= effectiveEnd) {
      const startMs = new Date(`${effectiveStart}T00:00:00`).getTime();
      const endMs = new Date(`${effectiveEnd}T23:59:59`).getTime();
      const days = Math.max(0, Math.round((endMs - startMs) / 86_400_000) + 1);
      u.rentDays = Math.max(u.rentDays, Math.min(days, periodDays));
    }
  }

  const buckets = new Map();
  const ensure = (code) => {
    const key = code || '__unclassified__';
    if (!buckets.has(key)) {
      buckets.set(key, {
        productCode: key,
        startCount: 0,
        ship: 0,
        rtn: 0,
        endCount: 0,
        totalRentDays: 0,
        rentDayCount: 0,
      });
    }
    return buckets.get(key);
  };

  for (const u of units.values()) {
    const bucket = ensure(u.productCode);
    if (u.atStart) bucket.startCount += 1;
    if (u.shipped) bucket.ship += 1;
    if (u.returned) bucket.rtn += 1;
    if (u.atEnd) bucket.endCount += 1;
    if (u.rentDays > 0) {
      bucket.totalRentDays += u.rentDays;
      bucket.rentDayCount += 1;
    } else if (u.atEnd || u.atStart) {
      bucket.totalRentDays += periodDays;
      bucket.rentDayCount += 1;
    }
  }

  const out = [];
  for (const b of buckets.values()) {
    if (b.startCount === 0 && b.ship === 0 && b.rtn === 0 && b.endCount === 0) continue;
    const avgRentDays = b.rentDayCount > 0
      ? Math.round((b.totalRentDays / b.rentDayCount) * 10) / 10
      : periodDays;
    out.push({
      productCode: b.productCode,
      startCount: b.startCount,
      ship: b.ship,
      rtn: b.rtn,
      endCount: b.endCount,
      rentDays: avgRentDays,
    });
  }

  out.sort((a, b) => {
    if (b.endCount !== a.endCount) return b.endCount - a.endCount;
    return String(a.productCode).localeCompare(String(b.productCode));
  });
  return out;
}

export function lastDayOfMonth(ym) {
  const m = String(ym || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const d = new Date(year, month, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function firstDayOfMonth(ym) {
  const m = String(ym || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-01`;
}
