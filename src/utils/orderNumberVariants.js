/**
 * Build order_number values used when querying bottle_scans so list approval,
 * verify, and detail views all see the same scans (including row-level reference numbers).
 */

const trimOrderNum = (num) => (num == null || num === '' ? '' : String(num).trim());

const rowOrderFields = (row) =>
  row?.order_number ||
  row?.invoice_number ||
  row?.reference_number ||
  row?.sales_receipt_number;

/**
 * @param {string|number|null|undefined} primaryOrder
 * @param {{ recordData?: object, recordRows?: object[], extraOrders?: (string|number)[] }} [options]
 * @returns {string[]}
 */
export function buildOrderNumberVariants(primaryOrder, options = {}) {
  const { recordData = null, recordRows = null, extraOrders = [] } = options;
  const base = new Set();

  const add = (n) => {
    const t = trimOrderNum(n);
    if (t && t.toUpperCase() !== 'N/A') base.add(t);
  };

  add(primaryOrder);
  (extraOrders || []).forEach(add);

  if (recordData) {
    add(recordData.order_number);
    add(recordData.reference_number);
    add(recordData.invoice_number);
    add(recordData.sales_receipt_number);
    add(recordData.summary?.reference_number);
    (recordData.rows || recordData.line_items || []).forEach((row) => add(rowOrderFields(row)));
  }

  (recordRows || []).forEach((row) => add(rowOrderFields(row)));

  const expanded = new Set();
  for (const v of base) {
    expanded.add(v);
    if (/^\d+$/.test(v)) {
      const normalized = v.replace(/^0+/, '') || '0';
      if (normalized !== v) expanded.add(normalized);
      const padded = v.padStart(6, '0');
      if (padded !== v) expanded.add(padded);
      const asNum = parseInt(v, 10);
      if (!Number.isNaN(asNum)) expanded.add(String(asNum));
    }
    const numericOnly = v.replace(/^(\d+).*$/i, '$1').trim();
    if (numericOnly && numericOnly !== v) expanded.add(numericOnly);
  }

  return [...expanded].filter(Boolean);
}

export function normalizeOrderNumber(num) {
  if (num == null || num === '') return '';
  const s = String(num).trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
  return s;
}
