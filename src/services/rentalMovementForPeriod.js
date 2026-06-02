/**
 * Map Customer Rental History aggregates to invoice line product keys for PDF movement grid.
 */

import { computeCustomerRentalHistory } from './customerRentalHistory';
import { assetCodeMatchesInvoiceLineKey } from '../utils/rentalInvoicePdf';

function normProductKey(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * @returns {Map<string, { ship: number, rtn: number, end: number, start: number }>}
 */
export function buildMovementByLineKeyFromCustomerHistory({
  rentals = [],
  bottles = [],
  customerRecord,
  allCustomers = [],
  periodStart,
  periodEnd,
}) {
  const history = computeCustomerRentalHistory({
    rentals,
    bottles,
    customerRecord,
    allCustomers,
    periodStart,
    periodEnd,
  });
  const rows = history?.rows
    ? history.rows
    : (Array.isArray(history) ? history : []);

  const out = new Map();
  for (const row of rows || []) {
    const code = normProductKey(row.productCode);
    if (!code || code === '__unclassified__') continue;
    out.set(code, {
      ship: row.ship || 0,
      rtn: row.rtn || 0,
      end: row.endCount || 0,
      start: row.startCount || 0,
    });
    for (const [key, val] of out.entries()) {
      if (key === code) continue;
      if (assetCodeMatchesInvoiceLineKey(code, key) || assetCodeMatchesInvoiceLineKey(key, code)) {
        const prev = out.get(key) || { ship: 0, rtn: 0, end: 0, start: 0 };
        out.set(key, {
          ship: prev.ship + (row.ship || 0),
          rtn: prev.rtn + (row.rtn || 0),
          end: prev.end + (row.endCount || 0),
          start: prev.start + (row.startCount || 0),
        });
      }
    }
  }

  return out;
}

/**
 * Resolve movement counts for an invoice line from CRH map (first matching product key).
 */
export function movementFromCustomerHistoryForLine(line, movementByLineKey) {
  if (!movementByLineKey?.size) return null;
  const keys = new Set();
  const add = (v) => {
    const k = normProductKey(v);
    if (k) keys.add(k);
  };
  add(line?.description);
  add(line?.product_code);

  for (const key of keys) {
    if (movementByLineKey.has(key)) return movementByLineKey.get(key);
    for (const [mapKey, val] of movementByLineKey.entries()) {
      if (assetCodeMatchesInvoiceLineKey(key, mapKey) || assetCodeMatchesInvoiceLineKey(mapKey, key)) {
        return val;
      }
    }
  }
  return null;
}
