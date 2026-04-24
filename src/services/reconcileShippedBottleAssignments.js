import logger from '../utils/logger';
import { fetchOrgRentalPricingContext, monthlyRateForNewRental } from './rentalPricingContext';
import { resolveCustomerListId } from '../utils/resolveCustomerListId';

function toIsoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    const month = usDate[1].padStart(2, '0');
    const day = usDate[2].padStart(2, '0');
    return `${usDate[3]}-${month}-${day}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function daysBetweenIsoDates(startIsoDate, endIsoDate) {
  const start = new Date(`${startIsoDate}T00:00:00Z`);
  const end = new Date(`${endIsoDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function assignmentMatchesVerifyTarget(bottle, targetCustomerId, targetCustomerName) {
  const tid = String(targetCustomerId || '').trim();
  const tname = String(targetCustomerName || '').trim().toLowerCase();
  const ac = String(bottle.assigned_customer || '').trim();
  const cn = String(bottle.customer_name || '').trim().toLowerCase();
  if (tid && ac === tid) return true;
  if (tname && cn === tname) return true;
  if (tid && tname && ac === tname) return true;
  return false;
}

/**
 * After verify/RPC, ensure each SHIP barcode is assigned to the verify customer.
 * Closes orphaned open rentals and updates bottles that were still on a prior customer (e.g. no return scan).
 */
export async function reconcileShippedBottleAssignments(supabase, params) {
  const {
    organizationId,
    shipBarcodes,
    customerId,
    customerName,
    orderNumber = null,
    effectiveDate = null,
  } = params;

  if (!organizationId || !shipBarcodes?.length) return [];

  const warnings = [];
  const today = new Date().toISOString().split('T')[0];
  const shipmentDate = toIsoDate(effectiveDate) || today;
  const daysAtLocation = daysBetweenIsoDates(shipmentDate, today);
  const pricingCtx = await fetchOrgRentalPricingContext(supabase, organizationId);
  let assignId = customerId != null && String(customerId).trim() !== '' ? String(customerId).trim() : null;
  let assignName = String(customerName || '').trim();
  // Always try to resolve to a CustomerListID so bottles.assigned_customer and rentals.customer_id
  // use the same identifier the rest of the app queries by.
  const resolved =
    (await resolveCustomerListId(supabase, organizationId, assignId)) ||
    (await resolveCustomerListId(supabase, organizationId, assignName));
  if (resolved?.customerListId) {
    assignId = resolved.customerListId;
    if (!assignName) assignName = resolved.name || '';
  }
  const assignedCustomerValue = assignId || assignName;

  for (const rawBc of shipBarcodes) {
    const barcode = String(rawBc || '').trim();
    if (!barcode) continue;

    const { data: bottles, error } = await supabase
      .from('bottles')
      .select(
        'id, barcode_number, assigned_customer, customer_name, status, location, product_code, category, rental_class_id, rental_class_key, description, type'
      )
      .eq('organization_id', organizationId)
      .eq('barcode_number', barcode)
      .limit(1);

    if (error) {
      logger.warn('reconcileShippedBottleAssignments: fetch bottle', barcode, error);
      continue;
    }
    const bottle = bottles?.[0];
    if (!bottle) continue;

    if (assignmentMatchesVerifyTarget(bottle, assignId, assignName)) {
      const { error: syncErr } = await supabase
        .from('bottles')
        .update({
          days_at_location: daysAtLocation,
          last_location_update: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bottle.id)
        .eq('organization_id', organizationId);
      if (syncErr) {
        logger.warn('reconcileShippedBottleAssignments: sync location days', barcode, syncErr);
      }
      continue;
    }

    const prev =
      (bottle.customer_name && String(bottle.customer_name).trim()) ||
      String(bottle.assigned_customer || '').trim() ||
      'prior customer';

    warnings.push(
      `${barcode}: was still assigned (${prev}); reassigned to ${assignName || assignedCustomerValue} (SHIP verify — prior return may be missing).`
    );

    const orFilter = `bottle_id.eq.${bottle.id},bottle_barcode.eq.${bottle.barcode_number}`;
    const { error: closeErr } = await supabase
      .from('rentals')
      .update({ rental_end_date: today, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .is('rental_end_date', null)
      .or(orFilter);

    if (closeErr) {
      logger.warn('reconcileShippedBottleAssignments: close rentals', barcode, closeErr);
    }

    const { error: updErr } = await supabase
      .from('bottles')
      .update({
        previous_assigned_customer: bottle.assigned_customer,
        assigned_customer: assignedCustomerValue,
        customer_name: assignName || bottle.customer_name,
        status: 'rented',
        days_at_location: daysAtLocation,
        last_location_update: today,
        rental_order_number: orderNumber,
        last_verified_order: orderNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bottle.id)
      .eq('organization_id', organizationId);

    if (updErr) {
      logger.error('reconcileShippedBottleAssignments: update bottle', barcode, updErr);
      continue;
    }

    const { data: stillOpen } = await supabase
      .from('rentals')
      .select('id')
      .eq('organization_id', organizationId)
      .is('rental_end_date', null)
      .or(`bottle_id.eq.${bottle.id},bottle_barcode.eq.${barcode}`)
      .limit(1);

    if (stillOpen?.length) continue;

    const rentalAmount = assignId
      ? monthlyRateForNewRental(assignId, bottle, pricingCtx)
      : monthlyRateForNewRental(assignedCustomerValue, bottle, pricingCtx);

    const insertPayload = {
      organization_id: organizationId,
      bottle_id: bottle.id,
      bottle_barcode: bottle.barcode_number,
      customer_id: assignedCustomerValue,
      customer_name: assignName || 'Customer',
      rental_start_date: shipmentDate,
      rental_end_date: null,
      rental_amount: rentalAmount,
      rental_type: 'monthly',
      tax_code: 'GST+PST',
      tax_rate: 0.11,
      location: bottle.location || 'SASKATOON',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (orderNumber != null) insertPayload.rental_order_number = orderNumber;

    const { error: insErr } = await supabase.from('rentals').insert(insertPayload);
    if (insErr) {
      logger.warn('reconcileShippedBottleAssignments: insert rental', barcode, insErr);
    }
  }

  return warnings;
}
