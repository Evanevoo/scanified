/**
 * Canonical rental / subscription unit pricing resolution.
 * Hierarchy: customer-specific override (SKU, prefix, or __all__) → org asset_type_pricing → optional line fallback.
 * All UI, invoices, and aggregates should use these functions with live data from Supabase — not duplicated formulas.
 */

import { groupBillableUnitCountsByProductCode } from './billingFromAssets';
import {
  findActiveLeaseContract,
  sumLeaseContractAnnualTotal,
  leaseAnnualToCycleTotal,
} from './leaseBilling';

export const normalizePricingKey = (v) => String(v || '').trim().toLowerCase();

export function buildAssetPricingMap(assetTypePricing) {
  const map = new Map();
  for (const p of assetTypePricing || []) {
    if (!p?.product_code) continue;
    map.set(normalizePricingKey(p.product_code), p);
  }
  return map;
}

/** Flatten customer_pricing rows into override-shaped entries (incl. per-SKU JSON). */
export function flattenCustomerPricingRowsToLegacyOverrides(customerPricingRows) {
  const mapped = [];
  for (const row of customerPricingRows || []) {
    const customerId = row.customer_id || row.CustomerListID || row.customer_number;
    if (!customerId) continue;
    mapped.push({
      customer_id: customerId,
      product_code: null,
      fixed_rate_override: row.fixed_rate_override ?? null,
      custom_monthly_price: row.custom_monthly_price ?? row.monthly ?? null,
      custom_yearly_price: row.custom_yearly_price ?? row.yearly ?? null,
      discount_percent: row.discount_percent ?? 0,
      is_active: row.is_active !== false,
    });
    const byProduct = row.rental_rates_by_product_code;
    if (byProduct && typeof byProduct === 'object') {
      Object.entries(byProduct).forEach(([productCode, value]) => {
        if (!productCode) return;
        const monthly =
          typeof value === 'object' && value !== null
            ? (value.monthly ?? value.rate ?? null)
            : value;
        const yearly =
          typeof value === 'object' && value !== null
            ? (value.yearly ?? null)
            : null;
        mapped.push({
          customer_id: customerId,
          product_code: productCode,
          fixed_rate_override: null,
          custom_monthly_price: monthly,
          custom_yearly_price: yearly,
          discount_percent: row.discount_percent ?? 0,
          is_active: row.is_active !== false,
        });
      });
    }
  }
  return mapped;
}

/**
 * Map one stored customer_id to every lookup alias (UUID ↔ CustomerListID) so overrides
 * match subscriptions.rental rows regardless of which identifier bulk-edit saved.
 */
function expandCustomerKeysForOverrides(customerIdRaw, customers) {
  const keys = new Set();
  const add = (v) => {
    const k = normalizePricingKey(v);
    if (k) keys.add(k);
  };
  add(customerIdRaw);
  const raw = String(customerIdRaw ?? '').trim();
  if (!raw) return keys;
  for (const c of customers || []) {
    const id = c?.id != null ? String(c.id).trim() : '';
    const list = c?.CustomerListID != null ? String(c.CustomerListID).trim() : '';
    if (!id && !list) continue;
    if (
      raw === id ||
      raw === list ||
      normalizePricingKey(raw) === normalizePricingKey(id) ||
      normalizePricingKey(raw) === normalizePricingKey(list)
    ) {
      add(id);
      add(list);
      break;
    }
  }
  return keys;
}

