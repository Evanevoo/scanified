import {
  RENTAL_CLASS_CATALOG,
  getRentalClassById,
  formatRentalClassLabel,
  resolveBottleToRentalClassId,
  getCatalogMonthlyBillable,
} from './rentalClassCatalog';

/** @typedef {{ id: string, group: string, name: string, method: string, defaultDaily: number|null, defaultWeekly: number|null, defaultMonthly: number|null, matchProductCode?: string|null, matchCategory?: string|null, sortOrder?: number }} UnifiedClass */

export function mapDbRowToClass(row) {
  if (!row?.id) return null;
  const methodRaw = (row.rental_method != null ? String(row.rental_method) : '').trim().toLowerCase();
  return {
    id: row.id,
    group: row.group_name || 'Classes',
    name: row.class_name || 'Unnamed',
    method: methodRaw || 'monthly',
    defaultDaily: row.default_daily != null ? parseFloat(String(row.default_daily)) : null,
    defaultWeekly: row.default_weekly != null ? parseFloat(String(row.default_weekly)) : null,
    defaultMonthly: row.default_monthly != null ? parseFloat(String(row.default_monthly)) : null,
    matchProductCode: row.match_product_code || null,
    matchCategory: row.match_category || null,
    sortOrder: row.sort_order ?? 0,
  };
}

/**
 * Organization classes first (sort_order), then built-in catalog entries not shadowed by same id.
 * @param {Array<Record<string, unknown>>} orgRows
 * @returns {UnifiedClass[]}
 */
export function getUnifiedClasses(orgRows) {
  const mapped = (orgRows || []).map(mapDbRowToClass).filter(Boolean);
  const orgIds = new Set(mapped.map((m) => String(m.id)));
  const legacyAsUnified = RENTAL_CLASS_CATALOG.filter((c) => !orgIds.has(c.id)).map((c) => ({
    id: c.id,
    group: c.group,
    name: c.name,
    method: c.method,
    defaultDaily: c.defaultDaily ?? null,
    defaultWeekly: c.defaultWeekly ?? null,
    defaultMonthly: c.defaultMonthly ?? null,
    matchProductCode: null,
    matchCategory: null,
    sortOrder: 10000,
  }));
  const sortedOrg = mapped.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      `${a.group}::${a.name}`.localeCompare(`${b.group}::${b.name}`)
  );
  const sortedLegacy = legacyAsUnified.sort((a, b) =>
    `${a.group}::${a.name}`.localeCompare(`${b.group}::${b.name}`)
  );
  if (sortedOrg.length === 0) return sortedLegacy;
  return [...sortedOrg, ...sortedLegacy];
}

export function formatUnifiedClassLabel(c) {
  if (!c) return '';
  return `${c.group}::${c.name}`;
}

/**
 * @param {string} classId
 * @param {Array<Record<string, unknown>>} orgRows
 * @returns {UnifiedClass|null}
 */
export function getClassDefinition(classId, orgRows) {
  if (!classId) return null;
  const fromOrg = (orgRows || []).find((r) => String(r.id) === String(classId));
  if (fromOrg) return mapDbRowToClass(fromOrg);
  const legacy = getRentalClassById(classId);
  if (!legacy) return null;
  return {
    id: legacy.id,
    group: legacy.group,
    name: legacy.name,
    method: legacy.method,
    defaultDaily: legacy.defaultDaily ?? null,
    defaultWeekly: legacy.defaultWeekly ?? null,
    defaultMonthly: legacy.defaultMonthly ?? null,
    matchProductCode: null,
    matchCategory: null,
    sortOrder: 0,
  };
}

/**
 * Resolve bottle → class id (org match first, then explicit key, then legacy heuristics).
 * @returns {{ classId: string|null, classDef: UnifiedClass|null, matchKind: 'org_product'|'org_category'|'bottle_key'|'legacy'|'none' }}
 */
