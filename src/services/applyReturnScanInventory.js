/**
 * Apply inventory changes when a bottle is scanned RETURN — immediate unassign,
 * independent of import order verification (matches mobile scan behavior).
 */

import logger from '../utils/logger';
import { findBottleRowByScanIdentifier } from '../utils/findBottleByScanIdentifier';
import { closeOpenRentalsForBottle } from './closeOpenRentalsForBottle';

function bottleStillOutOnCustomer(bottle) {
  if (!bottle) return false;
  const assigned = String(bottle.assigned_customer || bottle.customer_uuid || '').trim();
  const name = String(bottle.customer_name || '').trim();
  const st = String(bottle.status || '').toLowerCase();
  if (assigned || name) return true;
  return st === 'rented' || st === 'delivered';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {{ barcode: string, orderNumber?: string|null, location?: string|null, endDate?: string|null }} params
 * @returns {Promise<{ updated: boolean, barcode?: string, reason?: string }>}
 */
export async function applyReturnScanInventory(supabase, organizationId, params = {}) {
  const barcode = String(params.barcode || '').trim();
  if (!barcode || !organizationId) {
    return { updated: false, reason: 'missing_params' };
  }

  const bottle = await findBottleRowByScanIdentifier(supabase, organizationId, barcode);
  if (!bottle) {
    return { updated: false, reason: 'bottle_not_found' };
  }

  const canonicalBc = String(bottle.barcode_number || barcode).trim();
  const endDate = params.endDate || new Date().toISOString().split('T')[0];

  try {
    await closeOpenRentalsForBottle(supabase, organizationId, {
      bottleId: bottle.id,
      barcode: canonicalBc,
      endDate,
      closedByOrder: params.orderNumber != null ? String(params.orderNumber).trim() : null,
    });
  } catch (closeErr) {
    logger.warn('applyReturnScanInventory: close rentals', canonicalBc, closeErr);
  }

  if (!bottleStillOutOnCustomer(bottle)) {
    return { updated: false, barcode: canonicalBc, reason: 'already_in_house' };
  }

  const { error } = await supabase
    .from('bottles')
    .update({
      previous_assigned_customer: bottle.assigned_customer,
      previous_status: bottle.status,
      assigned_customer: null,
      customer_name: null,
      customer_uuid: null,
      status: 'empty',
      location: String(params.location || '').trim() || 'In House',
      days_at_location: 0,
      rental_start_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bottle.id)
    .eq('organization_id', organizationId);

  if (error) {
    logger.warn('applyReturnScanInventory: update bottle', canonicalBc, error.message);
    return { updated: false, barcode: canonicalBc, reason: error.message };
  }

  return { updated: true, barcode: canonicalBc };
}
