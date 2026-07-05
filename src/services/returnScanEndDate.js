/**
 * Resolve rental_end_date from RETURN bottle_scans when available.
 */

import { barcodeVariants } from './closeOpenRentalsForBottle';

export function toYmd(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 10);
}

const RETURN_MODES = ['RETURN', 'PICKUP', 'IN'];

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {string} barcode
 * @param {{ orderNumber?: string|null, fallbackEndDate?: string|null }} options
 * @returns {Promise<string>} YYYY-MM-DD
 */
export async function resolveReturnEndDateForBarcode(
  supabase,
  organizationId,
  barcode,
  options = {},
) {
  const fallback = toYmd(options.fallbackEndDate) || new Date().toISOString().split('T')[0];
  if (!organizationId || !barcode) return fallback;

  const orderNumber = String(options.orderNumber || '').trim();

  for (const bc of barcodeVariants(barcode)) {
    let q = supabase
      .from('bottle_scans')
      .select('timestamp, created_at, mode')
      .eq('organization_id', organizationId)
      .eq('bottle_barcode', bc)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (orderNumber) {
      q = q.eq('order_number', orderNumber);
    }

    const { data, error } = await q;
    if (error || !data?.length) continue;

    const hit = data.find((row) =>
      RETURN_MODES.includes(String(row?.mode || '').trim().toUpperCase()),
    );
    const ts = hit?.timestamp || hit?.created_at;
    const ymd = toYmd(ts);
    if (ymd) return ymd;
  }

  return fallback;
}

/**
 * True when a RETURN/PICKUP/IN scan already exists for this barcode (optionally scoped to order_number).
 */
export async function hasExistingReturnScanForBarcode(
  supabase,
  organizationId,
  barcode,
  orderNumber,
) {
  if (!organizationId || !barcode) return false;
  const order = String(orderNumber || '').trim();

  for (const bc of barcodeVariants(barcode)) {
    let q = supabase
      .from('bottle_scans')
      .select('mode')
      .eq('organization_id', organizationId)
      .eq('bottle_barcode', bc)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (order) q = q.eq('order_number', order);

    const { data, error } = await q;
    if (error || !data?.length) continue;

    if (data.some((row) => RETURN_MODES.includes(String(row?.mode || '').trim().toUpperCase()))) {
      return true;
    }
  }
  return false;
}

/**
 * Batch lookup for orphan rental repair (one query per org, map by normalized barcode).
 * @returns {Promise<Map<string, string>>} normBarcode -> YYYY-MM-DD
 */
export async function fetchLatestReturnScanDatesByBarcode(supabase, organizationId, barcodes) {
  const out = new Map();
  if (!organizationId || !barcodes?.length) return out;

  const normSet = new Set();
  const lookupKeys = [];
  for (const raw of barcodes) {
    for (const v of barcodeVariants(raw)) {
      const n = v.replace(/^0+/, '') || '0';
      if (!normSet.has(n)) {
        normSet.add(n);
        lookupKeys.push(v);
      }
    }
  }
  if (!lookupKeys.length) return out;

  const { data, error } = await supabase
    .from('bottle_scans')
    .select('bottle_barcode, timestamp, created_at, mode')
    .eq('organization_id', organizationId)
    .in('bottle_barcode', lookupKeys.slice(0, 200))
    .order('timestamp', { ascending: false })
    .limit(2000);

  if (error || !data?.length) return out;

  for (const row of data) {
    const mode = String(row?.mode || '').trim().toUpperCase();
    if (!RETURN_MODES.includes(mode)) continue;
    const bc = String(row.bottle_barcode || '').trim();
    const n = bc.replace(/^0+/, '') || '0';
    if (out.has(n)) continue;
    const ymd = toYmd(row.timestamp || row.created_at);
    if (ymd) out.set(n, ymd);
  }

  return out;
}
