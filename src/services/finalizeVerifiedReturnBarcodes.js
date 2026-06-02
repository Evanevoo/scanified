/**
 * After order verify/approve: always stop billing for RETURN barcodes.
 * RPC or legacy paths may clear inventory without closing rentals (barcode mismatch, FK fallback, etc.).
 */

import logger from '../utils/logger';
import { findBottleRowByScanIdentifier } from '../utils/findBottleByScanIdentifier';
import { resolveCustomerListId } from '../utils/resolveCustomerListId';
import { closeOpenRentalsForBottle } from './closeOpenRentalsForBottle';
import { resolveReturnEndDateForBarcode } from './returnScanEndDate';

const norm = (v) => String(v || '').trim().toLowerCase();

function bottleStillOnCustomer(bottle, customerKeys) {
  if (!bottle || !customerKeys.size) return false;
  const ac = norm(bottle.assigned_customer);
  const cu = norm(bottle.customer_uuid);
  const cn = norm(bottle.customer_name);
  for (const k of customerKeys) {
    if (k && (ac === k || cu === k || cn === k)) return true;
  }
  return false;
}

async function buildCustomerKeys(supabase, organizationId, customerId, customerName) {
  const customerKeys = new Set();
  const addKey = (v) => {
    const k = norm(v);
    if (k) customerKeys.add(k);
  };
  addKey(customerId);
  addKey(customerName);

  try {
    const resolved =
      (customerId && (await resolveCustomerListId(supabase, organizationId, customerId))) ||
      (customerName && (await resolveCustomerListId(supabase, organizationId, customerName))) ||
      null;
    if (resolved) {
      addKey(resolved.customerListId);
      addKey(resolved.id);
      addKey(resolved.name);
    }
  } catch (err) {
    logger.warn('finalizeVerifiedReturnBarcodes: resolve customer', err);
  }

  return customerKeys;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {{ returnBarcodes?: string[], customerId?: string|null, customerName?: string|null, orderNumber?: string|null, endDate?: string|null }} params
 * @returns {Promise<{ rentalsClosed: number, bottlesUnassigned: number }>}
 */
export async function finalizeVerifiedReturnBarcodes(supabase, organizationId, params = {}) {
  const barcodes = [...new Set((params.returnBarcodes || []).map((b) => String(b || '').trim()).filter(Boolean))];
  if (!barcodes.length || !organizationId) {
    return { rentalsClosed: 0, bottlesUnassigned: 0 };
  }

  const customerKeys = await buildCustomerKeys(
    supabase,
    organizationId,
    params.customerId,
    params.customerName,
  );
  const customerKeysList = [...customerKeys];

  let rentalsClosed = 0;
  let bottlesUnassigned = 0;

  for (const bc of barcodes) {
    const bottle = await findBottleRowByScanIdentifier(supabase, organizationId, bc);
    const canonicalBc = String(bottle?.barcode_number || bc).trim();
    const endDate = await resolveReturnEndDateForBarcode(supabase, organizationId, canonicalBc, {
      orderNumber: params.orderNumber,
      fallbackEndDate: params.endDate,
    });

    try {
      rentalsClosed += await closeOpenRentalsForBottle(supabase, organizationId, {
        bottleId: bottle?.id,
        barcode: canonicalBc,
        closedByOrder: params.orderNumber,
        endDate,
        customerKeys: customerKeysList,
      });
    } catch (closeErr) {
      logger.warn('finalizeVerifiedReturnBarcodes: close rentals failed', canonicalBc, closeErr);
    }

    if (!bottle) continue;

    if (bottleStillOnCustomer(bottle, customerKeys)) {
      const { error: upe } = await supabase
        .from('bottles')
        .update({
          assigned_customer: null,
          customer_name: null,
          customer_uuid: null,
          status: 'empty',
          location: 'In House',
          rental_start_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bottle.id)
        .eq('organization_id', organizationId);
      if (upe) {
        logger.warn('finalizeVerifiedReturnBarcodes: unassign failed', canonicalBc, upe.message);
      } else {
        bottlesUnassigned += 1;
      }
    }
  }

  return { rentalsClosed, bottlesUnassigned };
}
