/** QuickBooks / Zed Axis invoice export (Trackabout-compatible columns). */

import { getCustomerListId, getCustomerDisplayLabel } from './customerParentConstraint';

/**
 * Trackabout invoice import columns (Zed Axis). Order matters.
 * P.O. is appended at the end (Scanified extension; Trackabout base ends at Name).
 */
export const TRACKABOUT_QB_EXPORT_COLUMNS = [
  'Invoice#',
  'Customer Number',
  'Total',
  'Date',
  'TX',
  'TX code',
  'Due date',
  'Rate',
  'Name',
  'P.O.',
];

/** SK rental invoices always use SSK (GST+PST). Exempt / zero tax → E. */
export function resolveTaxCode(gstAmount, pstAmount) {
  const gst = Number(gstAmount) || 0;
  const pst = Number(pstAmount) || 0;
  if (gst > 0 || pst > 0) return 'SSK';
  return 'E';
}

/** Format dates like Trackabout / QB Desktop imports: M/D/YYYY */
export function formatTrackaboutQbDate(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  let year;
  let month;
  let day;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return s;
    year = dt.getFullYear();
    month = dt.getMonth() + 1;
    day = dt.getDate();
  }
  if (!year || !month || !day) return s;
  return `${month}/${day}/${year}`;
}

function invoiceNumberForRow(row) {
  return String(row?.invoice_number || row?.resolvedInvoiceNumber || '').trim();
}

/**
 * Build one Trackabout-shaped invoice row (SSK tax, columns in export order).
 * @param {object} params
 * @param {string} params.invoiceNumber
 * @param {string} params.customerNumber
 * @param {number} params.subtotal - pretax rate
 * @param {string} params.invoiceDate
 * @param {string} params.dueDate
 * @param {string} params.name
 * @param {string} [params.purchaseOrder]
 */
export function buildTrackaboutQbInvoiceRow({
  invoiceNumber,
  customerNumber,
  subtotal,
  invoiceDate,
  dueDate,
  name,
  purchaseOrder = '',
}) {
  const rate = +(Number(subtotal) || 0).toFixed(2);
  const gst = rate > 0 ? +(rate * 0.05).toFixed(2) : 0;
  const pst = rate > 0 ? +(rate * 0.06).toFixed(2) : 0;
  const tax = +(gst + pst).toFixed(2);
  const total = +(rate + tax).toFixed(2);
  return {
    'Invoice#': String(invoiceNumber || '').trim(),
    'Customer Number': String(customerNumber || '').trim(),
    Total: total,
    Date: formatTrackaboutQbDate(invoiceDate),
    TX: tax,
    'TX code': resolveTaxCode(gst, pst),
    'Due date': formatTrackaboutQbDate(dueDate),
    Rate: rate,
    Name: String(name || '').trim(),
    'P.O.': String(purchaseOrder || '').trim(),
  };
}

/**
 * @param {Array<object>} activeRows - Rows with `invoice_number` already set (see attachInvoiceNumbersToExportRows)
 * @param {object} [options]
 * @param {string} [options.filePrefix]
 * @param {string} [options.invoiceDate]
 * @param {string} [options.dueDate]
 * @param {() => { periodEnd: string, dueDate: string }} [options.getCurrentCycleRange]
 */
export function downloadQuickBooksInvoiceCsv(activeRows, options = {}) {
  const filePrefix = options.filePrefix || 'quickbooks_invoices';
  if (!activeRows || activeRows.length === 0) return 0;

  const missing = activeRows.filter((row) => !invoiceNumberForRow(row));
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} export row(s) missing invoice_number. Resolve numbers from Prep # / invoice_settings before exporting.`,
    );
  }

  const now = new Date();
  let invoiceDate = options.invoiceDate;
  let dueDate = options.dueDate;
  if (!invoiceDate || !dueDate) {
    const getCycle = options.getCurrentCycleRange;
    const c = typeof getCycle === 'function'
      ? getCycle()
      : { periodEnd: now.toISOString().slice(0, 10), dueDate: now.toISOString().slice(0, 10) };
    invoiceDate = invoiceDate || c.periodEnd;
    dueDate = dueDate || c.dueDate;
  }

  const rows = activeRows.map((row) =>
    buildTrackaboutQbInvoiceRow({
      invoiceNumber: invoiceNumberForRow(row),
      customerNumber: getCustomerListId(row.customer, row.customer_id) || row.customer_id || '',
      subtotal: parseFloat(row.totalPerCycle) || 0,
      invoiceDate,
      dueDate,
      name:
        getCustomerDisplayLabel(row.customer) ||
        row.customer?.name ||
        row.customer?.Name ||
        row.customer_id ||
        '',
      purchaseOrder: row.customer?.purchase_order || row.purchase_order || '',
    })
  );

  const header = TRACKABOUT_QB_EXPORT_COLUMNS.join(',');
  const csv = [
    header,
    ...rows.map((r) =>
      TRACKABOUT_QB_EXPORT_COLUMNS.map((col) => {
        const val = r[col];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filePrefix}_${invoiceDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
