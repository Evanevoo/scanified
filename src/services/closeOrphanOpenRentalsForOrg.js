/**
 * Close open rental rows that bill a customer but inventory no longer assigns the bottle there
 * (returned to warehouse, transferred, stale assignment cleared, etc.).
 */

import logger from '../utils/logger';
import { fetchLatestReturnScanDatesByBarcode, toYmd } from './returnScanEndDate';

const norm = (v) => String(v || '').trim().toLowerCase();

function barcodeVariants(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return [];
  const out = new Set([s]);
  const noLead = s.replace(/^0+/, '') || '0';
  out.add(noLead);
  return [...out];
}

function indexBottlesForRentalLookup(bottles) {
  const byId = new Map();
  const byBarcode = new Map();
  for (const bottle of bottles || []) {
    const id = bottle?.id != null ? String(bottle.id).trim() : '';
    if (id) byId.set(id, bottle);
    for (const bc of barcodeVariants(bottle?.barcode_number || bottle?.barcode)) {
      byBarcode.set(bc, bottle);
    }
  }
  return { byId, byBarcode };
}

function findBottleForRental(rental, index) {
  const rid = rental?.bottle_id != null ? String(rental.bottle_id).trim() : '';
  if (rid && index.byId.has(rid)) return index.byId.get(rid);
  for (const bc of barcodeVariants(rental?.bottle_barcode)) {
    if (index.byBarcode.has(bc)) return index.byBarcode.get(bc);
  }
  return null;
}

function buildCustomerLookup(customers) {
  const byKey = new Map();
  for (const c of customers || []) {
    const listId = norm(c.CustomerListID);
    const name = norm(c.name || c.Name);
    const pk = norm(c.id);
    if (listId) byKey.set(listId, c);
    if (name) byKey.set(name, c);
    if (pk) byKey.set(pk, c);
  }
  return byKey;
}

/** All keys that identify the customer billed on this rental row. */
export function rentalCustomerMatchKeys(rental, customerLookup) {
  const keys = new Set();
  const add = (v) => {
    const k = norm(v);
    if (k) keys.add(k);
  };
  add(rental?.customer_id);
  add(rental?.customer_name);
  const hit =
    customerLookup.get(norm(rental?.customer_id)) ||
    customerLookup.get(norm(rental?.customer_name));
  if (hit) {
    add(hit.CustomerListID);
    add(hit.id);
    add(hit.name || hit.Name);
  }
  return keys;
}

export function bottleAssignedToRentalCustomer(bottle, rental, customerLookup) {
  const keys = rentalCustomerMatchKeys(rental, customerLookup);
  if (!keys.size) return false;
  const ac = norm(bottle?.assigned_customer);
  const cu = norm(bottle?.customer_uuid);
  const cn = norm(bottle?.customer_name);
  for (const k of keys) {
    if (k && (ac === k || cu === k || cn === k)) return true;
  }
  return false;
}

/** Open rental billing a customer while bottle is missing, unassigned, or assigned elsewhere. */
export function isOrphanOpenRental(rental, bottle, customerLookup) {
  if (!rental || rental.is_dns) return false;
  if (!bottle) return true;
  const st = norm(bottle?.status);
  // Returned / in-house inventory — stop billing even if assignment was not cleared on the row.
  if (st === 'empty' || st === 'available' || st === 'in_house' || st === 'in-house') {
    return true;
  }
  const assigned = norm(bottle.assigned_customer);
  const name = norm(bottle.customer_name);
  if (!assigned && !name) return true;
  return !bottleAssignedToRentalCustomer(bottle, rental, customerLookup);
}

/**
 * @returns {object[]} rentals to close (capped)
 */
export function findOrphanOpenRentalsToClose(
  openRentals,
  bottles,
  customers,
  maxCloses = 500,
) {
  const index = indexBottlesForRentalLookup(bottles);
  const customerLookup = buildCustomerLookup(customers);
  const out = [];
  for (const rental of openRentals || []) {
    if (rental?.is_dns) continue;
    const bottle = findBottleForRental(rental, index);
    if (!isOrphanOpenRental(rental, bottle, customerLookup)) continue;
    out.push(rental);
    if (out.length >= maxCloses) break;
  }
  return out;
}

function rentalBarcodeNorm(rental) {
  const bc = String(rental?.bottle_barcode || '').trim();
  return bc ? bc.replace(/^0+/, '') || '0' : '';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {{ openRentals?: object[], bottles?: object[], customers?: object[], maxCloses?: number, endDate?: string }} workspace
 * @returns {Promise<{ closed: number, errors: string[] }>}
 */
export async function closeOrphanOpenRentalsForOrg(
  supabaseClient,
  organizationId,
  workspace = {},
) {
  if (!organizationId || !supabaseClient) return { closed: 0, errors: [] };

  const maxCloses = Math.max(1, workspace.maxCloses ?? 500);
  const defaultEndDate = workspace.endDate || new Date().toISOString().split('T')[0];
  const toClose = findOrphanOpenRentalsToClose(
    workspace.openRentals,
    workspace.bottles,
    workspace.customers,
    maxCloses,
  );

  if (!toClose.length) return { closed: 0, errors: [] };

  const scanDates = await fetchLatestReturnScanDatesByBarcode(
    supabaseClient,
    organizationId,
    toClose.map((r) => r.bottle_barcode).filter(Boolean),
  );

  const errors = [];
  let closed = 0;
  const updatedAt = new Date().toISOString();

  for (const rental of toClose) {
    const id = rental?.id;
    if (!id) continue;
    const normBc = rentalBarcodeNorm(rental);
    const endDate = (normBc && scanDates.get(normBc)) || defaultEndDate;

    const { data, error } = await supabaseClient
      .from('rentals')
      .update({
        rental_end_date: toYmd(endDate) || defaultEndDate,
        updated_at: updatedAt,
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('rental_end_date', null)
      .select('id');

    if (error) {
      errors.push(error.message || String(error));
      logger.warn('closeOrphanOpenRentalsForOrg rental failed:', id, error);
      continue;
    }
    closed += (data || []).length;
  }

  if (closed > 0) {
    logger.log(`closeOrphanOpenRentalsForOrg: closed ${closed} orphan rental(s) for org ${organizationId}`);
  }

  return { closed, errors };
}
