/**
 * Narrow monthly export rows to customers visible in the Rentals search filter.
 * Shared by bulk email and PDF ZIP (CSV uses terms/month only).
 */
export function filterMonthlyExportRowsBySearch(rows, filtered, normalize, normalizeName) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Array.isArray(filtered) || filtered.length === 0) return [];

  const allowedCustKeys = new Set();
  for (const r of filtered) {
    [r.customer_id, r.customer?.id, r.customer?.CustomerListID]
      .map(normalize)
      .filter(Boolean)
      .forEach((k) => allowedCustKeys.add(k));
    const n = normalizeName(r.customer?.name || r.customer?.Name);
    if (n) allowedCustKeys.add(n);
  }

  return rows.filter((r) => {
    const keys = [r.customer_id, r.customer?.id, r.customer?.CustomerListID]
      .map(normalize)
      .filter(Boolean);
    if (keys.some((k) => allowedCustKeys.has(k))) return true;
    const n = normalizeName(r.customer?.name || r.customer?.Name);
    return n && allowedCustKeys.has(n);
  });
}

/**
 * @param {string} searchQuery - debounced search text; empty = no narrowing
 */
export function applySearchToMonthlyExportRows(rows, filtered, searchQuery, normalize, normalizeName) {
  const q = String(searchQuery || '').trim();
  if (!q) return rows || [];
  return filterMonthlyExportRowsBySearch(rows, filtered, normalize, normalizeName);
}
