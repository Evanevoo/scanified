import logger from './logger';

export function normalizeScanBarcode(v) {
  return v == null || v === '' ? '' : String(v).trim().replace(/^0+/, '') || String(v).trim();
}

export function expandBarcodeLookupVariants(barcodes) {
  const out = new Set();
  (barcodes || []).forEach((raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return;
    out.add(s);
    const stripped = s.replace(/^0+/, '') || s;
    out.add(stripped);
    if (/^\d+$/.test(stripped)) {
      for (const len of [8, 9, 10, 11, 12, 13]) {
        if (stripped.length <= len) out.add(stripped.padStart(len, '0'));
      }
    }
  });
  return Array.from(out);
}

export function getScanRowBarcode(s) {
  return (s?.bottle_barcode || s?.barcode_number || s?.cylinder_barcode)?.toString().trim() || '';
}

function scanMatchesBarcodeVariants(scan, variantNormSet) {
  const raw = getScanRowBarcode(scan);
  if (!raw) return false;
  const norm = normalizeScanBarcode(raw);
  return variantNormSet.has(raw) || variantNormSet.has(norm);
}

/**
 * Load bottle_scans for barcode(s) using per-column `.in()` queries (reliable vs one large `.or()`).
 * Merges org-scoped rows, legacy null-organization_id rows, and a recent-scan client filter fallback.
 */
export async function fetchBottleScansByBarcodes(
  supabaseClient,
  organizationId,
  barcodeArray,
  { limit = 200, broadFallbackLimit = 500 } = {}
) {
  if (!barcodeArray?.length || !supabaseClient) return [];

  const variants = expandBarcodeLookupVariants(barcodeArray);
  if (!variants.length) return [];

  const variantNormSet = new Set(variants.flatMap((v) => [v, normalizeScanBarcode(v)]));
  const merged = new Map();
  const addRows = (rows) => {
    (rows || []).forEach((row) => {
      const key = `${row.id || ''}\t${row.created_at || row.timestamp || ''}\t${getScanRowBarcode(row)}\t${row.mode || ''}\t${row.order_number || ''}`;
      if (!merged.has(key)) merged.set(key, row);
    });
  };

  const select =
    'id, bottle_barcode, barcode_number, cylinder_barcode, mode, action, scan_type, created_at, timestamp, customer_name, customer_id, location, order_number, organization_id, user_id, notes';

  const runQuery = async (col, orgMode) => {
    let query = supabaseClient.from('bottle_scans').select(select).in(col, variants).limit(limit);
    if (orgMode === 'org' && organizationId) {
      query = query.eq('organization_id', organizationId);
    } else if (orgMode === 'null') {
      query = query.is('organization_id', null);
    }
    const { data, error } = await query;
    if (error) {
      logger.warn(`fetchBottleScansByBarcodes (${col}, ${orgMode}):`, error.message);
      return;
    }
    addRows(data);
  };

  for (const col of ['bottle_barcode', 'barcode_number', 'cylinder_barcode']) {
    if (organizationId) {
      await runQuery(col, 'org');
      await runQuery(col, 'null');
    } else {
      await runQuery(col, 'any');
    }
  }

  if (organizationId) {
    const { data, error } = await supabaseClient
      .from('bottle_scans')
      .select(select)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(Math.max(limit, broadFallbackLimit));
    if (error) {
      logger.warn('fetchBottleScansByBarcodes broad fallback:', error.message);
    } else {
      addRows((data || []).filter((row) => scanMatchesBarcodeVariants(row, variantNormSet)));
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
  );
}