export function resolveBottleToClass(bottle, orgRows) {
  if (!bottle) return { classId: null, classDef: null, matchKind: 'none' };

  const explicit = (bottle.rental_class_id || bottle.rental_class_key || '').toString().trim();
  if (explicit) {
    const def = getClassDefinition(explicit, orgRows);
    if (def) return { classId: def.id, classDef: def, matchKind: 'bottle_key' };
  }

  const pc = (bottle.product_code || '').toString().trim();
  const cat = (bottle.category || '').toString().trim();
  const sorted = [...(orgRows || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  /** Exact product code match beats prefix; longest prefix wins (so BOX300-16P matches BOX300-16PK). */
  const MIN_PRODUCT_PREFIX_LEN = 4;
  if (pc) {
    const pcNorm = pc.toLowerCase();
    let bestRow = null;
    let bestScore = -1;
    for (const row of sorted) {
      const m = (row.match_product_code || '').toString().trim();
      if (!m) continue;
      const mNorm = m.toLowerCase();
      let score = -1;
      if (pcNorm === mNorm) {
        score = 1_000_000 + mNorm.length;
      } else if (mNorm.length >= MIN_PRODUCT_PREFIX_LEN && pcNorm.startsWith(mNorm)) {
        score = mNorm.length;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }
    if (bestRow) {
      const def = mapDbRowToClass(bestRow);
      return { classId: def.id, classDef: def, matchKind: 'org_product' };
    }
  }

  /** Category: exact or bottle category starts with match (INDUSTRIAL matches INDUSTRIAL CYLINDERS). */
  const MIN_CATEGORY_PREFIX_LEN = 3;
  if (cat) {
    const catNorm = cat.toLowerCase();
    let bestRow = null;
    let bestScore = -1;
    for (const row of sorted) {
      const m = (row.match_category || '').toString().trim();
      if (!m) continue;
      const mNorm = m.toLowerCase();
      let score = -1;
      if (catNorm === mNorm) {
        score = 1_000_000 + mNorm.length;
      } else if (mNorm.length >= MIN_CATEGORY_PREFIX_LEN && catNorm.startsWith(mNorm)) {
        score = mNorm.length;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }
    if (bestRow) {
      const def = mapDbRowToClass(bestRow);
      return { classId: def.id, classDef: def, matchKind: 'org_category' };
    }
  }

  const legacyId = resolveBottleToRentalClassId(bottle);
  const legacyDef = getRentalClassById(legacyId);
  if (legacyDef) {
    return {
      classId: legacyDef.id,
      classDef: {
        id: legacyDef.id,
        group: legacyDef.group,
        name: legacyDef.name,
        method: legacyDef.method,
        defaultDaily: legacyDef.defaultDaily ?? null,
        defaultWeekly: legacyDef.defaultWeekly ?? null,
        defaultMonthly: legacyDef.defaultMonthly ?? null,
        matchProductCode: null,
        matchCategory: null,
        sortOrder: 0,
      },
      matchKind: 'legacy',
    };
  }
  return { classId: null, classDef: null, matchKind: 'none' };
}

const num = (v) => (v != null && v !== '' ? parseFloat(String(v)) : NaN);

const MIN_CUSTOMER_SKU_PREFIX_LEN = 4;

/**
 * Customer pricing row: negotiated rate by inventory product code (not serial/barcode).
 * Exact key match first, then longest prefix where asset code starts with map key (min key length 4).
 *
 * @param {Record<string, unknown>|null|undefined} customerPricingRow
 * @param {string} productCode — from bottle.product_code
 * @returns {{ monthly?: number, daily?: number }|null}
 */
export function pickCustomerProductRateEntry(customerPricingRow, productCode) {
  const raw = (productCode || '').toString().trim();
  if (!raw) return null;
  const map = customerPricingRow?.rental_rates_by_product_code;
  if (!map || typeof map !== 'object') return null;
  const norm = raw.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (!k || typeof v !== 'object' || v == null) continue;
    if (k.trim().toLowerCase() === norm) return v;
  }
  let best = null;
  let bestLen = -1;
  for (const [k, v] of Object.entries(map)) {
    if (!k || typeof v !== 'object' || v == null) continue;
    const kk = k.trim().toLowerCase();
    if (kk.length < MIN_CUSTOMER_SKU_PREFIX_LEN) continue;
    if (norm.startsWith(kk) && kk.length > bestLen) {
      bestLen = kk.length;
      best = v;
    }
  }
  return best;
}

/** Default monthly when no org class, no override, and no customer discount. */
export const DEFAULT_SYSTEM_MONTHLY_RENTAL = 10;

function parsePositiveRate(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * customer_pricing.rental_class_rates keys may be org UUIDs or legacy catalog ids.
 * Try resolved class id, bottle's explicit keys, then legacy heuristic id (case-insensitive uuid match).
 *
 * @param {Record<string, unknown>|null|undefined} overrides
 * @param {string|null} classId
 * @param {Record<string, unknown>|null|undefined} bottle
 * @returns {{ entry: Record<string, unknown>, matchedKey: string }|null}
 */
export function getRentalClassOverrideEntry(overrides, classId, bottle) {
  if (!overrides || typeof overrides !== 'object') return null;
  const keysToTry = [];
  if (classId) keysToTry.push(String(classId));
  if (bottle) {
    const bid = (bottle.rental_class_id || '').toString().trim();
    const bkey = (bottle.rental_class_key || '').toString().trim();
    if (bid) keysToTry.push(bid);
    if (bkey) keysToTry.push(bkey);
  }
  const legacyId = bottle ? resolveBottleToRentalClassId(bottle) : null;
  if (legacyId && legacyId !== classId) keysToTry.push(legacyId);

  const seen = new Set();
  for (const k of keysToTry) {
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const entry = overrides[k];
    if (entry && typeof entry === 'object') return { entry, matchedKey: k };
  }

  const want = classId ? String(classId).toLowerCase() : '';
  if (want) {
    for (const [k, entry] of Object.entries(overrides)) {
      if (entry && typeof entry === 'object' && String(k).toLowerCase() === want) {
        return { entry, matchedKey: k };
      }
    }
  }
  return null;
}

/**
 * Single precedence for recurring monthly workspace billing (before yearly lease rules in rentalWorkspaceMerge):
 * 1) Customer fixed_rate_override — same flat rate for every billable cylinder
 * 2) Customer rental_rates_by_product_code — monthly (or daily×30 for daily-method classes) keyed by SKU; applies to any asset with that product code (replacement-safe)
 * 3) Class rates: customer rental_class_rates → org/legacy class defaults (monthly; daily-only classes use daily×30 when monthly unset; no_rent → 0; starting_balance excluded)
 * 4) Customer discount_percent off system default
 * 5) System default ($10/mo)
 *
 * @param {Record<string, unknown>|null|undefined} customerPricingRow — customer_pricing row or null
 * @param {Record<string, unknown>|null|undefined} bottle
 * @param {Array<Record<string, unknown>>} orgRows — organization_rental_classes
 * @returns {number}
 */
export function computeEffectiveMonthlyRate(customerPricingRow, bottle, orgRows = []) {
  const fixed = parsePositiveRate(customerPricingRow?.fixed_rate_override);
  if (fixed != null && fixed > 0) {
    return fixed;
  }

  const { classId, classDef } = resolveBottleToClass(bottle, orgRows);

  // Deposit / starting-balance classes are not recurring monthly rent in this workspace
  if (classDef?.method === 'starting_balance') {
    return applyCustomerDiscountOrDefault(customerPricingRow);
  }

  const pc = (bottle?.product_code || '').toString().trim();
  if (pc) {
    const prodEntry = pickCustomerProductRateEntry(customerPricingRow, pc);
    if (prodEntry) {
      const m =
        prodEntry.monthly != null && prodEntry.monthly !== ''
          ? parseFloat(String(prodEntry.monthly))
          : NaN;
      if (Number.isFinite(m)) {
        return m;
      }
      const d =
        prodEntry.daily != null && prodEntry.daily !== ''
          ? parseFloat(String(prodEntry.daily))
          : NaN;
      if (Number.isFinite(d) && classDef?.method === 'daily') {
        return d * 30;
      }
    }
  }

  if (!classDef) {
    return applyCustomerDiscountOrDefault(customerPricingRow);
  }

  if (classDef.method === 'no_rent') {
    return 0;
  }

  const overrides =
    customerPricingRow?.rental_class_rates && typeof customerPricingRow.rental_class_rates === 'object'
      ? customerPricingRow.rental_class_rates
      : {};

  const picked = getRentalClassOverrideEntry(overrides, classId, bottle);
  const narrowedOverrides = picked && classId ? { [String(classId)]: picked.entry } : {};

  const resolved = getResolvedRatesWithDef(narrowedOverrides, classId, classDef);
  if (resolved.monthly != null && Number.isFinite(resolved.monthly)) {
    return resolved.monthly;
  }

  if (classDef.method === 'daily' && resolved.daily != null && Number.isFinite(resolved.daily)) {
    return resolved.daily * 30;
  }

  const fallbackMonthly =
    getMonthlyBillableFromUnifiedDef(classDef) ?? getCatalogMonthlyBillable(getRentalClassById(classId));
  if (fallbackMonthly != null && Number.isFinite(fallbackMonthly)) {
    return fallbackMonthly;
  }

  return applyCustomerDiscountOrDefault(customerPricingRow);
}

function applyCustomerDiscountOrDefault(customerPricingRow) {
  const disc = parsePositiveRate(customerPricingRow?.discount_percent);
  if (disc != null && disc > 0) {
    return DEFAULT_SYSTEM_MONTHLY_RENTAL * (1 - Math.min(disc, 100) / 100);
  }
  return DEFAULT_SYSTEM_MONTHLY_RENTAL;
}

/**
 * @param {Record<string, { daily?: number, weekly?: number, monthly?: number }>|null|undefined} overrides
 * @param {string} classId
 * @param {UnifiedClass|null} classDef
 */
export function getResolvedRatesWithDef(overrides, classId, classDef) {
  const o = overrides && typeof overrides === 'object' ? overrides[classId] : null;
  const pick = (key, fallback) => {
    if (o && o[key] != null && o[key] !== '') {
      const n = parseFloat(String(o[key]));
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };
  return {
    daily: pick('daily', classDef && Number.isFinite(num(classDef.defaultDaily)) ? num(classDef.defaultDaily) : null),
    weekly: pick('weekly', classDef && Number.isFinite(num(classDef.defaultWeekly)) ? num(classDef.defaultWeekly) : null),
    monthly: pick('monthly', classDef && Number.isFinite(num(classDef.defaultMonthly)) ? num(classDef.defaultMonthly) : null),
  };
}

export function getMonthlyBillableFromUnifiedDef(classDef) {
  if (!classDef) return null;
  if (classDef.method === 'starting_balance') return null;
  if (classDef.method === 'no_rent') return 0;

  const m = classDef.defaultMonthly;
  if (m != null && m !== '') {
    const n = parseFloat(String(m));
    if (Number.isFinite(n)) return n;
  }

  if (classDef.method === 'daily' && Number.isFinite(classDef.defaultDaily)) {
    return classDef.defaultDaily * 30;
  }

  return null;
}

/**
 * @deprecated Prefer computeEffectiveMonthlyRate (same rules); kept for callers that expect the old name.
 */
export function getSyntheticMonthlyFromClassPricing(customerPricingRow, bottle, orgRows) {
  return computeEffectiveMonthlyRate(customerPricingRow, bottle, orgRows);
}

function near(a, b, eps = 0.02) {
  return Math.abs(a - b) < eps;
}

/**
 * Human-readable rate line for Rentals UI.
 * @returns {{ label: string, shortLabel: string, classLabel: string|null }}
 */
export function computeRentalRateDisplayMeta(rental, customerPricingRow, orgRows) {
  const amount = parseFloat(String(rental.rental_amount ?? 0));
  const bottle = rental.bottles;
  const pricing = customerPricingRow || null;

  if (rental.is_dns) {
    return { label: 'Exception / DNS row', shortLabel: 'DNS', classLabel: null };
  }
  if ((rental.rental_type || '') === 'yearly' && rental.lease_agreement_id) {
    return { label: 'Yearly lease agreement', shortLabel: 'Lease', classLabel: null };
  }

  if (!bottle) {
    if (Number.isFinite(amount) && near(amount, DEFAULT_SYSTEM_MONTHLY_RENTAL)) {
      return { label: `System default ($${DEFAULT_SYSTEM_MONTHLY_RENTAL}/mo)`, shortLabel: 'Default', classLabel: null };
    }
    return { label: 'Saved rental rate', shortLabel: 'Saved', classLabel: null };
  }

  const { classId, classDef } = resolveBottleToClass(bottle, orgRows);
  const classLabel = classDef ? formatUnifiedClassLabel(classDef) : null;

  if (classDef?.method === 'no_rent' && Number.isFinite(amount) && near(amount, 0)) {
    return { label: 'No rent (organization class)', shortLabel: 'No rent', classLabel };
  }

  const overrides =
    pricing?.rental_class_rates && typeof pricing.rental_class_rates === 'object' ? pricing.rental_class_rates : {};
  const picked = getRentalClassOverrideEntry(overrides, classId, bottle);
  const custMonthly =
    picked?.entry?.monthly != null ? parseFloat(String(picked.entry.monthly)) : null;
  const orgMonthly = classDef ? getMonthlyBillableFromUnifiedDef(classDef) : null;
  const effectiveFromClass =
    custMonthly != null && Number.isFinite(custMonthly)
      ? custMonthly
      : orgMonthly != null && Number.isFinite(orgMonthly)
        ? orgMonthly
        : null;

  const fixed = pricing?.fixed_rate_override != null ? parseFloat(String(pricing.fixed_rate_override)) : null;
  const disc = pricing?.discount_percent != null ? parseFloat(String(pricing.discount_percent)) : 0;
  const discountBase = DEFAULT_SYSTEM_MONTHLY_RENTAL * (1 - (Number.isFinite(disc) ? disc : 0) / 100);

  // Display precedence matches billing: fixed → product code → class → discount → default
  if (fixed != null && Number.isFinite(fixed) && fixed > 0 && near(amount, fixed)) {
    return { label: 'Customer fixed rate (all assets)', shortLabel: 'Fixed', classLabel };
  }

  const pcMeta = (bottle.product_code || '').toString().trim();
  if (pcMeta && pricing) {
    const ent = pickCustomerProductRateEntry(pricing, pcMeta);
    const pm = ent?.monthly != null ? parseFloat(String(ent.monthly)) : NaN;
    if (Number.isFinite(pm) && near(amount, pm)) {
      return {
        label: `Customer rate by product code (${pcMeta})`,
        shortLabel: 'SKU rate',
        classLabel,
      };
    }
  }

  if (classId && effectiveFromClass != null && near(amount, effectiveFromClass)) {
    if (custMonthly != null && Number.isFinite(custMonthly)) {
      return {
        label: `Customer class rate (${classLabel || classId})`,
        shortLabel: 'Customer',
        classLabel,
      };
    }
    return {
      label: `Organization class default (${classLabel || classId})`,
      shortLabel: 'Org class',
      classLabel,
    };
  }

  if (Number.isFinite(discountBase) && disc > 0 && near(amount, discountBase)) {
    return { label: `Customer discount (${disc}% off base)`, shortLabel: 'Discount', classLabel };
  }

  if (near(amount, DEFAULT_SYSTEM_MONTHLY_RENTAL)) {
    return { label: `System default ($${DEFAULT_SYSTEM_MONTHLY_RENTAL}/mo)`, shortLabel: 'Default', classLabel };
  }

  return { label: 'Per-asset rate (saved)', shortLabel: 'Custom', classLabel };
}

/** Distinct product codes from bottles for "add from inventory". */
export function distinctProductCodesFromBottles(bottles) {
  const set = new Set();
  (bottles || []).forEach((b) => {
    const c = (b.product_code || '').toString().trim();
    if (c) set.add(c);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Distinct categories from bottles */
export function distinctCategoriesFromBottles(bottles) {
  const set = new Set();
  (bottles || []).forEach((b) => {
    const c = (b.category || '').toString().trim();
    if (c) set.add(c);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

export { formatRentalClassLabel, RENTAL_CLASS_CATALOG };