export function buildCustomerOverrideMap({
  legacyPricingOverrides,
  customerPricingOverrides,
  organizationId,
  /** When provided, each override is registered under UUID and CustomerListID keys. */
  customers,
}) {
  const byCustomer = new Map();
  const normalize = normalizePricingKey;

  const registerOverride = (o, productKey) => {
    const aliasKeys = expandCustomerKeysForOverrides(o.customer_id, customers);
    const keyList = aliasKeys.size > 0 ? [...aliasKeys] : [normalize(o.customer_id)].filter(Boolean);
    for (const customerKey of keyList) {
      if (!customerKey) continue;
      byCustomer.set(`${customerKey}::${productKey}`, o);
    }
  };

  for (const o of legacyPricingOverrides || []) {
    if (o?.is_active === false) continue;
    const customerKey = normalize(o.customer_id);
    if (!customerKey) continue;
    const productKey = normalize(o.product_code) || '__all__';
    registerOverride(o, productKey);
  }
  for (const o of customerPricingOverrides || []) {
    if (o?.is_active === false) continue;
    const customerKey = normalize(o.customer_id);
    if (!customerKey) continue;
    const productKey = normalize(o.product_code) || '__all__';
    registerOverride(o, productKey);
  }

  if (organizationId) {
    try {
      const prefix = `customer_sku_rates:${organizationId}:`;
      for (let i = 0; i < localStorage.length; i += 1) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith(prefix)) continue;
        const customerIdRaw = storageKey.slice(prefix.length);
        const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (!parsed || typeof parsed !== 'object') continue;
        Object.entries(parsed).forEach(([code, value]) => {
          const productKey = normalize(code);
          const monthly = Number(value?.monthly);
          const yearly = value?.yearly != null ? Number(value.yearly) : null;
          if (!productKey || (!Number.isFinite(monthly) && !(yearly != null && Number.isFinite(yearly)))) return;
          const stub = {
            customer_id: customerIdRaw,
            product_code: code,
            custom_monthly_price: Number.isFinite(monthly) ? monthly : null,
            custom_yearly_price: yearly != null && Number.isFinite(yearly) ? yearly : null,
            is_active: true,
            source: 'local_compatibility',
          };
          const aliasKeys = expandCustomerKeysForOverrides(customerIdRaw, customers);
          const keyList = aliasKeys.size > 0 ? [...aliasKeys] : [normalize(customerIdRaw)].filter(Boolean);
          for (const customerKey of keyList) {
            if (!customerKey) continue;
            byCustomer.set(`${customerKey}::${productKey}`, stub);
          }
        });
      }
    } catch {
      // Ignore localStorage read errors.
    }
  }
  return byCustomer;
}

export function findBestOverride(customerOverrideMap, customerKeyRaw, productCodeRaw) {
  const customerKey = normalizePricingKey(customerKeyRaw);
  const productCode = normalizePricingKey(productCodeRaw);
  if (!customerKey || !productCode) return null;

  const exact = customerOverrideMap.get(`${customerKey}::${productCode}`);
  if (exact) return exact;

  let best = null;
  let bestLen = -1;
  for (const [key, value] of customerOverrideMap.entries()) {
    const [cKey, pKey] = key.split('::');
    if (cKey !== customerKey) continue;
    if (!pKey || pKey === '__all__') continue;
    if (productCode.startsWith(pKey) && pKey.length > bestLen) {
      best = value;
      bestLen = pKey.length;
    }
  }
  return best;
}

export function collectNormalizedCustomerKeysForPricingRow(row) {
  const keys = [];
  const seen = new Set();
  const add = (v) => {
    const k = normalizePricingKey(v);
    if (!k || seen.has(k)) return;
    seen.add(k);
    keys.push(k);
  };
  const c = row?.customer;
  add(c?.CustomerListID);
  add(c?.CustomerListId);
  add(row?.customer_id);
  add(c?.id);
  add(c?.customer_id);
  return keys;
}

export function findBestSpecificOverrideMultiKey(customerOverrideMap, row, productCodeRaw) {
  const pc = normalizePricingKey(productCodeRaw);
  if (!pc) return null;
  const customerKeys = collectNormalizedCustomerKeysForPricingRow(row);
  for (const ck of customerKeys) {
    const exact = customerOverrideMap.get(`${ck}::${pc}`);
    if (exact) return exact;
  }
  let best = null;
  let bestLen = -1;
  for (const ck of customerKeys) {
    for (const [key, value] of customerOverrideMap.entries()) {
      const [cKey, pKey] = key.split('::');
      if (cKey !== ck) continue;
      if (!pKey || pKey === '__all__') continue;
      if (pc.startsWith(pKey) && pKey.length > bestLen) {
        best = value;
        bestLen = pKey.length;
      }
    }
  }
  return best;
}

