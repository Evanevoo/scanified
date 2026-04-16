import { computeEffectiveMonthlyRate } from '../utils/organizationRentalClassUtils';

const pricingCtxCache = new Map();
const CACHE_MS = 25_000;

/** Call after editing organization_rental_classes so Customer Detail / imports see new rates immediately. */
export function invalidateOrgRentalPricingCache(organizationId) {
  if (organizationId != null && organizationId !== '') {
    pricingCtxCache.delete(String(organizationId));
  } else {
    pricingCtxCache.clear();
  }
}

/**
 * Loads org-wide data needed to price a rental line from bottle + customer.
 * Short TTL cache avoids N round-trips when many rentals are created in one batch.
 */
export async function fetchOrgRentalPricingContext(supabase, organizationId) {
  if (!organizationId) {
    return { organizationRentalClasses: [], pricingByCustomer: {} };
  }
  const now = Date.now();
  const hit = pricingCtxCache.get(organizationId);
  if (hit && now - hit.at < CACHE_MS) {
    return hit.data;
  }

  const [pricingRes, classesRes] = await Promise.all([
    supabase.from('customer_pricing').select('*').eq('organization_id', organizationId),
    supabase
      .from('organization_rental_classes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true }),
  ]);

  const pricingByCustomer = (pricingRes.data || []).reduce((map, row) => {
    if (row.customer_id != null) map[row.customer_id] = row;
    return map;
  }, {});

  const data = {
    organizationRentalClasses: classesRes.data || [],
    pricingByCustomer,
  };
  pricingCtxCache.set(organizationId, { at: now, data });
  return data;
}

/**
 * @param {string} customerId — CustomerListID
 * @param {Record<string, unknown>} bottle — row from bottles
 * @param {{ organizationRentalClasses: Array, pricingByCustomer: Record<string, unknown> }} ctx
 */
export function monthlyRateForNewRental(customerId, bottle, ctx) {
  const pricingRow = ctx?.pricingByCustomer?.[customerId] || null;
  const orgRows = ctx?.organizationRentalClasses || [];
  return computeEffectiveMonthlyRate(pricingRow, bottle, orgRows);
}

/** DNS / placeholder rows with no bottle_id — use invoice line product for class matching. */
export function monthlyRateForProductPlaceholder(customerId, productCode, ctx) {
  const bottle = { product_code: productCode || '', category: '' };
  return monthlyRateForNewRental(customerId, bottle, ctx);
}
