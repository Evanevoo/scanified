/** QuickBooks-style invoice CSV download (W-numbers, sessionStorage map). Shared by Rentals + Lease Agreements. */

export const QB_CSV_LAST_INV_MAP_KEY = 'qb_csv_last_invoice_map';

export function resolveTaxCode(gstAmount, pstAmount) {
  const gst = Number(gstAmount) || 0;
  const pst = Number(pstAmount) || 0;
  if (gst > 0 && pst > 0) return 'SSK';
  if (gst > 0) return 'GST';
  if (pst > 0) return 'PST';
  return 'E';
}

function qbCsvInvoiceStorageKey(row) {
  if (row?.id != null && String(row.id).trim() !== '') return `id:${String(row.id)}`;
  return `cust:${String(row?.customer_id || '').trim()}|${String(row?.billing_period || 'monthly').toLowerCase()}`;
}

export function qbCsvInvoiceStorageKeys(row) {
  const keys = [];
  const id = String(row?.id || '').trim();
  const customerId = String(row?.customer_id || '').trim();
  const customerName = String(row?.customer?.name || row?.customer?.Name || row?.customer_name || '').trim().toLowerCase();
  const billingPeriod = String(row?.billing_period || 'monthly').toLowerCase();
  if (id) keys.push(`id:${id}`);
  if (customerId) keys.push(`cust:${customerId}|${billingPeriod}`);
  if (customerName) keys.push(`name:${customerName}|${billingPeriod}`);
  if (keys.length === 0) keys.push(qbCsvInvoiceStorageKey(row));
  return [...new Set(keys)];
}

/**
 * @param {Array<object>} activeRows - Subscription-style or lease export rows
 * @param {object} [options]
 * @param {string} [options.filePrefix]
 * @param {string} [options.sequenceMonth]
 * @param {string} [options.invoiceDate]
 * @param {string} [options.dueDate]
 * @param {() => { periodEnd: string, dueDate: string }} [options.getCurrentCycleRange]
 */
export function downloadQuickBooksInvoiceCsv(activeRows, options = {}) {
  const filePrefix = options.filePrefix || 'quickbooks_invoices';
  if (!activeRows || activeRows.length === 0) return 0;
  const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
  const now = new Date();
  const calendarYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seqMonth = options.sequenceMonth || calendarYm;
  const lastNumber = Number(state?.lastNumber);
  const hasLastNumber = Number.isFinite(lastNumber);
  const startNumber = hasLastNumber ? (lastNumber + 1) : 10000;

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

  let existingMap = {};
  try {
    const raw = sessionStorage.getItem(QB_CSV_LAST_INV_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.seqMonth === seqMonth && parsed?.byRowKey && typeof parsed?.byRowKey === 'object') {
        existingMap = parsed.byRowKey;
      }
    }
  } catch {
    existingMap = {};
  }

  const parseInvoiceNo = (v) => {
    const m = String(v || '').trim().match(/^W(\d{1,})$/i);
    return m ? parseInt(m[1], 10) : null;
  };

  const usedNumbers = new Set(
    Object.values(existingMap)
      .map(parseInvoiceNo)
      .filter((n) => Number.isFinite(n)),
  );
  const assignedInvoiceByIdx = new Map();
  let nextNumber = startNumber;
  activeRows.forEach((row, idx) => {
    let existingInvoice = null;
    for (const k of qbCsvInvoiceStorageKeys(row)) {
      const candidate = existingMap[k];
      if (candidate) {
        existingInvoice = String(candidate).trim();
        break;
      }
    }
    if (existingInvoice) {
      assignedInvoiceByIdx.set(idx, existingInvoice);
      const parsedNum = parseInvoiceNo(existingInvoice);
      if (Number.isFinite(parsedNum)) usedNumbers.add(parsedNum);
      return;
    }
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const generated = `W${String(nextNumber).padStart(5, '0')}`;
    assignedInvoiceByIdx.set(idx, generated);
    usedNumbers.add(nextNumber);
    nextNumber += 1;
  });

  const rows = activeRows.map((row, idx) => {
    const subtotal = parseFloat(row.totalPerCycle) || 0;
    const gst = +(subtotal * 0.05).toFixed(2);
    const pst = +(subtotal * 0.06).toFixed(2);
    const tax = +(gst + pst).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const txCode = resolveTaxCode(gst, pst);
    return {
      'Invoice#': assignedInvoiceByIdx.get(idx) || `W${String(startNumber + idx).padStart(5, '0')}`,
      'Customer Number': row.customer_id || '',
      Total: total,
      Date: invoiceDate,
      GST: gst,
      PST: pst,
      TX: tax,
      'TX code': txCode,
      'Due date': dueDate,
      Rate: subtotal,
      Name: row.customer?.name || row.customer?.Name || row.customer_id || '',
      '# of Bottles': parseFloat(row.itemCount) || 0,
    };
  });

  try {
    const byRowKey = { ...existingMap };
    activeRows.forEach((row, idx) => {
      const invoiceNo = assignedInvoiceByIdx.get(idx) || `W${String(startNumber + idx).padStart(5, '0')}`;
      qbCsvInvoiceStorageKeys(row).forEach((key) => {
        byRowKey[key] = invoiceNo;
      });
    });
    sessionStorage.setItem(
      QB_CSV_LAST_INV_MAP_KEY,
      JSON.stringify({ seqMonth, byRowKey, savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }

  const assignedNumbers = rows
    .map((r) => parseInvoiceNo(r['Invoice#']))
    .filter((n) => Number.isFinite(n));
  const maxAssigned = assignedNumbers.length > 0 ? Math.max(...assignedNumbers) : (hasLastNumber ? lastNumber : 10000);

  localStorage.setItem('invoice_state', JSON.stringify({
    lastNumber: maxAssigned,
    lastMonth: seqMonth,
  }));

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
