import { formatLocationDisplay } from './locationDisplay';

/** Escape a value for CSV and wrap in quotes. */
export function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/** Format a date/datetime for export (local date or empty). */
export function formatExportDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

/** Format a date/datetime with time for history export. */
export function formatExportDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

/**
 * Delivered-to-customer date on a bottle row.
 * Prefers rental_start_date; falls back to legacy delivery_date / purchase_date.
 */
export function getDeliveredAtCustomerDate(asset) {
  if (!asset) return null;
  return asset.rental_start_date || asset.delivery_date || asset.purchase_date || null;
}

/** Ownership display label from bottle fields. */
export function getOwnershipLabel(asset) {
  if (!asset) return '';
  return (
    asset.ownership ||
    asset.owner_name ||
    asset.owner_type ||
    ''
  );
}

export const ASSET_DETAIL_CSV_HEADERS = [
  'Asset ID',
  'Barcode',
  'Serial Number',
  'Product Code',
  'Description',
  'Gas Type',
  'Category',
  'Group',
  'Type',
  'Status',
  'Use State',
  'Ownership',
  'Location',
  'Days at Location',
  'Assigned Customer ID',
  'Assigned Customer',
  'Customer Phone',
  'Delivered to Customer',
  'Dock Stock',
  'Created Date',
  'Last Updated',
];

/**
 * Map a bottle (+ optional joined customers) row to a detail CSV row.
 */
export function assetToDetailExportRow(asset) {
  const customer = asset?.customers || null;
  const customerId =
    customer?.CustomerListID ||
    asset?.assigned_customer ||
    asset?.CustomerListID ||
    asset?.customer_id ||
    '';
  const customerName =
    customer?.name ||
    asset?.customer_name ||
    (customerId ? '' : 'Unassigned');
  const updated =
    asset?.updated_at || asset?.last_updated || null;

  return [
    asset?.id ?? '',
    asset?.barcode_number || '',
    asset?.serial_number || '',
    asset?.product_code || '',
    asset?.description || '',
    asset?.gas_type || '',
    asset?.category || '',
    asset?.group_name || '',
    asset?.type || '',
    asset?.status || '',
    asset?.use_state || '',
    getOwnershipLabel(asset) || '',
    asset?.location ? formatLocationDisplay(asset.location) : '',
    asset?.days_at_location != null && asset?.days_at_location !== ''
      ? String(asset.days_at_location)
      : '',
    customerId || '',
    customerName || (customerId ? '' : 'Unassigned'),
    customer?.phone || asset?.customer_phone || '',
    formatExportDate(getDeliveredAtCustomerDate(asset)),
    asset?.dock_stock || '',
    formatExportDate(asset?.created_at),
    formatExportDate(updated),
  ];
}

export const ASSET_HISTORY_CSV_HEADERS = [
  'Asset ID',
  'Barcode',
  'Serial Number',
  'Timestamp',
  'Submitted',
  'Type / Action',
  'Source',
  'User',
  'Device',
  'Location / Customer',
  'Order',
  'Product Code',
  'Data',
  'Notes',
];

/**
 * Map a history log row (AssetHistory table shape or raw movement row) to CSV cells.
 */
export function historyRowToExportRow(row, asset = null) {
  const assetId = asset?.id || row?.associated_assets || row?.bottle_id || '';
  const barcode = asset?.barcode_number || row?.barcode_number || '';
  const serial = asset?.serial_number || row?.serial_number || '';
  const timestamp = row?.created_at || row?.timestamp || '';
  const submitted = row?.submitted_at || timestamp;
  const typeLabel = row?.type || row?.action || row?.mode || row?.history_type || '';
  const source = row?.history_type || '';
  const user =
    row?.user ||
    row?.scanned_by ||
    row?.user_name ||
    row?.filled_by ||
    row?.user_id ||
    '';
  const device = row?.device || row?.device_id || '';

  const customerId = row?.customer_id || row?.assigned_customer || '';
  const customerName = row?.customer_name || '';
  let location = row?.location || '';
  // Prefer already-formatted log location; otherwise build from customer / in-house location.
  if (!location || location === '-') {
    if (customerName || customerId) {
      location = customerName
        ? `Customer: ${customerName}${customerId ? ` (${customerId})` : ''}`
        : `Customer: (${customerId})`;
    } else if (row?.warehouse_location || row?.to_location) {
      location = row.warehouse_location || row.to_location;
    }
  }

  const order = row?.order_number || '';
  const product = row?.product_code || asset?.product_code || '';
  const data =
    row?.data ||
    [
      source ? `Source: ${source}` : null,
      order ? `Order: ${order}` : null,
      product ? `Product: ${product}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
  const notes = row?.notes || '';

  return [
    assetId,
    barcode,
    serial,
    formatExportDateTime(timestamp),
    formatExportDateTime(submitted),
    typeLabel,
    source,
    user,
    device,
    location,
    order,
    product,
    data,
    notes,
  ];
}

/**
 * Build a CSV string from a header row and data rows (arrays of cells).
 */
export function rowsToCsvString(headers, rows) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\n');
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Convenience: detail export for an array of bottle rows.
 */
export function downloadAssetsDetailCsv(assets, filenamePrefix = 'all-assets') {
  const rows = (assets || []).map(assetToDetailExportRow);
  const csv = rowsToCsvString(ASSET_DETAIL_CSV_HEADERS, rows);
  const date = new Date().toISOString().split('T')[0];
  downloadCsv(`${filenamePrefix}-${date}.csv`, csv);
}

/**
 * Convenience: history export for log rows belonging to one or more assets.
 */
export function downloadAssetHistoryCsv(historyRows, asset = null, filenamePrefix = 'asset-history') {
  const rows = (historyRows || []).map((row) => historyRowToExportRow(row, asset));
  const csv = rowsToCsvString(ASSET_HISTORY_CSV_HEADERS, rows);
  const date = new Date().toISOString().split('T')[0];
  const idPart =
    asset?.barcode_number ||
    asset?.serial_number ||
    asset?.id ||
    'export';
  downloadCsv(`${filenamePrefix}-${idPart}-${date}.csv`, csv);
}
