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
  add(parsed.sales_order_number);
  add(parsed.SalesOrderNumber);
  add(parsed.po_number);
  add(parsed.PO);
  add(parsed.trk_number);
  add(parsed.summary?.reference_number);
  add(parsed.summary?.order_number);
  (parsed.verified_order_numbers || []).forEach(add);
  const rows = parsed.rows || parsed.line_items || [];
  rows.forEach((row) => {
    add(row.order_number);
    add(row.invoice_number);
    add(row.reference_number);
    add(row.sales_receipt_number);
    add(row.sales_order_number);
    add(row.SalesOrderNumber);
    add(row.po_number);
    add(row.PO);
  });
  return [...out];
}

/** RETURN scan can show as completed when inventory already cleared the customer assignment. */
export function bottleReflectsCompletedReturn(asset) {
  if (!asset || typeof asset !== 'object') return false;
  const st = String(asset.status || '').toLowerCase();
  if (st === 'empty' || st === 'available' || st === 'in house') return true;
  const assigned = String(asset.assigned_customer || asset.customer_uuid || '').trim();
  const name = String(asset.customer_name || '').trim();
  return !assigned && !name;
}

const APPROVED_IMPORT_STATUSES = new Set(['approved', 'verified']);

export function isImportRowFileLevelApproved(imp) {
  const status = String(imp?.status || '').toLowerCase();
  return (
    APPROVED_IMPORT_STATUSES.has(status) ||
    Boolean(imp?.auto_approved || imp?.approved_at || imp?.verified_at)
  );
}

/** True when import JSON tracks per-order verify (even if the array is empty after unverify). */
export function importUsesPerOrderVerifiedList(data) {
  const parsed = parseImportData(data);
  return Object.prototype.hasOwnProperty.call(parsed, 'verified_order_numbers');
}

/** Import row reopened for Order Verification (unverify) — ignore stale approved timestamps. */
export function isRecordReopenForVerification(record) {
  const status = String(record?.status || '').toLowerCase();
  return (
    status === 'pending' ||
    status === 'processing' ||
    record?._reopenedAfterUnverify === true
  );
}

/**
 * Order numbers still verified on approved import files.
 * Per-order files: only norms in verified_order_numbers (empty array = none left verified).
 * Legacy whole-file approval (no verified_order_numbers key): all line order refs stay verified.
 */
export function collectStillVerifiedOrderNormsOnApprovedImports(
  approvedImports,
  normalize = normalizeOrderNumForLookup,
) {
  const norms = new Set();
  for (const imp of approvedImports || []) {
    if (!isImportRowFileLevelApproved(imp)) continue;
    const data = parseImportData(imp.data);
    if (importUsesPerOrderVerifiedList(data)) {
      const vor = Array.isArray(data.verified_order_numbers) ? data.verified_order_numbers : [];
      for (const n of vor) {
        const norm = normalize(String(n ?? '').trim());
        if (norm) norms.add(norm);
      }
      continue;
    }
    for (const raw of extractOrderNumbersFromImportData(data)) {
      const norm = normalize(String(raw ?? '').trim());
      if (norm) norms.add(norm);
    }
  }
  return norms;
}

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

  const unresolved = [...targetNorms].filter((norm) => !statusByOrder.get(norm)?.isApproved);
  if (unresolved.length > 0) {
    for (const table of ['imported_invoices', 'imported_sales_receipts']) {
      const { data, error } = await supabase
        .from(table)
        .select('id, status, approved_at, verified_at, data')
        .eq('organization_id', organizationId)
        .in('status', ['approved', 'verified'])
        .order('approved_at', { ascending: false })
        .limit(1000);
      if (error) {
        logger.warn(`fetchOrderApprovalStatusMap approved pass (${table}):`, error.message);
        continue;
      }
      (data || []).forEach(ingestImportRow);
    }
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
  if (isOrderScanRecord(record)) {
    // RETURN scans clear inventory immediately at scan time (mobile + repair paths).
    if (scanRecordModeFamily(record) === 'RETURN') return true;
    return record.scan_assignment_effective === true;
  }
  return true;
}