export function findAllProductsOverrideMultiKey(customerOverrideMap, row) {
  for (const ck of collectNormalizedCustomerKeysForPricingRow(row)) {
    const o = customerOverrideMap.get(`${ck}::__all__`);
    if (o) return o;
  }
  return null;
}

/**
 * Effective unit price for one subscription line (monthly or yearly cycle), from live maps.
 * @param {object} params
 * @param {object} params.row - subscription-shaped row with billing_period, customer_id, optional customer
 * @param {object} params.item - line with product_code, description, quantity, optional unit_price (fallback only)
 */
export function resolveEffectiveUnitPrice({
  row,
  item,
  customerOverrideMap,
  assetPricingMap,
  defaultMonthly = null,
  defaultYearly = null,
}) {
  const productCode = normalizePricingKey(item?.product_code || item?.description);
  const period = String(row?.billing_period || 'monthly').toLowerCase();

  const specificOverride = productCode
    ? findBestSpecificOverrideMultiKey(customerOverrideMap, row, item?.product_code || item?.description)
    : null;
  const allProductsOverride = findAllProductsOverrideMultiKey(customerOverrideMap, row);
  const override = specificOverride || allProductsOverride || null;

  const basePricing = productCode ? assetPricingMap.get(productCode) : null;
  const basePrice =
    period === 'yearly'
      ? parseFloat(basePricing?.yearly_price)
      : parseFloat(basePricing?.monthly_price);

  if (override?.fixed_rate_override != null) {
    return parseFloat(override.fixed_rate_override) || 0;
  }
  if (period === 'yearly' && override?.custom_yearly_price != null) {
    return parseFloat(override.custom_yearly_price) || 0;
  }
  if (period === 'yearly' && specificOverride && specificOverride.custom_yearly_price == null && allProductsOverride?.custom_yearly_price != null) {
    return parseFloat(allProductsOverride.custom_yearly_price) || 0;
  }
  if (period === 'monthly' && override?.custom_monthly_price != null) {
    return parseFloat(override.custom_monthly_price) || 0;
  }

  if (basePricing && Number.isFinite(basePrice)) {
    const discount = parseFloat(override?.discount_percent) || 0;
    if (discount > 0) {
      return Math.max(0, Math.round(basePrice * (1 - discount / 100) * 100) / 100);
    }
    return basePrice || 0;
  }

  const parsed = parseFloat(item?.unit_price);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const fb = period === 'yearly' ? defaultYearly : defaultMonthly;
  const fbNum = Number(fb);
  if (Number.isFinite(fbNum) && fbNum > 0) return fbNum;

  return 0;
}

/** @deprecated Use resolveEffectiveUnitPrice — alias kept for existing imports. */
export const resolveDisplayUnitFromMaps = resolveEffectiveUnitPrice;

export function resolveMonthlyDisplayUnit({
  customerKeyRaw,
  productCodeRaw,
  customerOverrideMap,
  assetPricingMap,
  defaultMonthly = null,
  customer = null,
}) {
  return resolveEffectiveUnitPrice({
    row: {
      billing_period: 'monthly',
      customer_id: customerKeyRaw,
      customer: customer || { CustomerListID: customerKeyRaw },
    },
    item: { product_code: productCodeRaw },
    customerOverrideMap,
    assetPricingMap,
    defaultMonthly,
  });
}

