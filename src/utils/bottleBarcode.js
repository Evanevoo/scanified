/**
 * Bottle barcode normalization and duplicate detection (per organization).
 */

export function normalizeBottleBarcode(value) {
  if (value === undefined || value === null) return '';
  let normalized = String(value).trim();
  normalized = normalized.replace(/\.0+$/, '');
  return normalized;
}

export function stripLeadingZeros(value) {
  const normalized = normalizeBottleBarcode(value);
  if (!normalized) return '';
  const stripped = normalized.replace(/^0+/, '');
  return stripped || '0';
}

export function barcodesMatch(left, right) {
  const leftNorm = normalizeBottleBarcode(left);
  const rightNorm = normalizeBottleBarcode(right);
  if (!leftNorm || !rightNorm) return false;
  if (leftNorm === rightNorm) return true;
  return stripLeadingZeros(leftNorm) === stripLeadingZeros(rightNorm);
}

/** Distinct strings to query when checking if a barcode already exists. */
export function barcodeLookupVariants(value) {
  const norm = normalizeBottleBarcode(value);
  if (!norm) return [];
  const stripped = stripLeadingZeros(norm);
  return [...new Set([norm, stripped].filter(Boolean))];
}

export function isDuplicateBarcodeDbError(error) {
  if (!error) return false;
  if (String(error.code || '') === '23505') return true;
  const msg = String(error.message || error.details || '').toLowerCase();
  return msg.includes('duplicate') && msg.includes('barcode');
}

export function duplicateBarcodeMessage(barcode) {
  const b = normalizeBottleBarcode(barcode);
  return b
    ? `Barcode "${b}" is already registered in your organization. Each bottle must have a unique barcode.`
    : 'This barcode is already registered in your organization.';
}

/**
 * Find first bottle row whose barcode_number matches (including leading-zero variants).
 */
export function findBottleByBarcode(bottles, barcode) {
  if (!Array.isArray(bottles) || !barcode) return null;
  return bottles.find((b) => barcodesMatch(b?.barcode_number, barcode)) || null;
}

/**
 * Collapse search/list results to one row per normalized barcode (keeps first / newest caller order).
 */
export function dedupeBottlesByBarcode(bottles, { keep = 'first' } = {}) {
  if (!Array.isArray(bottles)) return [];
  const byKey = new Map();
  for (const bottle of bottles) {
    const key = stripLeadingZeros(normalizeBottleBarcode(bottle?.barcode_number));
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, bottle);
      continue;
    }
    if (keep === 'last') byKey.set(key, bottle);
  }
  return [...byKey.values()];
}

/** One search hit per bottle barcode (serials only used when barcode is empty). */
export function bottleSearchIdentity(bottle) {
  const barcodeKey = stripLeadingZeros(normalizeBottleBarcode(bottle?.barcode_number));
  if (barcodeKey) return barcodeKey;
  return stripLeadingZeros(normalizeBottleBarcode(bottle?.serial_number));
}

export function dedupeBottlesForSearch(bottles) {
  if (!Array.isArray(bottles)) return [];
  const byKey = new Map();
  for (const bottle of bottles) {
    const key = bottleSearchIdentity(bottle);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, bottle);
  }
  return [...byKey.values()];
}
