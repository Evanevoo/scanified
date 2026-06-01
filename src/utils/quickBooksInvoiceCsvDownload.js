/** QuickBooks-style invoice CSV download. Invoice numbers must be pre-resolved (DB / invoice_settings). */

import { getCustomerListId, getCustomerDisplayLabel } from './customerParentConstraint';

export function resolveTaxCode(gstAmount, pstAmount) {
  const gst = Number(gstAmount) || 0;
  const pst = Number(pstAmount) || 0;
  if (gst > 0 && pst > 0) return 'SSK';
  if (gst > 0) return 'GST';
  if (pst > 0) return 'PST';
  return 'E';
}

function invoiceNumberForRow(row) {
  return String(row?.invoice_number || row?.resolvedInvoiceNumber || '').trim();
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

  const rows = activeRows.map((row) => {
    const subtotal = parseFloat(row.totalPerCycle) || 0;
    const gst = +(subtotal * 0.05).toFixed(2);
    const pst = +(subtotal * 0.06).toFixed(2);
    const tax = +(gst + pst).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const txCode = resolveTaxCode(gst, pst);
    return {
      'Invoice#': invoiceNumberForRow(row),
      'Customer Number': getCustomerListId(row.customer, row.customer_id) || row.customer_id || '',
      Total: total,
      Date: invoiceDate,
      GST: gst,
      PST: pst,
      TX: tax,
      'TX code': txCode,
      'Due date': dueDate,
      Rate: subtotal,
      Name:
        getCustomerDisplayLabel(row.customer) ||
        row.customer?.name ||
        row.customer?.Name ||
        row.customer_id ||
        '',
      '# of Bottles': parseFloat(row.itemCount) || 0,
    };
  });

  const header = Object.keys(rows[0]).join(',');
  const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filePrefix}_${invoiceDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
