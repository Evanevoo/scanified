import {
  buildAssetPricingMap,
  buildCustomerOverrideMap,
  defaultUnitRatesFromAssetPricingTable,
  flattenCustomerPricingRowsToLegacyOverrides,
  resolveMonthlyDisplayUnit,
} from '../services/pricingResolution';

const isMissingTableError = (res) =>
  !!res?.error &&
  (res.error.code === '42P01' || res.error.code === 'PGRST205' || res.status === 404);

const safeSelect = async (promise, fallback = []) => {
  const res = await promise;
  if (isMissingTableError(res)) {
    return { data: fallback, error: null };
  }
  return res;
};

/**
 * Live org pricing context for imports / transfers. No caching — always reflects current DB + localStorage overrides.
 * Shape: { customerOverrideMap, assetPricingMap, defaults }.
 */
export const fetchOrgRentalPricingContext = async (supabaseClient, organizationId) => {
  if (!organizationId) {
    const defaults = { monthly: 12, yearly: 144 };
    return {
      customerOverrideMap: new Map(),
      assetPricingMap: new Map(),
      defaults,
      organizationId,
    };
  }

  const [legacyRes, overridesRes, assetPricingRes, customersRes] = await Promise.all([
    safeSelect(
      supabaseClient
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organizationId)
    ),
    safeSelect(
      supabaseClient
        .from('customer_pricing_overrides')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    safeSelect(
      supabaseClient
        .from('asset_type_pricing')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    safeSelect(
      supabaseClient
        .from('customers')
        .select('id, CustomerListID')
        .eq('organization_id', organizationId)
    ),
  ]);

  if (legacyRes.error) throw legacyRes.error;
  if (overridesRes.error) throw overridesRes.error;
  if (assetPricingRes.error) throw assetPricingRes.error;

  const legacyFlat = flattenCustomerPricingRowsToLegacyOverrides(legacyRes.data || []);
  const customerOverrideMap = buildCustomerOverrideMap({
    legacyPricingOverrides: legacyFlat,
    customerPricingOverrides: overridesRes.data || [],
    organizationId,
    customers: customersRes.data || [],
  });
  const assetPricingMap = buildAssetPricingMap(assetPricingRes.data || []);
  const defaults = defaultUnitRatesFromAssetPricingTable(assetPricingRes.data || []);

  return {
    customerOverrideMap,
    assetPricingMap,
    defaults,
    organizationId,
  };
};

/** No-op: legacy hook for callers that invalidated a removed cache. */
export const invalidateOrgRentalPricingCache = () => {};

export const monthlyRateForProductPlaceholder = (customerId, productCode, pricingCtx) => {
  const cid = String(customerId || '').trim();
  if (!cid) return 0;
  const { customerOverrideMap, assetPricingMap, defaults } = pricingCtx || {};
  return resolveMonthlyDisplayUnit({
    customerKeyRaw: cid,
    productCodeRaw: productCode,
    customerOverrideMap: customerOverrideMap || new Map(),
    assetPricingMap: assetPricingMap || new Map(),
    defaultMonthly: defaults?.monthly,
  });
};

export const monthlyRateForNewRental = (customerId, bottle, pricingCtx) => {
  const productCode =
    bottle?.product_code ||
    bottle?.dns_product_code ||
    bottle?.type ||
    bottle?.category ||
    '';
  return monthlyRateForProductPlaceholder(customerId, productCode, pricingCtx);
};
