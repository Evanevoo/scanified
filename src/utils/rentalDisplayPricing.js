/**
 * Re-exports canonical pricing resolution (single source of truth in services/pricingResolution.js).
 */
export {
  normalizePricingKey,
  buildAssetPricingMap,
  flattenCustomerPricingRowsToLegacyOverrides,
  buildCustomerOverrideMap,
  findBestOverride,
  collectNormalizedCustomerKeysForPricingRow,
  findBestSpecificOverrideMultiKey,
  findAllProductsOverrideMultiKey,
  resolveEffectiveUnitPrice,
  resolveDisplayUnitFromMaps,
  resolveMonthlyDisplayUnit,
  defaultUnitRatesFromAssetPricingTable,
  computeSubscriptionCycleTotal,
  computeSubscriptionBillingCycleTotal,
  computeMRRWithResolution,
  pickMonthlyFromLegacyRentalRatesJson,
} from '../services/pricingResolution';
