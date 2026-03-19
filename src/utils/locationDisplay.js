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
