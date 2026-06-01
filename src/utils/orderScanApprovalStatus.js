import logger from './logger';

export function normalizeOrderNumForLookup(num) {
  if (num == null || num === '') return '';
  const s = String(num).trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
  return s;
}

function parseImportData(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return typeof data === 'object' ? data : {};
}

export function extractOrderNumbersFromImportData(data) {
  const parsed = parseImportData(data);
  const out = new Set();
  const add = (v) => {
    const s = String(v ?? '').trim();
    if (s) out.add(s);
  };
  add(parsed.order_number);
  add(parsed.reference_number);
  add(parsed.invoice_number);
  add(parsed.summary?.reference_number);
  (parsed.verified_order_numbers || []).forEach(add);
  const rows = parsed.rows || parsed.line_items || [];
  rows.forEach((row) => {
    add(row.order_number);
    add(row.invoice_number);
    add(row.reference_number);
    add(row.sales_receipt_number);
  });
  return [...out];
}

const APPROVED_IMPORT_STATUSES = new Set(['approved', 'verified']);

/**
 * Map normalized order number → { status, isApproved, orderNumber }.
 * Orders with scans but no import row are treated as scanned_only / not approved.
 */
export async function fetchOrderApprovalStatusMap(supabase, organizationId, orderNumbersRaw) {
  const targetNorms = new Set();
  (orderNumbersRaw || []).forEach((raw) => {
    const on = String(raw ?? '').trim();
    if (!on || on.toLowerCase() === 'manual') return;
    targetNorms.add(normalizeOrderNumForLookup(on));
  });
  if (!targetNorms.size || !organizationId || !supabase) return new Map();

  const statusByOrder = new Map();

  const ingestImportRow = (row) => {
    const orders = extractOrderNumbersFromImportData(row.data);
    const rowStatus = String(row.status || 'pending').toLowerCase();
    const isApproved =
      APPROVED_IMPORT_STATUSES.has(rowStatus) || Boolean(row.approved_at || row.verified_at);
    orders.forEach((ord) => {
      const norm = normalizeOrderNumForLookup(ord);
      if (!targetNorms.has(norm)) return;
      const existing = statusByOrder.get(norm);
      if (!existing || (isApproved && !existing.isApproved)) {
        statusByOrder.set(norm, { status: rowStatus, isApproved, orderNumber: ord });
      }
    });
  };

  for (const table of ['imported_invoices', 'imported_sales_receipts']) {
    const { data, error } = await supabase
      .from(table)
      .select('id, status, approved_at, verified_at, data')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      logger.warn(`fetchOrderApprovalStatusMap (${table}):`, error.message);
      continue;
    }
    (data || []).forEach(ingestImportRow);
  }

  for (const norm of targetNorms) {
    if (!statusByOrder.has(norm)) {
      statusByOrder.set(norm, { status: 'scanned_only', isApproved: false, orderNumber: norm });
    }
  }

  return statusByOrder;
}

export function isManualUiScanOrder(orderNumber) {
  return String(orderNumber || '').trim().toLowerCase() === 'manual';
}

export function isOrderScanRecord(record) {
  const ht = record?.history_type;
  return ht === 'bottle_scan' || ht === 'cylinder_scan';
}

/** Scans on real orders before import approval must not read as completed delivery/return. */
export function isPendingOrderScanRecord(record) {
  if (!isOrderScanRecord(record)) return false;
  const on = String(record?.order_number || '').trim();
  if (!on || isManualUiScanOrder(on)) return false;
  return record.scan_assignment_effective !== true;
}

export function scanRecordModeFamily(record) {
  const mode = String(record?.mode || record?.action || '').trim().toUpperCase();
  if (mode === 'SHIP' || mode === 'DELIVERY' || mode === 'OUT') return 'SHIP';
  if (mode === 'RETURN' || mode === 'PICKUP' || mode === 'IN') return 'RETURN';
  return mode || 'OTHER';
}

/** Whether timeline replay should apply customer/status from this row. */
export function isScanEffectiveForAssignmentReplay(record) {
  if (record?.history_type === 'rental_start' || record?.history_type === 'rental_end') {
    return true;
  }
  if (record?.history_type === 'rental_rnb') return true;
  if (isManualUiScanOrder(record?.order_number)) return true;
  if (isOrderScanRecord(record)) return record.scan_assignment_effective === true;
  return true;
}
