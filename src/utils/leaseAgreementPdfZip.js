import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRentalInvoicePdfDoc, defaultInvoiceNumber } from './rentalInvoicePdf';
import { formatCurrency as formatMoney } from './subscriptionUtils';
import { getNextInvoiceNumbers } from './invoiceUtils';

function defaultCycleRange() {
  const now = new Date();
  const periodEnd = now.toISOString().slice(0, 10);
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dueD = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const dueDate = dueD.toISOString().slice(0, 10);
  return { periodStart, periodEnd, dueDate };
}

/**
 * ZIP of yearly lease invoice PDFs (one PDF per export row).
 */
export async function downloadLeaseAgreementPdfZip({
  rows,
  organization,
  invoiceTemplate = {},
  primaryColorFallback = '#40B5AD',
}) {
  const leaseRows = (rows || []).filter(
    (r) => (parseFloat(r.totalPerCycle) || 0) > 0 && (parseFloat(r.itemCount) || 0) > 0,
  );
  if (leaseRows.length === 0) {
    throw new Error('No billable yearly lease rows to export.');
  }

  const { periodStart, periodEnd, dueDate } = defaultCycleRange();
  const invoiceDate = periodEnd;
  const zip = new JSZip();
  const usedNames = new Set();

  const safeFilePart = (s) => String(s || '').replace(/[^\w\-.]+/g, '_').slice(0, 72);

  for (let i = 0; i < leaseRows.length; i += 1) {
    const row = leaseRows[i];
    const customerRecord = {
      ...row.customer,
      CustomerListID: row.customer?.CustomerListID || row.customer_id,
      id: row.customer?.id || row.customer_id,
      name: row.customer?.name || row.customer?.Name || row.customer_name,
      Name: row.customer?.Name || row.customer?.name,
      payment_terms: row.customer?.payment_terms || 'NET 30',
      purchase_order: row.customer?.purchase_order ?? null,
    };

    const subtotal = parseFloat(row.totalPerCycle) || 0;
    const qty = parseFloat(row.itemCount) || 1;
    const lineItems = [
      {
        description: 'Annual lease',
        product_code: 'LEASE',
        qty,
        unit: qty > 0 ? subtotal / qty : subtotal,
        amount: subtotal,
      },
    ];

    const gstRate = 0.05;
    const pstRate = 0.06;
    const gst = +(subtotal * gstRate).toFixed(2);
    const pst = +(subtotal * pstRate).toFixed(2);
    const tax = +(gst + pst).toFixed(2);
    const taxRate = +(gstRate + pstRate).toFixed(2);
    const grandTotal = +(subtotal + tax).toFixed(2);

    let invoiceNumber = defaultInvoiceNumber(row);
    try {
      const reserved = await getNextInvoiceNumbers(organization?.id, 1);
      if (reserved?.[0]) invoiceNumber = reserved[0];
    } catch {
      /* fallback defaultInvoiceNumber */
    }

    const pdfResult = await createRentalInvoicePdfDoc({
      organization,
      invoiceTemplate,
      primaryColorFallback,
      row,
      customerRecord,
      lineItems,
      invoiceNumber,
      totals: {
        subtotal,
        gst,
        pst,
        tax,
        amountDue: grandTotal,
        gstRate,
        pstRate,
        taxRate,
      },
      period: { start: periodStart, end: periodEnd },
      dates: { invoice: invoiceDate, due: dueDate },
      terms: customerRecord.payment_terms || 'NET 30',
      purchaseOrder: String(customerRecord.purchase_order || '').trim() || undefined,
      bottles: [],
      returnsInPeriod: [],
      formatCurrency: formatMoney,
    });

    const custLabel =
      customerRecord.name || customerRecord.Name || row.customer_id || 'Customer';
    let fname = `Lease_Invoice_${safeFilePart(invoiceNumber)}_${safeFilePart(custLabel)}.pdf`;
    if (usedNames.has(fname)) {
      let n = 2;
      while (usedNames.has(fname.replace(/\.pdf$/i, `_${n}.pdf`))) n += 1;
      fname = fname.replace(/\.pdf$/i, `_${n}.pdf`);
    }
    usedNames.add(fname);
    zip.file(fname, pdfResult.doc.output('arraybuffer'));
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const orgSlug = String(organization?.name || 'leases').replace(/[^\w\-]+/g, '_').slice(0, 48);
  const day = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Yearly_Lease_Invoices_${orgSlug}_${day}.zip`);
}
