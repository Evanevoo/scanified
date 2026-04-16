import { getClassDefinition, getResolvedRatesWithDef } from './organizationRentalClassUtils';

/**
 * @param {Record<string, unknown>|null|undefined} overrides
 * @param {string} classId
 * @param {Array<Record<string, unknown>>} orgRows — from organization_rental_classes (may be empty)
 */
export function getResolvedClassRates(overrides, classId, orgRows = []) {
  const def = getClassDefinition(classId, orgRows);
  return getResolvedRatesWithDef(overrides, classId, def);
}
