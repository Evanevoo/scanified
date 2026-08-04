import logger from './logger';

/**
 * Resolve a scanned / import identifier to a `bottles` row.
 * Tries `barcode_number`, leading-zero-stripped variant, then `serial_number`.
 */
export async function findBottleRowByScanIdentifier(supabase, organizationId, rawIdentifier) {
  const id = String(rawIdentifier ?? '').trim();
  if (!id || !organizationId) return null;

  // Requests up to 2 rows (not just 1) so a duplicate barcode/serial in the org
  // can be detected and flagged instead of silently assigning whichever row
  // Postgres happens to return first. Ordered by updated_at so the choice is
  // at least deterministic (most recently touched bottle) rather than arbitrary.
  const warnIfAmbiguous = (rows, matchField, matchValue) => {
    if (rows && rows.length > 1) {
      logger.warn(
        `findBottleRowByScanIdentifier: ambiguous match -- ${rows.length} bottles share ${matchField}="${matchValue}" in org ${organizationId} (ids: ${rows.map((r) => r.id).join(', ')}). Using the most recently updated one; the underlying duplicate should be investigated/merged.`
      );
    }
  };

  const fetchByBarcode = async (bn) => {
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('barcode_number', bn)
      .order('updated_at', { ascending: false })
      .limit(2);
    if (error) logger.warn('findBottleRowByScanIdentifier barcode:', error.message);
    warnIfAmbiguous(data, 'barcode_number', bn);
    return data?.[0] || null;
  };

  const byBarcode = await fetchByBarcode(id);
  if (byBarcode) return byBarcode;

  const stripped = id.replace(/^0+/, '') || id;
  if (stripped !== id) {
    const byStripped = await fetchByBarcode(stripped);
    if (byStripped) return byStripped;
  }

  const { data: serialRows, error: se } = await supabase
    .from('bottles')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('serial_number', id)
    .order('updated_at', { ascending: false })
    .limit(2);
  if (se) logger.warn('findBottleRowByScanIdentifier serial:', se.message);
  warnIfAmbiguous(serialRows, 'serial_number', id);
  if (serialRows?.[0]) return serialRows[0];

  return null;
}

/**
 * Resolve multiple scan identifiers to bottle rows (barcode, stripped barcode, serial).
 */
export async function resolveBottleRowsForScanBarcodes(supabase, organizationId, identifiers) {
  const list = [...new Set((identifiers || []).map((x) => String(x ?? '').trim()).filter(Boolean))];
  const rows = [];
  const seen = new Set();
  for (const id of list) {
    const row = await findBottleRowByScanIdentifier(supabase, organizationId, id);
    if (!row) continue;
    const key = String(row.barcode_number || row.serial_number || id).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

/**
 * Map scan identifiers to canonical `barcode_number` values when a bottle row exists.
 */
export async function canonicalBarcodesForScanIdentifiers(supabase, organizationId, identifiers) {
  const list = [...new Set((identifiers || []).map((x) => String(x ?? '').trim()).filter(Boolean))];
  const canon = [];
  const seen = new Set();
  for (const id of list) {
    const row = await findBottleRowByScanIdentifier(supabase, organizationId, id);
    const bc = String(row?.barcode_number || '').trim();
    if (!bc || seen.has(bc)) continue;
    seen.add(bc);
    canon.push(bc);
  }
  return canon;
}
