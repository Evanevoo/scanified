/**
 * Build per-order rows for Verified Orders from imported_invoices / imported_sales_receipts.
 * Approved import files are often one DB row per file; orders inside verified_order_numbers
 * must become separate Invoice/Receipt list rows (otherwise only bottle_scans show as "Scanned Order").
 */

export function parseImportDataField(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data || {};
}

export function orderNormsFromImportData(data, normalizeOrderNum) {
  const norms = new Set();
  const add = (raw) => {
    const n = normalizeOrderNum(String(raw ?? '').trim());
    if (n) norms.add(n);
  };
  const vor = Array.isArray(data?.verified_order_numbers) ? data.verified_order_numbers : [];
  for (const vo of vor) add(vo);
  const rows = data?.rows || data?.line_items || [];
  for (const row of rows) {
    add(
      row.reference_number ||
        row.order_number ||
        row.invoice_number ||
        row.sales_receipt_number,
    );
  }
  add(data?.order_number || data?.reference_number || data?.invoice_number);
  add(data?.summary?.reference_number);
  return norms;
}

function rowSliceForOrderNorm(rows, voNorm, normalizeOrderNum) {
  const matchingRows = (rows || []).filter((r) => {
    const ref =
      r.reference_number || r.order_number || r.invoice_number || r.sales_receipt_number;
    return ref && normalizeOrderNum(String(ref).trim()) === voNorm;
  });
  return matchingRows;
}

function displayLabelForImportType(tableType) {
  return tableType === 'invoice' ? 'Invoice' : 'Receipt';
}

/**
 * @param {object} rec — imported_invoices / imported_sales_receipts row
 * @param {'invoice'|'receipt'} tableType
 * @param {(num: string) => string} normalizeOrderNum
 * @returns {object[]} one list entry per order number on the import
 */
export function expandImportRecordsToOrderRows(rec, tableType, normalizeOrderNum) {
  if (!rec) return [];
  const data = parseImportDataField(rec.data);
  const norms = orderNormsFromImportData(data, normalizeOrderNum);
  if (norms.size === 0) {
    return [mapMonolithicImportListRow(rec, tableType, data)];
  }

  const rows = data.rows || data.line_items || [];
  const topCust = String(data.customer_name || data.CustomerName || data.Customer || '').trim();
  const topId = String(data.customer_id || data.CustomerListID || data.CustomerId || '').trim();
  const vor = Array.isArray(data.verified_order_numbers) ? data.verified_order_numbers : [];
  const fallbackTs =
    rec.approved_at || rec.verified_at || rec.created_at || new Date().toISOString();

  const out = [];
  for (const voNorm of norms) {
    const orderStrFromVor = vor.find((vo) => normalizeOrderNum(String(vo ?? '').trim()) === voNorm);
    const orderStr = orderStrFromVor != null ? String(orderStrFromVor).trim() : voNorm;
    const matchingRows = rowSliceForOrderNorm(rows, voNorm, normalizeOrderNum);
    const first = matchingRows[0] || rows[0];
    const custName = first
      ? String(
          first.customer_name ||
            first.customerName ||
            first.Customer ||
            first.CustomerName ||
            '',
        ).trim()
      : topCust;
    const custId = first
      ? String(
          first.customer_id || first.CustomerListID || first.CustomerId || '',
        ).trim()
      : topId;
    const rowSlice =
      matchingRows.length > 0
        ? matchingRows
        : [
            {
              order_number: orderStr,
              reference_number: orderStr,
              customer_name: custName || topCust,
              customer_id: custId || topId,
              CustomerListID: custId || topId,
            },
          ];

    out.push({
      ...rec,
      _listKey: `${rec.id}\t${voNorm}\t${tableType}`,
      id: rec.id,
      type: tableType,
      displayType: displayLabelForImportType(tableType),
      order_number: orderStr,
      status: rec.status === 'approved' ? 'approved' : 'verified',
      approved_at: rec.approved_at || rec.verified_at || fallbackTs,
      verified_at: rec.verified_at || rec.approved_at || fallbackTs,
      created_at: rec.created_at,
      data_parsed: {
        ...data,
        order_number: orderStr,
        reference_number: orderStr,
        customer_name: custName || topCust,
        customer_id: custId || topId,
        CustomerListID: custId || topId,
        rows: rowSlice,
      },
      _expandedFromImportFile: true,
      _partialVerifiedOnPendingFile: rec.status === 'pending' || rec.status === 'processing',
    });
  }
  return out;
}

export function mapMonolithicImportListRow(rec, tableType, data) {
  const parsed = data || parseImportDataField(rec.data);
  return {
    ...rec,
    type: tableType,
    displayType: displayLabelForImportType(tableType),
    order_number:
      parsed.order_number ||
      parsed.reference_number ||
      parsed.invoice_number ||
      parsed.rows?.[0]?.order_number,
    data_parsed: parsed,
  };
}

/**
 * @param {object[]} recordSets — { records, tableType }[]
 */
export function flattenImportRecordsToOrderRows(recordSets, normalizeOrderNum) {
  const out = [];
  for (const { records, tableType } of recordSets) {
    for (const rec of records || []) {
      out.push(...expandImportRecordsToOrderRows(rec, tableType, normalizeOrderNum));
    }
  }
  return out;
}

/** Collect normalized order numbers listed in import data (for scanned-order inclusion). */
export function collectVerifiedOrderNumbersFromImports(recordsList, normalizeOrderNum) {
  const verifiedOrderNums = new Set();
  for (const records of recordsList) {
    for (const rec of records || []) {
      const data = parseImportDataField(rec.data);
      const vor = Array.isArray(data?.verified_order_numbers) ? data.verified_order_numbers : [];
      for (const n of vor) {
        const norm = normalizeOrderNum(String(n ?? '').trim());
        if (norm) verifiedOrderNums.add(norm);
      }
      for (const norm of orderNormsFromImportData(data, normalizeOrderNum)) {
        verifiedOrderNums.add(norm);
      }
    }
  }
  return verifiedOrderNums;
}
