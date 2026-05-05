/**
 * Weldcor-style rental invoice PDF (jsPDF).
 * Layout mirrors common industrial gas rental invoices: remit-to, bill/ship, rental summary grid, asset register.
 */
import jsPDF from 'jspdf';

function rgbFromHex(hex, fallback) {
  const raw = String(hex || '').trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function fetchImageAsDataUrl(url) {
  if (!url) return Promise.resolve(null);
  return (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  })();
}

function formatUsDate(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = typeof isoOrDate === 'string' ? new Date(`${isoOrDate}T12:00:00`) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function addressLinesFromFields(c) {
  if (!c) return [];
  const lines = [];
  const addrFields = [
    c.contact_details, c.address, c.address2, c.address3, c.address4, c.address5,
  ];
  for (const f of addrFields) {
    const v = String(f || '').trim();
    if (v) lines.push(v);
  }
  const cityLine = [c.city, c.state, c.postal_code].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (c.country) lines.push(c.country);
  return lines;
}

function billToLines(c) {
  if (!c) return [];
  if (c.billing_address && String(c.billing_address).trim()) {
    return String(c.billing_address).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return addressLinesFromFields(c);
}

function shipToLines(c, fallbackLines) {
  if (c?.shipping_address && String(c.shipping_address).trim()) {
    return String(c.shipping_address).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return fallbackLines;
}

function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

/** Display invoice # on PDFs and in customer emails (e.g. R97318 from row id). */
export function defaultInvoiceNumber(row) {
  const fromId = String(row?.id || '').replace(/\D/g, '');
  if (fromId.length >= 5) return `R${fromId.slice(-5)}`;
  const pad = String(fromId || Date.now() % 100000).padStart(5, '0');
  return `R${pad.slice(-5)}`;
}

function daysBetween(startIso, endIso) {
  const a = startIso ? new Date(`${String(startIso).slice(0, 10)}T12:00:00`) : null;
  const b = endIso ? new Date(`${String(endIso).slice(0, 10)}T12:00:00`) : new Date();
  if (!a || Number.isNaN(a.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

/**
 * @param {object} params
 * @param {object} params.organization
 * @param {object} [params.invoiceTemplate]
 * @param {string} [params.primaryColorFallback]
 * @param {object} params.row - subscription / virtual rental row
 * @param {object} [params.customerRecord] - resolved customers row for addresses
 * @param {Array<{description:string,qty:number,unit:number,amount:number}>} params.lineItems
 * @param {{subtotal:number,tax:number,amountDue:number,taxRate:number}} params.totals
 * @param {{start:string,end:string}} params.period - ISO date strings
 * @param {{invoice:string,due:string}} params.dates - ISO date strings
 * @param {string} [params.terms]
 * @param {string} [params.territory]
 * @param {string} [params.purchaseOrder]
 * @param {Array<object>} params.bottles - on-hand serialized rows (merged bottles + open rentals)
 * @param {Array<object>} [params.returnsInPeriod] - closed rentals whose rental_end_date falls in invoice period
 * @param {string} [params.invoiceNumber]
 * @param {(n:number)=>string} [params.formatCurrency] - optional UI formatter
 */
export async function createRentalInvoicePdfDoc(params) {
  const {
    organization,
    invoiceTemplate = {},
    primaryColorFallback = '#1e293b',
    row,
    customerRecord = null,
    lineItems = [],
    totals,
    period,
    dates,
    terms = 'NET 30',
    territory = '—',
    purchaseOrder = '—',
    bottles = [],
    returnsInPeriod = [],
    invoiceNumber,
    formatCurrency = formatMoney,
  } = params;

  const template = invoiceTemplate || {};
  const primary = template.primary_color || primaryColorFallback || '#1e293b';
  const secondary = template.secondary_color || '#64748B';
  const fontFamily = template.font_family || 'helvetica';
  const primaryRgb = rgbFromHex(primary, [30, 41, 59]);
  const secondaryRgb = rgbFromHex(secondary, [100, 116, 139]);
  const logoUrl = template.logo_url || organization?.logo_url || organization?.app_icon_url || '';
  const logoDataUrl = await fetchImageAsDataUrl(logoUrl);

  const invNo = invoiceNumber || defaultInvoiceNumber(row);
  const customer = customerRecord || row?.customer || {};
  const billLines = billToLines(customer);
  const shipDisplay = shipToLines(customer, billLines);

  const billAcct =
    customer.CustomerListID
    || row?.customer_id
    || '—';
  const shipAcct = billAcct;

  const remitLines = [];
  const remitName = template.remit_name || organization?.name || '—';
  remitLines.push(remitName);
  if (template.remit_address_line1) remitLines.push(template.remit_address_line1);
  if (template.remit_address_line2) remitLines.push(template.remit_address_line2);
  if (template.remit_address_line3) remitLines.push(template.remit_address_line3);
  if (!template.remit_address_line1) {
    if (organization?.address) remitLines.push(organization.address);
    const cityLine = [organization?.city, organization?.state, organization?.postal_code]
      .filter(Boolean)
      .join(', ');
    if (cityLine) remitLines.push(cityLine);
    if (organization?.country) remitLines.push(organization.country);
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont(fontFamily, 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageW - 14;
  const contentW = right - left;

  const footerY = pageH - 10;

  const newPage = () => {
    doc.addPage();
  };

  const ensureY = (y, needed) => {
    if (y + needed > footerY - 6) {
      newPage();
      return 18;
    }
    return y;
  };

  const applyFooters = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      doc.text(`Page ${i} of ${totalPages}`, right, footerY, { align: 'right' });
    }
    doc.setPage(totalPages);
  };

  const wrap = (text, x, y, maxW, lineH = 4) => {
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    lines.forEach((line, idx) => doc.text(line, x, y + idx * lineH));
    return y + lines.length * lineH;
  };

  // --- Page 1 header (business-style, not full banner) ---
  let y = 14;
  doc.setTextColor(40, 40, 40);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text('RENTAL INVOICE', left, y);
  y += 8;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', right - 28, 12, 22, 10);
    } catch {
      // ignore
    }
  }

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.text('INVOICE DATE', left, y);
  doc.text('INVOICE NUMBER', left + 55, y);
  doc.text('AMOUNT DUE', right, y, { align: 'right' });
  y += 4;
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  doc.text(formatUsDate(dates.invoice), left, y);
  doc.text(String(invNo), left + 55, y);
  doc.text(formatCurrency(totals.amountDue), right, y, { align: 'right' });
  doc.setFont(undefined, 'normal');
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.text('PLEASE REMIT PAYMENT TO:', left, y);
  y += 4;
  doc.setTextColor(45, 45, 45);
  remitLines.forEach((ln) => {
    doc.text(String(ln).toUpperCase(), left, y);
    y += 3.5;
  });
  y += 4;

  const mid = left + contentW / 2;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('BILL TO:', left, y);
  doc.text('SHIP TO:', mid + 2, y);
  y += 4;
  doc.setFont(undefined, 'normal');
  const billStart = y;
  let billY = y;
  doc.setFontSize(8);
  const custName = customer.name || customer.Name || row?.customer_name || 'Customer';
  doc.text(String(custName).toUpperCase(), left, billY);
  billY += 3.5;
  billLines.forEach((ln) => {
    billY = wrap(ln, left, billY, mid - left - 4, 3.5);
  });
  let shipY = y;
  doc.text(String(custName).toUpperCase(), mid + 2, shipY);
  shipY += 3.5;
  shipDisplay.forEach((ln) => {
    shipY = wrap(ln, mid + 2, shipY, right - mid - 6, 3.5);
  });
  y = Math.max(billY, shipY) + 6;

  doc.setDrawColor(210, 210, 210);
  doc.line(left, y, right, y);
  y += 5;

  y = ensureY(y, 36);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('RENTAL PERIOD', left, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  const pStart = formatUsDate(period.start);
  const pEnd = formatUsDate(period.end);
  doc.text(`${pStart}  –  ${pEnd}`, left, y);
  y += 8;

  const rh = 6;
  doc.setFillColor(245, 245, 246);
  doc.rect(left, y - 4, contentW, rh, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(6.5);
  const c1 = left;
  const c2 = left + 32;
  const c3 = left + 64;
  const c4 = left + 96;
  const c5 = left + 118;
  const c6 = left + 140;
  doc.text('BILL TO ACCT #', c1, y);
  doc.text('SHIP TO ACCT #', c2, y);
  doc.text('TERRITORY', c3, y);
  doc.text('TERMS', c4, y);
  doc.text('DUE DATE', c5, y);
  doc.text('PURCHASE ORDER', c6, y);
  y += rh - 1;
  doc.setFont(undefined, 'normal');
  doc.text(String(billAcct), c1, y);
  doc.text(String(shipAcct), c2, y);
  doc.text(String(territory), c3, y);
  doc.text(String(terms), c4, y);
  doc.text(formatUsDate(dates.due), c5, y);
  doc.text(String(purchaseOrder), c6, y);
  y += 10;

  // --- Rental summary table ---
  y = ensureY(y, 40);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('RENTAL SUMMARY', left, y);
  y += 5;

  const colItem = left;
  const colStart = left + 72;
  const colShip = left + 86;
  const colRtn = left + 98;
  const colEnd = left + 110;
  const colDays = left + 122;
  const colRate = left + 148;
  const colTot = right;

  doc.setFillColor(238, 239, 241);
  doc.rect(left, y - 3.5, contentW, 6, 'F');
  doc.setFontSize(6);
  doc.text('ITEM', colItem, y);
  doc.text('START COUNT', colStart, y);
  doc.text('SHIP', colShip, y);
  doc.text('RTN', colRtn, y);
  doc.text('END COUNT', colEnd, y);
  doc.text('RENT DAYS', colDays, y);
  doc.text('RENT RATE', colRate, y);
  doc.text('TOTAL', colTot, y, { align: 'right' });
  y += 6;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(6.5);
  lineItems.forEach((line) => {
    const desc = String(line.description || '—');
    const descLines = doc.splitTextToSize(desc, colStart - colItem - 2);
    const rowH = Math.max(4, descLines.length * 3.2);
    y = ensureY(y, rowH + 2);
    doc.text(descLines, colItem, y);
    const qty = line.qty != null ? String(line.qty) : '—';
    doc.text(qty, colStart + 8, y, { align: 'right' });
    doc.text('—', colShip + 4, y, { align: 'right' });
    doc.text('—', colRtn + 4, y, { align: 'right' });
    doc.text('—', colEnd + 8, y, { align: 'right' });
    doc.text('—', colDays + 8, y, { align: 'right' });
    doc.text(formatCurrency(line.unit || 0), colRate + 10, y, { align: 'right' });
    doc.text(formatCurrency(line.amount || 0), colTot, y, { align: 'right' });
    y += rowH;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(left + 100, y, right, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Subtotal', left + 120, y);
  doc.text(formatCurrency(totals.subtotal), right, y, { align: 'right' });
  y += 4;
  const taxLabel = Number.isFinite(totals.taxRate) && totals.taxRate > 0
    ? `Tax (${(totals.taxRate * 100).toFixed(0)}%)`
    : 'Tax';
  doc.text(taxLabel, left + 120, y);
  doc.text(formatCurrency(totals.tax), right, y, { align: 'right' });
  y += 5;
  doc.setFont(undefined, 'bold');
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text('AMOUNT DUE', left + 120, y);
  doc.text(formatCurrency(totals.amountDue), right, y, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.setTextColor(40, 40, 40);
  y += 12;

  // --- Serialized asset balance (on hand at period end) ---
  y = ensureY(y, 20);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('ON-HAND SERIALIZED ASSETS (END OF PERIOD)', left, y);
  y += 5;

  if (bottles.length === 0) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text(
      'No serialized cylinders/assets matched this customer for on-hand listing (assign bottles or ensure open rental rows).',
      left,
      y,
      { maxWidth: contentW }
    );
    y += 10;
  } else {
    const a1 = left;
    const a2 = left + 26;
    const a3 = left + 52;
    const a4 = left + 76;
    const a5 = left + 92;
    const a6 = left + 108;
    const a7 = left + 124;
    doc.setFillColor(238, 239, 241);
    doc.rect(left, y - 3.5, contentW, 6, 'F');
    doc.setFontSize(5.5);
    doc.text('CLASS', a1, y);
    doc.text('ASSET / TYPE', a2, y);
    doc.text('DELIVERED', a3, y);
    doc.text('STATUS', a4, y);
    doc.text('DAYS', a5, y);
    doc.text('BARCODE', a6, y);
    doc.text('SERIAL', a7, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(5.5);

    bottles.forEach((b) => {
      const rentalClass = b.rental_class || b.type || 'Industrial Cylinders';
      const assetType = b.description || b.product_code || b.display_label || b.gas_type || '—';
      const delivered = b.rental_start_date || b.delivery_date || b.purchase_date;
      const held = daysBetween(delivered, period?.end);
      const barcode = b.barcode_number || b.barcode || b.bottle_barcode || b.asset_tag || '—';
      const serial = b.serial_number || b.cylinder_number || b._serial_display || '—';
      const status = b._invoiceStatus || 'On hand';
      const rcLines = doc.splitTextToSize(String(rentalClass), 22);
      const atLines = doc.splitTextToSize(String(assetType), 34);
      const rowLines = Math.max(rcLines.length, atLines.length);
      const h = Math.max(4, rowLines * 2.8);
      y = ensureY(y, h + 2);
      doc.text(rcLines, a1, y);
      doc.text(atLines, a2, y);
      doc.text(delivered ? formatUsDate(delivered) : '—', a3, y);
      doc.text(String(status), a4, y);
      doc.text(held != null ? String(held) : '—', a5, y);
      doc.text(String(barcode), a6, y);
      doc.text(String(serial), a7, y);
      y += h;
    });
  }

  // --- Returns closed during invoice period ---
  const returns = Array.isArray(returnsInPeriod) ? returnsInPeriod : [];
  if (returns.length > 0) {
    y += 6;
    y = ensureY(y, 28);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text('RETURNS DURING INVOICE PERIOD', left, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
    doc.text(
      `Assets returned between ${formatUsDate(period?.start)} and ${formatUsDate(period?.end)}.`,
      left,
      y,
      { maxWidth: contentW }
    );
    y += 8;
    doc.setTextColor(40, 40, 40);

    const r1 = left;
    const r2 = left + 28;
    const r3 = left + 52;
    const r4 = left + 72;
    const r5 = left + 92;
    const r6 = left + 118;
    doc.setFillColor(238, 239, 241);
    doc.rect(left, y - 3.5, contentW, 6, 'F');
    doc.setFontSize(5.5);
    doc.text('RETURN DATE', r1, y);
    doc.text('DELIVERED', r2, y);
    doc.text('DAYS OUT', r3, y);
    doc.text('BARCODE', r4, y);
    doc.text('SERIAL', r5, y);
    doc.text('ASSET TYPE', r6, y);
    y += 6;
    doc.setFont(undefined, 'normal');

    returns.forEach((r) => {
      const retDate = r.rental_end_date;
      const del = r.rental_start_date;
      const daysOut = daysBetween(del, retDate);
      const barcode = r._barcode_display || r.bottle_barcode || '—';
      const serial = r._serial_display || r.serial_number || '—';
      const assetType =
        r.product_code || r.product_type || r.dns_product_code || r.asset_type || '—';
      const typeLines = doc.splitTextToSize(String(assetType), 42);
      const rowH = Math.max(4, typeLines.length * 2.8);
      y = ensureY(y, rowH + 2);
      doc.text(formatUsDate(retDate), r1, y);
      doc.text(del ? formatUsDate(del) : '—', r2, y);
      doc.text(daysOut != null ? String(daysOut) : '—', r3, y);
      doc.text(String(barcode), r4, y);
      doc.text(String(serial), r5, y);
      doc.text(typeLines, r6, y);
      y += rowH + 1;
    });
  }

  y += 6;
  y = ensureY(y, 10);
  doc.setFontSize(7);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.text('The total value of assets in your possession: —', left, y);

  applyFooters();

  const safeName = String(custName).replace(/[^\w\-]+/g, '_');
  const fileName = `Rental_Invoice_${safeName}_${String(dates.invoice || '').slice(0, 10)}.pdf`;
  return { doc, fileName, customerName: custName };
}
