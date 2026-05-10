const IMPORTED_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PK for imported_invoices / imported_sales_receipts / RPCs:
 * never reduce UUIDs with parseInt(String.match(/\d+/)) — that corrupts IDs.
 * Numeric-only strings become integers when safe (legacy int/bigint PKs).
 *
 * @param {unknown} raw
 * @returns {string|number|unknown}
 */
export function coerceImportedRowPkForRpc(raw) {
  if (raw == null || raw === '') return raw;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : raw;
  const s = String(raw).trim();
  if (!s) return raw;
  if (IMPORTED_ROW_UUID_RE.test(s)) return s;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isSafeInteger(n) ? n : s;
  }
  return raw;
}

/** Whether the value can be used as an imported row primary key in Supabase filters. */
export function isValidImportedRowPk(recordId) {
  if (recordId == null || recordId === '') return false;
  if (typeof recordId === 'number') return Number.isFinite(recordId);
  const s = String(recordId).trim();
  if (!s) return false;
  if (IMPORTED_ROW_UUID_RE.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  return false;
}
