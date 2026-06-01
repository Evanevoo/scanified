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

export function scanMatchesBarcodeVariants(scan, variantNormSet) {
  const raw = getScanRowBarcode(scan);
  if (!raw) return false;
  const norm = normalizeScanBarcode(raw);
  return variantNormSet.has(raw) || variantNormSet.has(norm);
}

const PAGE_SIZE = 1000;
const IN_CHUNK_SIZE = 80;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchPaginatedRows(queryFactory) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.warn('fetchBottleScansByBarcodes pagination:', error.message);
      break;
    }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Load bottle_scans (and legacy scans) for barcode(s).
 * Uses per-column `.in()` queries plus a full org scan pass (same strategy as Scanned Orders).
 */
export async function fetchBottleScansByBarcodes(
  supabaseClient,
  organizationId,
  barcodeArray,
  { limit = 500 } = {}
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

  const perQueryLimit = Math.max(50, Math.min(limit, 1000));

  const runInQuery = async (table, col, orgMode) => {
    for (const variantChunk of chunkArray(variants, IN_CHUNK_SIZE)) {
      let query = supabaseClient.from(table).select('*').in(col, variantChunk).limit(perQueryLimit);
      if (orgMode === 'org' && organizationId) {
        query = query.eq('organization_id', organizationId);
      } else if (orgMode === 'null') {
        query = query.is('organization_id', null);
      }
      const { data, error } = await query;
      if (error) {
        logger.warn(`fetchBottleScansByBarcodes (${table}.${col}, ${orgMode}):`, error.message);
        continue;
      }
      addRows(data);
    }
  };

  for (const col of ['bottle_barcode', 'barcode_number', 'cylinder_barcode']) {
    if (organizationId) {
      await runInQuery('bottle_scans', col, 'org');
      await runInQuery('bottle_scans', col, 'null');
    } else {
      await runInQuery('bottle_scans', col, 'any');
    }
  }

  if (organizationId) {
    const orgBottleScans = await fetchPaginatedRows((from, to) =>
      supabaseClient
        .from('bottle_scans')
        .select('*')
        .eq('organization_id', organizationId)
        .not('order_number', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
    addRows(orgBottleScans.filter((row) => scanMatchesBarcodeVariants(row, variantNormSet)));

    const legacyScans = await fetchPaginatedRows((from, to) =>
      supabaseClient
        .from('scans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
    addRows(legacyScans.filter((row) => scanMatchesBarcodeVariants(row, variantNormSet)));
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
  );
}
