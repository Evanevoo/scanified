/**
 * Create open rental rows for assigned bottles that have no matching open rental.
 * Same logic as Customer Detail on load — keeps Rentals "Items" in sync with inventory.
 */

import {
  isBottleLostForBilling,
  isCustomerOwnedForBilling,
} from './billingFromAssets';
import { fetchOrgRentalPricingContext, monthlyRateForNewRental } from '../utils/rentalPricing';

export function inferRentalStartDateFromBottle(bottle) {
  const toYmd = (v) => {
    if (v == null || v === '') return '';
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 10);
  };
  return (
    toYmd(bottle?.rental_start_date) ||
    toYmd(bottle?.created_at) ||
    toYmd(bottle?.last_location_update) ||
    toYmd(new Date().toISOString())
  );
}

const norm = (v) => String(v || '').trim().toLowerCase();

function resolveCustomerRecord(customers, assignedKey) {
  const key = norm(assignedKey);
  if (!key) return null;
  for (const c of customers || []) {
    if (norm(c.CustomerListID) === key || norm(c.id) === key) return c;
    const name = norm(c.name || c.Name);
    if (name && name === key) return c;
  }
  return null;
}

function indexOpenRentals(openRentals) {
  const bottleIds = new Set();
  const barcodes = new Set();
  for (const r of openRentals || []) {
    if (r?.bottle_id != null && String(r.bottle_id).trim() !== '') {
      bottleIds.add(String(r.bottle_id).trim());
    }
    const bc = String(r.bottle_barcode || '').trim().toUpperCase();
    if (bc) barcodes.add(bc);
    const noLead = bc.replace(/^0+/, '') || '';
    if (noLead && noLead !== bc) barcodes.add(noLead);
  }
  return { bottleIds, barcodes };
}

function bottleHasOpenRental(bottle, { bottleIds, barcodes }) {
  const bid = bottle?.id != null ? String(bottle.id).trim() : '';
  if (bid && bottleIds.has(bid)) return true;
  const bc = String(bottle.barcode_number || bottle.barcode || '').trim().toUpperCase();
  if (!bc) return false;
  if (barcodes.has(bc)) return true;
  const noLead = bc.replace(/^0+/, '') || '';
  return noLead ? barcodes.has(noLead) : false;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {{ bottles?: object[], openRentals?: object[], customers?: object[], maxInserts?: number }} workspace
 * @returns {Promise<{ inserted: number, errors: string[] }>}
 */
export async function backfillOpenRentalsForAssignedBottles(
  supabaseClient,
  organizationId,
  workspace = {},
) {
  if (!organizationId) return { inserted: 0, errors: [] };
  const maxInserts = Math.max(1, workspace.maxInserts ?? 500);
  const rentalIndex = indexOpenRentals(workspace.openRentals);
  const candidates = [];

  for (const bottle of workspace.bottles || []) {
    if (isCustomerOwnedForBilling(bottle)) continue;
    if (isBottleLostForBilling(bottle)) continue;
    const assigned = String(
      bottle.assigned_customer || bottle.customer_uuid || bottle.customer_id || '',
    ).trim();
    if (!assigned) continue;
    if (bottleHasOpenRental(bottle, rentalIndex)) continue;
    candidates.push(bottle);
    if (candidates.length >= maxInserts) break;
  }

  if (candidates.length === 0) return { inserted: 0, errors: [] };

  const pricingCtx = await fetchOrgRentalPricingContext(supabaseClient, organizationId);
  let inserted = 0;
  const errors = [];

  for (const bottle of candidates) {
    const assigned = String(
      bottle.assigned_customer || bottle.customer_uuid || bottle.customer_id || '',
    ).trim();
    const customer = resolveCustomerRecord(workspace.customers, assigned);
    const rentCustomerId = assigned || customer?.CustomerListID || customer?.id || '';
    const rentCustomerName =
      String(bottle.customer_name || '').trim() || customer?.name || customer?.Name || '';
    const barcode = String(bottle.barcode_number || bottle.barcode || '').trim();
    const pricingKey = customer?.CustomerListID || rentCustomerId;
    const rental_amount = monthlyRateForNewRental(pricingKey, bottle, pricingCtx);

    const { error } = await supabaseClient.from('rentals').insert({
      organization_id: organizationId,
      customer_id: rentCustomerId,
      customer_name: rentCustomerName,
      bottle_id: bottle.id ?? null,
      bottle_barcode: barcode || null,
      rental_start_date: inferRentalStartDateFromBottle(bottle),
      rental_end_date: null,
      rental_amount,
      rental_type: 'monthly',
      tax_rate: 0.11,
      location: bottle.location || 'SASKATOON',
      status: 'active',
      is_dns: false,
    });

    if (error) {
      errors.push(`${barcode || bottle.id}: ${error.message}`);
      continue;
    }
    inserted += 1;
    if (bottle.id) rentalIndex.bottleIds.add(String(bottle.id).trim());
    if (barcode) rentalIndex.barcodes.add(barcode.toUpperCase());
  }

  return { inserted, errors };
}
