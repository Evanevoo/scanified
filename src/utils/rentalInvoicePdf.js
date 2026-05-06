/**
 * Rental invoice PDF (jsPDF).
 * Layout aligned to TrackAbout-style industrial rental invoices: black summary headers, remit box,
 * bill/ship columns, account band, movement grid (start/ship/rtn/end), asset register.
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

/**
 * US short date for PDFs. If the value starts with YYYY-MM-DD, that calendar date is shown as-is
 * (no local-timezone shift). Timestamps like …T00:00:00Z were showing the wrong day in some zones.
 */
function formatUsDate(isoOrDate) {
  if (!isoOrDate) return '—';
  if (isoOrDate instanceof Date) {
    if (Number.isNaN(isoOrDate.getTime())) return '—';
    return isoOrDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }
  const s = String(isoOrDate).trim();
  const lead = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(lead)) {
    const [y, mo, d] = lead.split('-').map((x) => parseInt(x, 10));
    return `${mo}/${d}/${y}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
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

/** Per-day rent rate like TrackAbout ($9.000). */
function formatMoneyRate3(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0.000';
  return `$${x.toFixed(3)}`;
}

/** Display invoice # on PDFs and in customer emails (e.g. W97318 from row id). */
export function defaultInvoiceNumber(row) {
  const existing = String(row?.invoice_number || '').trim();
  if (existing) return existing;
  const fromId = String(row?.id || '').replace(/\D/g, '');
  if (fromId.length >= 5) return `W${fromId.slice(-5)}`;
  const pad = String(fromId || Date.now() % 100000).padStart(5, '0');
  return `W${pad.slice(-5)}`;
}

function clipYmd(v) {
  const s = String(v || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Inclusive calendar days from startYmd through endYmd (UTC date math; avoids DST / timezone drift). */
function inclusiveDaysBetweenYmd(startYmd, endYmd) {
  const a = clipYmd(startYmd);
  const b = clipYmd(endYmd);
  if (!a || !b) return null;
  if (a > b) return 0;
  const [ay, am, ad] = a.split('-').map((x) => parseInt(x, 10));
  const [by, bm, bd] = b.split('-').map((x) => parseInt(x, 10));
  const ua = Date.UTC(ay, am - 1, ad);
  const ub = Date.UTC(by, bm - 1, bd);
  return Math.max(0, Math.floor((ub - ua) / 86400000) + 1);
}

function normInvoiceProductKey(v) {
  return String(v || '').trim().toLowerCase();
}

function lineProductKeys(line) {
  const keys = new Set();
  const add = (v) => {
    const n = normInvoiceProductKey(v);
    if (n) keys.add(n);
  };
  add(line?.description);
  add(line?.product_code);
  return keys;
}

/** Billable quantity on the line (STRT column); matches PDF row. */
function lineQuantityForInvoice(line) {
  const n = Number(line?.qty ?? line?.quantity);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Exact SKU or hyphenated family only (e.g. bcs68-300 vs bcs68-300-16pack).
 * Avoids parent codes like "bchemtane" matching every bchemtane240 / bchemtane260 line.
 */
function codesMatchProductKey(codeNorm, keyNorm) {
  if (!codeNorm || !keyNorm) return false;
  if (codeNorm === keyNorm) return true;
  const a = codeNorm.length <= keyNorm.length ? codeNorm : keyNorm;
  const b = codeNorm.length > keyNorm.length ? codeNorm : keyNorm;
  return b.startsWith(`${a}-`);
}

/** Match serialized bottle / open rental row to a summary line (productCounts / items). */
function bottleMatchesLineItem(b, line) {
  const keys = lineProductKeys(line);
  if (keys.size === 0) return false;
  const codes = [
    b.product_code,
    b.dns_product_code,
    b.display_label,
    b.description,
    b.gas_type,
  ].map(normInvoiceProductKey).filter(Boolean);

  for (const key of keys) {
    if (key === 'unclassified') {
      const pc = normInvoiceProductKey(b.product_code);
      if (!pc || pc === '__unclassified__') return true;
      continue;
    }
    if (codes.some((c) => codesMatchProductKey(c, key))) return true;
  }
  return false;
}

function returnMatchesLineItem(r, line) {
  const keys = lineProductKeys(line);
  if (keys.size === 0) return false;
  const rc = normInvoiceProductKey(
    r.product_code || r.dns_product_code || r.product_type || r.asset_type
  );
  for (const key of keys) {
    if (key === 'unclassified') return !rc || rc === '__unclassified__';
    if (codesMatchProductKey(rc, key)) return true;
  }
  return false;
}

/**
 * SHIP/RTN/END per product line; falls back to invoice-level totals only for a single generic line.
 */
function movementCountsForLine(line, ps, pe, inPeriodBottles, returnsInPeriod, globalShip, globalRtn, globalOnHand, lineCount) {
  const shipN = inPeriodBottles.filter((b) => {
    if (!bottleMatchesLineItem(b, line)) return false;
    const d = clipYmd(b.rental_start_date || b.delivery_date || b.purchase_date);
    return d && ps && pe && d >= ps && d <= pe;
  }).length;
  const rtnN = (returnsInPeriod || []).filter((r) => returnMatchesLineItem(r, line)).length;
  const endN = inPeriodBottles.filter((b) => bottleMatchesLineItem(b, line)).length;

  const desc = String(line?.description || '').toLowerCase();
  const genericSingle =
    lineCount === 1
    && (desc.includes('rental charges') || desc.includes('rental charge'))
    && shipN === 0
    && rtnN === 0
    && endN === 0
    && (globalShip > 0 || globalRtn > 0 || globalOnHand > 0);

  if (genericSingle) {
    return { ship: globalShip, rtn: globalRtn, end: globalOnHand };
  }
  const q = lineQuantityForInvoice(line);
  const anyBottleMatch = inPeriodBottles.some((b) => bottleMatchesLineItem(b, line));
  const endOut = endN > 0 ? endN : (!anyBottleMatch && q > 0 ? q : endN);

  // STRT + SHIP - RTN = END. Observed in-period movement may be incomplete; add remainder to SHIP or RTN.
  const delta = endOut - q;
  const obsNet = shipN - rtnN;
  const rem = delta - obsNet;
  const ship = shipN + (rem > 0 ? rem : 0);
  const rtn = rtnN + (rem < 0 ? -rem : 0);

  return { ship, rtn, end: endOut };
}

/**
 * Legacy: difference in whole days using local noon (used where inclusive calendar span is not required).
 */
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
 * @param {{subtotal:number,gst:number,pst:number,tax:number,amountDue:number,gstRate:number,pstRate:number,taxRate:number}} params.totals
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
  const secondary = template.secondary_color || '#64748B';
  const fontFamily = template.font_family || 'helvetica';
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
  const gstNumber = template.gst_number || organization?.gst_number || '';
  if (gstNumber) remitLines.push(`GST# ${gstNumber}`);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont(fontFamily, 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageW - 14;
  const contentW = right - left;

  const footerY = pageH - 10;
  const headerPageNumY = 11;

  const newPage = () => {
    doc.addPage();
  };

  const ensureY = (y, needed) => {
    if (y + needed > footerY - 6) {
      newPage();
      return 22;
    }
    return y;
  };

  /** TrackAbout-style: page X of Y top-right on every page. */
  const applyPageHeaders = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`Page ${i} of ${totalPages}`, right, headerPageNumY, { align: 'right' });
    }
    doc.setPage(totalPages);
  };

  const wrap = (text, x, y, maxW, lineH = 4) => {
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    lines.forEach((line, idx) => doc.text(line, x, y + idx * lineH));
    return y + lines.length * lineH;
  };

  const custName = customer.name || customer.Name || row?.customer_name || 'Customer';

  // --- Issuer block (logo + address + phone) top-left, title top-right (TrackAbout-style) ---
  let y = 16;
  const logoY = 14;
  const logoW = 38;
  const logoH = 16;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', left, logoY, logoW, logoH);
    } catch {
      // ignore
    }
  }

  let issuerY = logoDataUrl ? logoY + logoH + 3 : logoY;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(String(organization?.name || remitName).toUpperCase(), left, issuerY);
  issuerY += 4;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 45);
  const issuerAddr = [];
  if (template.remit_address_line1) issuerAddr.push(template.remit_address_line1);
  if (template.remit_address_line2) issuerAddr.push(template.remit_address_line2);
  if (template.remit_address_line3) issuerAddr.push(template.remit_address_line3);
  if (!template.remit_address_line1) {
    if (organization?.address) issuerAddr.push(organization.address);
    const cityLine = [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', ');
    if (cityLine) issuerAddr.push(cityLine);
  }
  issuerAddr.forEach((ln) => {
    doc.text(String(ln), left, issuerY);
    issuerY += 3.4;
  });
  const invPhone = organization?.phone || organization?.support_phone || organization?.invoice_phone;
  const invFax = organization?.fax;
  if (invPhone) {
    doc.text(`Phone: ${invPhone}`, left, issuerY);
    issuerY += 3.4;
  }
  if (invFax) {
    doc.text(`Fax: ${invFax}`, left, issuerY);
    issuerY += 3.4;
  }

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 15, 15);
  doc.text('RENTAL INVOICE', right, logoY + 6, { align: 'right' });

  y = Math.max(issuerY, logoY + logoH + 2) + 4;

  // --- Black header strip: invoice date / number / amount due ---
  const metaH = 5.5;
  doc.setFillColor(0, 0, 0);
  doc.rect(left, y, contentW, metaH, 'F');
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  const metaX1 = left + 3;
  const metaX2 = left + contentW * 0.36;
  const metaX3 = left + contentW * 0.62;
  doc.text('INVOICE DATE', metaX1, y + 3.8);
  doc.text('INVOICE NUMBER', metaX2, y + 3.8);
  doc.text('AMOUNT DUE', right - 3, y + 3.8, { align: 'right' });
  y += metaH;
  doc.setDrawColor(0, 0, 0);
  doc.rect(left, y, contentW, metaH + 0.5, 'S');
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(25, 25, 25);
  doc.text(formatUsDate(dates.invoice), metaX1, y + 4);
  doc.text(String(invNo), metaX2, y + 4);
  doc.text(formatCurrency(totals.amountDue), right - 3, y + 4, { align: 'right' });
  y += metaH + 6;

  // --- Remit box ---
  const remitBoxTop = y;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(55, 55, 55);
  doc.text('PLEASE REMIT PAYMENT TO:', left + 2, y + 4);
  let remitInnerY = y + 8;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(35, 35, 35);
  remitLines.forEach((ln) => {
    doc.text(String(ln).toUpperCase(), left + 2, remitInnerY);
    remitInnerY += 3.6;
  });
  const remitBoxH = remitInnerY - remitBoxTop + 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(left, remitBoxTop, contentW, remitBoxH, 'S');
  doc.setLineWidth(0.2);
  y = remitBoxTop + remitBoxH + 5;

  const mid = left + contentW / 2;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text('BILL TO:', left, y);
  doc.text('SHIP TO:', mid + 2, y);
  y += 4;
  doc.setFont(fontFamily, 'normal');
  let billY = y;
  doc.setFontSize(8);
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

  // --- Account band (single bordered table; TrackAbout-style) ---
  const pStart = formatUsDate(period.start);
  const pEnd = formatUsDate(period.end);
  const bandTop = y;
  const bandHeaderH = 5;
  const bandRowH = 6;
  const bandTotalH = bandHeaderH + bandRowH;
  doc.setFillColor(0, 0, 0);
  doc.rect(left, bandTop, contentW, bandHeaderH, 'F');
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  const b1 = left + 2;
  const b2 = left + contentW * 0.22;
  const b3 = left + contentW * 0.40;
  const b4 = left + contentW * 0.58;
  const b5 = left + contentW * 0.72;
  const b6 = left + contentW * 0.84;
  doc.text('RENTAL PERIOD', b1, bandTop + 3.6);
  doc.text('BILL TO ACCT #', b2, bandTop + 3.6);
  doc.text('SHIP TO ACCT #', b3, bandTop + 3.6);
  doc.text('TERMS', b4, bandTop + 3.6);
  doc.text('DUE DATE', b5, bandTop + 3.6);
  doc.text('PURCHASE ORDER', b6, bandTop + 3.6);
  doc.setDrawColor(0, 0, 0);
  doc.rect(left, bandTop, contentW, bandTotalH, 'S');
  doc.line(left, bandTop + bandHeaderH, left + contentW, bandTop + bandHeaderH);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  const bandValY = bandTop + bandHeaderH + 4.2;
  doc.text(`${pStart} - ${pEnd}`, b1, bandValY);
  doc.text(String(billAcct), b2, bandValY);
  doc.text(String(shipAcct), b3, bandValY);
  doc.text(String(terms), b4, bandValY);
  doc.text(formatUsDate(dates.due), b5, bandValY);
  doc.text(purchaseOrder && purchaseOrder !== '—' ? String(purchaseOrder) : '', b6, bandValY);
  y = bandTop + bandTotalH + 8;

  // --- Rental summary table (black column header, grid) ---
  y = ensureY(y, 40);
  const tableLeft = left;
  const tableW = contentW;
  const colItem = tableLeft + 1;
  const itemColEnd = tableLeft + tableW * 0.28;
  const colStart = itemColEnd + 4;
  const colShip = colStart + 24;
  const colRtn = colShip + 16;
  const colEnd = colRtn + 16;
  const colDays = colEnd + 17;
  const colTot = tableLeft + tableW - 2;
  const splitAmt = colTot - 15;
  const colRate = colDays + 14;
  const colDescMaxW = Math.max(18, colStart - colItem - 3);

  const sumHeaderH = 6;
  const summaryTableTop = y;
  // Column bands (shared by header + body). jsPDF align:'center' is unreliable; use getTextWidth.
  const wItem = colStart - colItem - 2;
  const wStrt = colShip - colStart - 1;
  const wShip = colRtn - colShip - 1;
  const wRtn = colEnd - colRtn - 1;
  const wEnd = colDays - colEnd - 1;
  const wDays = colRate - colDays - 1;
  const wRate = splitAmt - colRate - 1;
  const drawCenteredInBand = (str, bandLeft, bandW, yRow) => {
    const s = String(str);
    const tw = doc.getTextWidth(s);
    const x = bandLeft + Math.max(0, (bandW - tw) / 2);
    doc.text(s, x, yRow);
  };
  const drawRightEdgeAt = (str, rightX, yRow) => {
    const s = String(str);
    const tw = doc.getTextWidth(s);
    doc.text(s, rightX - tw, yRow);
  };
  doc.setFillColor(0, 0, 0);
  doc.rect(tableLeft, y, tableW, sumHeaderH, 'F');
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(255, 255, 255);
  const headY = y + 4.1;
  drawCenteredInBand('ITEM', colItem, wItem, headY);
  drawCenteredInBand('STRT', colStart, wStrt, headY);
  drawCenteredInBand('SHIP', colShip, wShip, headY);
  drawCenteredInBand('RTN', colRtn, wRtn, headY);
  drawCenteredInBand('END', colEnd, wEnd, headY);
  drawCenteredInBand('DAYS', colDays, wDays, headY);
  drawCenteredInBand('RATE', colRate, wRate, headY);
  drawRightEdgeAt('TOTAL', colTot, headY);
  y += sumHeaderH;
  // Body baseline must clear header ascenders (jsPDF y = baseline).
  const summaryBodyPad = 6.5;
  y += summaryBodyPad;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const pe = clipYmd(period?.end);
  const ps = clipYmd(period?.start);
  const inPeriodBottles = bottles.filter((b) => {
    const d = clipYmd(b.rental_start_date || b.delivery_date || b.purchase_date);
    return !d || !pe || d <= pe;
  });
  const rtnCount = Array.isArray(returnsInPeriod) ? returnsInPeriod.length : 0;
  const onHandCount = inPeriodBottles.length;
  const shipCount = (() => {
    if (!ps || !pe) return 0;
    return inPeriodBottles.filter((b) => {
      const d = clipYmd(b.rental_start_date || b.delivery_date);
      return d && d >= ps && d <= pe;
    }).length;
  })();

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(35, 35, 35);
  const totalsX0 = tableLeft + tableW * 0.52;
  const lineCount = lineItems.length;
  const periodBillDays = ps && pe ? inclusiveDaysBetweenYmd(ps, pe) : null;
  const rentDaysStr =
    periodBillDays != null && periodBillDays > 0 ? String(periodBillDays) : '—';

  lineItems.forEach((line) => {
    const rawLabel = line.description || line.product_code || '—';
    const desc = String(rawLabel).toUpperCase();
    const descLines = doc.splitTextToSize(desc, colDescMaxW);
    const rowH = Math.max(4.5, descLines.length * 3.2);
    y = ensureY(y, rowH + 3);
    doc.text(descLines, colItem, y);
    const hasQtyField = line?.qty != null || line?.quantity != null;
    const qDisp = lineQuantityForInvoice(line);
    const qtyLabel = hasQtyField || qDisp > 0 ? String(qDisp) : '—';
    const { ship, rtn, end } = movementCountsForLine(
      line,
      ps,
      pe,
      inPeriodBottles,
      returnsInPeriod,
      shipCount,
      rtnCount,
      onHandCount,
      lineCount
    );
    drawCenteredInBand(qtyLabel, colStart, wStrt, y);
    drawCenteredInBand(ship, colShip, wShip, y);
    drawCenteredInBand(rtn, colRtn, wRtn, y);
    drawCenteredInBand(end, colEnd, wEnd, y);
    drawCenteredInBand(rentDaysStr, colDays, wDays, y);
    drawCenteredInBand(formatMoneyRate3(line.unit || 0), colRate, wRate, y);
    drawRightEdgeAt(formatCurrency(line.amount || 0), colTot, y);
    y += rowH;
    doc.setDrawColor(200, 200, 200);
    doc.line(tableLeft, y, tableLeft + tableW, y);
  });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(tableLeft, summaryTableTop, tableW, y - summaryTableTop, 'S');
  doc.setLineWidth(0.2);

  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(totalsX0, y, right, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text('Subtotal', totalsX0, y);
  doc.text(formatCurrency(totals.subtotal), right, y, { align: 'right' });
  y += 4;
  const hasGstPst = Number.isFinite(totals.gst) && Number.isFinite(totals.pst);
  if (hasGstPst) {
    const gstLabel = Number.isFinite(totals.gstRate) ? `GST (${(totals.gstRate * 100).toFixed(0)}%)` : 'GST';
    doc.text(gstLabel, totalsX0, y);
    doc.text(formatCurrency(totals.gst), right, y, { align: 'right' });
    y += 4;
    const pstLabel = Number.isFinite(totals.pstRate) ? `PST (${(totals.pstRate * 100).toFixed(0)}%)` : 'PST';
    doc.text(pstLabel, totalsX0, y);
    doc.text(formatCurrency(totals.pst), right, y, { align: 'right' });
  } else {
    const taxLabel = Number.isFinite(totals.taxRate) && totals.taxRate > 0
      ? `Tax (${(totals.taxRate * 100).toFixed(0)}%)`
      : 'Tax';
    doc.text(taxLabel, totalsX0, y);
    doc.text(formatCurrency(totals.tax), right, y, { align: 'right' });
  }
  y += 6;
  const dueRowH = 7;
  doc.setFillColor(0, 0, 0);
  doc.rect(totalsX0 - 1, y - 1, right - totalsX0 + 2, dueRowH, 'F');
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('AMOUNT DUE', totalsX0, y + 4);
  doc.text(formatCurrency(totals.amountDue), right - 1, y + 4, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.setTextColor(40, 40, 40);
  y += dueRowH + 8;

  // --- Serialized asset balance (on hand at period end) ---
  y = ensureY(y, 20);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('ON-HAND SERIALIZED ASSETS (END OF PERIOD)', left, y);
  y += 5;

  if (inPeriodBottles.length === 0) {
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
    const aBarcode = left + 82;
    const aSerial = left + 112;
    const classColW = Math.max(8, a2 - a1 - 2);
    const assetColW = Math.max(8, aBarcode - a2 - 4);
    doc.setFillColor(0, 0, 0);
    doc.rect(left, y - 3.5, contentW, 6, 'F');
    doc.setFont(fontFamily, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text('CLASS', a1, y);
    doc.text('ASSET / TYPE', a2, y);
    doc.text('BARCODE', aBarcode, y);
    doc.text('SERIAL', aSerial, y);
    y += 6;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(35, 35, 35);

    inPeriodBottles.forEach((b) => {
      const pcRaw = String(b.product_code || '').trim();
      const rentalClass =
        (pcRaw && pcRaw !== '__unclassified__'
          ? pcRaw
          : null)
        || b.rental_class
        || b.type
        || b.description
        || b.display_label
        || b.gas_type
        || 'Industrial Cylinders';
      const assetType = b.description || b.display_label || b.gas_type || b.product_code || '—';
      const barcode = b.barcode_number || b.barcode || b.bottle_barcode || b.asset_tag || '—';
      const rawSerial = b.serial_number || b.cylinder_number || b._serial_display || '';
      const serial = rawSerial && rawSerial !== 'Not Set' ? rawSerial : '—';
      const rcLines = doc.splitTextToSize(String(rentalClass), classColW);
      const atLines = doc.splitTextToSize(String(assetType), assetColW);
      const rowLines = Math.max(rcLines.length, atLines.length);
      const h = Math.max(4, rowLines * 2.8);
      y = ensureY(y, h + 2);
      doc.text(rcLines, a1, y);
      doc.text(atLines, a2, y);
      doc.text(String(barcode), aBarcode, y);
      doc.text(String(serial), aSerial, y);
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
    const retTypeColW = Math.max(8, right - r6 - 2);
    doc.setFillColor(0, 0, 0);
    doc.rect(left, y - 3.5, contentW, 6, 'F');
    doc.setFont(fontFamily, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text('RETURN DATE', r1, y);
    doc.text('DELIVERED', r2, y);
    doc.text('DAYS OUT', r3, y);
    doc.text('BARCODE', r4, y);
    doc.text('SERIAL', r5, y);
    doc.text('ASSET TYPE', r6, y);
    y += 6;
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(35, 35, 35);

    returns.forEach((r) => {
      const retDate = r.rental_end_date;
      const del = r.rental_start_date;
      const daysOut = inclusiveDaysBetweenYmd(
        del ? String(del).slice(0, 10) : null,
        retDate ? String(retDate).slice(0, 10) : null
      );
      const barcode = r._barcode_display || r.bottle_barcode || '—';
      const serial = r._serial_display || r.serial_number || '—';
      const assetType =
        r.product_code || r.product_type || r.dns_product_code || r.asset_type || '—';
      const typeLines = doc.splitTextToSize(String(assetType), retTypeColW);
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

  applyPageHeaders();

  const safeName = String(custName).replace(/[^\w\-]+/g, '_');
  const fileName = `Rental_Invoice_${safeName}_${String(dates.invoice || '').slice(0, 10)}.pdf`;
  return { doc, fileName, customerName: custName };
}
