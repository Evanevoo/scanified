const rentalPricingCtxCache = new Map();

const norm = (v) => String(v || '').trim();
const normCode = (v) => norm(v).toUpperCase();
const toNumberOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isMissingTableError = (res) =>
  !!res?.error && (
    res.error.code === '42P01' ||
    res.error.code === 'PGRST205' ||
    res.status === 404
  );

const safeSelect = async (promise, fallback = []) => {
  const res = await promise;
  if (isMissingTableError(res)) {
    return { data: fallback, error: null };
  }
  return res;
};

const pickCustomerProductRateEntry = (customerPricingRow, productCode) => {
  const rates = customerPricingRow?.rental_rates_by_product_code;
  if (!rates || typeof rates !== 'object') return null;
  const target = normCode(productCode);
  if (!target) return null;

  for (const [key, value] of Object.entries(rates)) {
    if (normCode(key) === target) {
      return typeof value === 'object' && value !== null ? value : { monthly: value };
    }
  }

  let best = null;
  let bestLen = -1;
  for (const [key, value] of Object.entries(rates)) {
    const k = normCode(key);
    if (!k) continue;
    if (target.startsWith(k) && k.length > bestLen) {
      bestLen = k.length;
      best = typeof value === 'object' && value !== null ? value : { monthly: value };
    }
  }
  return best;
};

export const fetchOrgRentalPricingContext = async (supabaseClient, organizationId) => {
  if (!organizationId) {
    return {
      customerPricingByCustomerId: new Map(),
      overridesByCustomerProduct: new Map(),
      assetTypePricingByProduct: new Map(),
    };
  }
  const cached = rentalPricingCtxCache.get(organizationId);
  if (cached) return cached;

  const [legacyRes, overridesRes, assetPricingRes] = await Promise.all([
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
  ]);

  if (legacyRes.error) throw legacyRes.error;
  if (overridesRes.error) throw overridesRes.error;
  if (assetPricingRes.error) throw assetPricingRes.error;

  const customerPricingByCustomerId = new Map();
  for (const row of legacyRes.data || []) {
    const id = row.customer_id || row.CustomerListID || row.customer_number;
    if (!id) continue;
    customerPricingByCustomerId.set(norm(id), row);
  }

  const overridesByCustomerProduct = new Map();
  for (const row of overridesRes.data || []) {
    const customerId = norm(row.customer_id);
    if (!customerId) continue;
    const productCode = normCode(row.product_code) || '__all__';
    overridesByCustomerProduct.set(`${customerId}::${productCode}`, row);
  }

  const assetTypePricingByProduct = new Map();
  for (const row of assetPricingRes.data || []) {
    const productCode = normCode(row.product_code);
    if (!productCode) continue;
    assetTypePricingByProduct.set(productCode, row);
  }

  const ctx = { customerPricingByCustomerId, overridesByCustomerProduct, assetTypePricingByProduct };
  rentalPricingCtxCache.set(organizationId, ctx);
  return ctx;
};

export const invalidateOrgRentalPricingCache = (organizationId) => {
  if (!organizationId) return;
  rentalPricingCtxCache.delete(organizationId);
};

export const monthlyRateForProductPlaceholder = (customerId, productCode, pricingCtx) => {
  const cid = norm(customerId);
  const code = normCode(productCode);
  if (!cid) return 0;

  const legacy = pricingCtx?.customerPricingByCustomerId?.get?.(cid);
  const legacyFixed = toNumberOrNull(legacy?.fixed_rate_override);
  if (legacyFixed != null) return legacyFixed;

  const legacyProduct = pickCustomerProductRateEntry(legacy, code);
  const legacyProductMonthly = toNumberOrNull(legacyProduct?.monthly ?? legacyProduct?.rate);
  if (legacyProductMonthly != null) return legacyProductMonthly;

  const specificOverride = pricingCtx?.overridesByCustomerProduct?.get?.(`${cid}::${code}`);
  const allProductsOverride = pricingCtx?.overridesByCustomerProduct?.get?.(`${cid}::__all__`);
  const override = specificOverride || allProductsOverride || null;

  const fixed = toNumberOrNull(override?.fixed_rate_override);
  if (fixed != null) return fixed;

  const customMonthly = toNumberOrNull(override?.custom_monthly_price);
  if (customMonthly != null) return customMonthly;

  const basePricing = pricingCtx?.assetTypePricingByProduct?.get?.(code);
  const baseMonthly = toNumberOrNull(basePricing?.monthly_price);
  if (baseMonthly != null) {
    const discount = Number(override?.discount_percent) || 0;
    if (discount > 0) {
      return Math.max(0, Math.round(baseMonthly * (1 - discount / 100) * 100) / 100);
    }
    return baseMonthly;
  }

  return 0;
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
