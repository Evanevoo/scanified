/**
 * Normalize location strings for case-insensitive comparison (filters, grouping).
 */
export function normalizeLocationKey(location) {
  return String(location ?? '').trim().toLowerCase();
}

/**
 * Display warehouse / branch / city-style locations with consistent casing
 * (e.g. SASKATOON, saskatoon → Saskatoon).
 */
export function formatLocationDisplay(location) {
  if (location == null || location === undefined) return '';
  const s = String(location).trim();
  if (!s) return '';
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Map a customer to a `bottles.location` value: prefer an org `locations` row
 * (same UPPERCASE convention as the Asset Location dropdown), else city/location uppercased.
 */
export function bottleLocationValueForCustomer(customer, orgLocations) {
  if (!customer) return null;
  const raw = String(customer.location || customer.city || '').trim();
  if (!raw) return null;
  const norm = normalizeLocationKey(raw);
  const match = (orgLocations || []).find((l) => normalizeLocationKey(l.name) === norm);
  if (match) return String(match.name).trim().toUpperCase();
  return raw.toUpperCase();
}