/** Org-wide default monthly/yearly used when a SKU has no asset_type_pricing row. */
export function defaultUnitRatesFromAssetPricingTable(assetTypePricingRows) {
  const rows = (assetTypePricingRows || []).filter(Boolean);
  const monthlyCandidates = rows
    .map((p) => parseFloat(p?.monthly_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const yearlyCandidates = rows
    .map((p) => parseFloat(p?.yearly_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const monthly = monthlyCandidates.length > 0 ? monthlyCandidates[0] : 12;
  const yearly = yearlyCandidates.length > 0 ? yearlyCandidates[0] : monthly * 12;
  return { monthly, yearly };
}

/**
 * One billing-cycle total: rental = Σ (billable unit count per SKU × resolved unit price);
 * units = assigned bottles + open rentals (incl. DNS), see groupBillableUnitCountsByProductCode.
 * lease = contract annual total mapped to this subscription's billing_period (monthly → ÷12).
 * Does not use subscription_items.quantity for rental mode.
 */
export function computeSubscriptionBillingCycleTotal(sub, customerRecord, ctx, billingData = {}) {
  const { customerOverrideMap, assetPricingMap, defaultMonthly, defaultYearly } = ctx;
  const cust =
    customerRecord || { CustomerListID: sub.customer_id, id: sub.customer_id, billing_mode: 'rental' };
  const mode = cust.billing_mode === 'lease' ? 'lease' : 'rental';
  const rowForPricing = { ...sub, customer: cust };

  if (mode === 'lease') {
    const contract = findActiveLeaseContract(
      billingData.leaseContracts || [],
      sub.customer_id,
      sub.organization_id
    );
    if (!contract) return 0;
    const items = (billingData.leaseContractItems || []).filter((i) => i.contract_id === contract.id);
    const annual = sumLeaseContractAnnualTotal(items);
    return leaseAnnualToCycleTotal(annual, sub.billing_period);
  }

  const groups = groupBillableUnitCountsByProductCode(
    billingData.bottles || [],
    billingData.rentals || [],
    sub.customer_id,
    cust,
    { allCustomers: billingData.customers }
  );
  let sum = 0;
  for (const { productCode, count } of groups) {
    if (count <= 0) continue;
    const unit = resolveEffectiveUnitPrice({
      row: rowForPricing,
      item: { product_code: productCode },
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly,
      defaultYearly,
    });
    sum += unit * count;
  }
  return Math.round(sum * 100) / 100;
}

/** @deprecated Use computeSubscriptionBillingCycleTotal — rental billing ignores subscription line quantities. */
export function computeSubscriptionCycleTotal(sub, activeItems, customerRecord, ctx) {
  void activeItems;
  return computeSubscriptionBillingCycleTotal(sub, customerRecord, ctx, {
    bottles: [],
    rentals: [],
    leaseContracts: [],
    leaseContractItems: [],
  });
}

/**
 * @param {object} billingData — { bottles, rentals?, leaseContracts, leaseContractItems, customers? }
 */
export function computeMRRWithResolution(subscriptions, customers, ctx, billingData = {}) {
  const customerForSub = (sub) =>
    (customers || []).find(
      (c) => c.id === sub.customer_id || c.CustomerListID === sub.customer_id
    ) || { id: sub.customer_id, CustomerListID: sub.customer_id, billing_mode: 'rental' };

  let mrr = 0;
  for (const sub of subscriptions || []) {
    if (sub.status !== 'active') continue;
    const cycle = computeSubscriptionBillingCycleTotal(sub, customerForSub(sub), ctx, billingData);
    mrr += sub.billing_period === 'yearly' ? cycle / 12 : cycle;
  }
  return Math.round(mrr * 100) / 100;
}

/**
 * Read monthly from customer_pricing.rental_rates_by_product_code (exact key, then longest prefix).
 */
export function pickMonthlyFromLegacyRentalRatesJson(ratesObj, productCodeRaw) {
  if (!ratesObj || typeof ratesObj !== 'object') return null;
  const target = normalizePricingKey(productCodeRaw);
  if (!target) return null;

  for (const [key, value] of Object.entries(ratesObj)) {
    if (normalizePricingKey(key) === target) {
      const monthly =
        typeof value === 'object' && value !== null ? (value.monthly ?? value.rate) : value;
      const n = Number(monthly);
      return Number.isFinite(n) ? n : null;
    }
  }
  let best = null;
  let bestLen = -1;
  for (const [key, value] of Object.entries(ratesObj)) {
    const k = normalizePricingKey(key);
    if (!k) continue;
    if (target.startsWith(k) && k.length > bestLen) {
      bestLen = k.length;
      const monthly =
        typeof value === 'object' && value !== null ? (value.monthly ?? value.rate) : value;
      const n = Number(monthly);
      best = Number.isFinite(n) ? n : null;
    }
  }
  return best;
}
