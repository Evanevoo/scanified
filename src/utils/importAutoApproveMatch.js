/** Trim and strip leading zeros for all-digit order numbers. */
export function normalizeImportOrderNum(num) {
  if (num == null || num === '') return '';
  const s = String(num).trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
  return s;
}

function isUnknownOrderRef(value) {
  const s = String(value ?? '').trim();
  return !s || s.toUpperCase() === 'UNKNOWN';
}

/**
 * Resolve the sales order / invoice number stored on an import row.
 * Skips placeholder UNKNOWN refs so row-level order numbers (e.g. 76455) win.
 */
export function resolveImportOrderNumber(data) {
  if (!data) return '';

  const topCandidates = [
    data.order_number,
    data.reference_number,
    data.invoice_number,
    data.sales_receipt_number,
    data?.summary?.reference_number,
  ];
  for (const candidate of topCandidates) {
    if (isUnknownOrderRef(candidate)) continue;
    return String(candidate).trim();
  }

  const rows = data.rows || data.line_items || [];
  const rowOrders = [];
  for (const row of rows) {
    const rowOrder = String(
      row.order_number ||
        row.invoice_number ||
        row.reference_number ||
        row.sales_receipt_number ||
        ''
    ).trim();
    if (!isUnknownOrderRef(rowOrder)) rowOrders.push(rowOrder);
  }
  if (rowOrders.length === 1) return rowOrders[0];

  return '';
}

/** String and numeric variants for bottle_scans.order_number lookups. */
export function buildImportOrderVariants(orderNumber) {
  const raw = String(orderNumber ?? '').trim();
  const norm = normalizeImportOrderNum(raw);
  const variants = new Set([raw, norm].filter(Boolean));
  if (/^\d+$/.test(norm)) {
    const asNum = parseInt(norm, 10);
    if (!Number.isNaN(asNum)) variants.add(asNum);
  }
  return [...variants];
}

export function normalizeImportProductCode(code) {
  if (code == null || code === '') return '';
  return String(code).trim().replace(/\s+/g, '').toUpperCase();
}

export function normalizeImportBarcode(b) {
  if (b == null || b === '') return '';
  const s = String(b).trim();
  return s.replace(/^0+/, '') || s;
}

export function importScanType(scan) {
  const mode = (scan?.mode || '').toString().toUpperCase();
  const action = (scan?.action || '').toString().toLowerCase();
  const scanType = (scan?.scan_type || '').toString().toLowerCase();
  if (mode === 'SHIP' || mode === 'DELIVERY' || mode === 'OUT' || action === 'out' || scanType === 'delivery') {
    return 'out';
  }
  if (mode === 'RETURN' || mode === 'PICKUP' || mode === 'IN' || action === 'in' || scanType === 'pickup') {
    return 'in';
  }
  return 'out';
}

function firstNumericValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    const str = String(value).trim();
    if (str === '') continue;
    const num = Number(str);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

export function importRowShippedQty(row) {
  return firstNumericValue(row.qty_out, row.QtyOut, row.shipped, row.Shipped, row.quantity);
}

export function importRowReturnedQty(row) {
  return firstNumericValue(row.qty_in, row.QtyIn, row.returned, row.Returned, row.return_qty, row.ReturnQty);
}

export function buildInvoiceQtyByProduct(rows) {
  const qtyByProduct = new Map();
  (rows || []).forEach((row) => {
    const product = normalizeImportProductCode(
      row.product_code || row.ProductCode || row.productCode || row.item || row.Item
    );
    if (!product) return;
    const prev = qtyByProduct.get(product) || { shipped: 0, returned: 0 };
    prev.shipped += importRowShippedQty(row);
    prev.returned += importRowReturnedQty(row);
    qtyByProduct.set(product, prev);
  });
  return qtyByProduct;
}

/**
 * Compare invoice line quantities to tracked bottle_scans for one order.
 */
export function trackedQtyMatchesInvoice(rows, scanRows, barcodeToProduct = {}) {
  const invoiceQtyByProduct = buildInvoiceQtyByProduct(rows);
  if (invoiceQtyByProduct.size === 0) return false;

  const latestByBarcode = new Map();
  (scanRows || []).forEach((scan) => {
    const bcRaw = (scan.bottle_barcode || scan.cylinder_barcode || scan.barcode_number || '').toString().trim();
    if (!bcRaw) return;
    const bcNorm = normalizeImportBarcode(bcRaw) || bcRaw;
    const time = new Date(scan.created_at || scan.timestamp || 0).getTime();
    const existing = latestByBarcode.get(bcNorm);
    if (!existing || time >= existing.time) latestByBarcode.set(bcNorm, { scan, time, bcRaw });
  });

  const trackedQtyByProduct = new Map();
  latestByBarcode.forEach(({ scan, bcRaw }) => {
    const bcNorm = normalizeImportBarcode(bcRaw) || bcRaw;
    const product =
      normalizeImportProductCode(scan.product_code) ||
      barcodeToProduct[bcRaw] ||
      barcodeToProduct[bcNorm];
    if (!product) return;
    const type = importScanType(scan);
    const prev = trackedQtyByProduct.get(product) || { shipped: 0, returned: 0 };
    if (type === 'in') prev.returned += 1;
    else prev.shipped += 1;
    trackedQtyByProduct.set(product, prev);
  });

  for (const [product, invoiceQty] of invoiceQtyByProduct.entries()) {
    const tracked = trackedQtyByProduct.get(product) || { shipped: 0, returned: 0 };
    if (invoiceQty.shipped !== tracked.shipped || invoiceQty.returned !== tracked.returned) {
      return false;
    }
  }

  for (const [product, trackedQty] of trackedQtyByProduct.entries()) {
    const invoiceQty = invoiceQtyByProduct.get(product);
    if (!invoiceQty && (trackedQty.shipped > 0 || trackedQty.returned > 0)) {
      return false;
    }
  }

  return true;
}

/** Build barcode → product map from bottle rows and scan barcodes. */
export function buildBarcodeToProductMap(bottles, scanRows) {
  const barcodeToProduct = {};
  (bottles || []).forEach((b) => {
    const bc = (b.barcode_number || '').toString().trim();
    if (!bc) return;
    const product = normalizeImportProductCode(b.type || b.product_code);
    if (!product) return;
    barcodeToProduct[bc] = product;
    const norm = normalizeImportBarcode(bc);
    if (norm && norm !== bc) barcodeToProduct[norm] = product;
  });
  return barcodeToProduct;
}

export function collectBarcodeLookupFromScans(scanRows) {
  const barcodeLookupSet = new Set();
  (scanRows || []).forEach((s) => {
    const raw = (s.bottle_barcode || s.cylinder_barcode || s.barcode_number || '').toString().trim();
    if (!raw) return;
    barcodeLookupSet.add(raw);
    const norm = normalizeImportBarcode(raw);
    if (norm && norm !== raw) barcodeLookupSet.add(norm);
  });
  return [...barcodeLookupSet];
}
