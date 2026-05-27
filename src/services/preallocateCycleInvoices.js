/**
 * Reserve sequential invoice numbers (invoice_settings counter) for each billable
 * customer before month-end / month-start billing runs.
 */

import { getNextInvoiceNumbers, resolveInvoiceNumberForRentalPdf } from '../utils/invoiceUtils';
import { getCurrentCycleRange, getPeriodForCyclePrep } from '../utils/rentalBillingPeriod';
import {
  buildAssetPricingMap,
  buildClassificationNodesById,
  buildCustomerOverrideMap,
  computeSubscriptionBillingCycleTotal,
  defaultUnitRatesFromAssetPricingTable,
  flattenCustomerPricingRowsToLegacyOverrides,
} from './pricingResolution';
function isMissingTable(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache');
}

function taxFromSubtotal(subtotal) {
  const s = Math.max(0, Number(subtotal) || 0);
  const gst = +(s * 0.05).toFixed(2);
  const pst = +(s * 0.06).toFixed(2);
  const tax = +(gst + pst).toFixed(2);
  return { gst, pst, tax, total: +(s + tax).toFixed(2) };
}

async function loadPricingContext(supabase, organizationId) {
  const [
    { data: assetRows },
    { data: overrideRows },
    { data: legacyRows },
    { data: classificationNodes },
  ] = await Promise.all([
    supabase.from('asset_type_pricing').select('*').eq('organization_id', organizationId),
    supabase.from('customer_pricing_overrides').select('*').eq('organization_id', organizationId),
    supabase.from('customer_pricing').select('*').eq('organization_id', organizationId),
    supabase.from('asset_classification_nodes').select('*').eq('organization_id', organizationId),
  ]);

  const assetPricingMap = buildAssetPricingMap(assetRows || []);
  const { defaultMonthly, defaultYearly } = defaultUnitRatesFromAssetPricingTable(assetRows || []);
  const customerOverrideMap = buildCustomerOverrideMap([
    ...flattenCustomerPricingRowsToLegacyOverrides(overrideRows || []),
    ...(legacyRows || []),
  ]);
  const classificationNodesById = buildClassificationNodesById(classificationNodes || []);

  return {
    customerOverrideMap,
    assetPricingMap,
    defaultMonthly,
    defaultYearly,
    classificationNodes: classificationNodes || [],
    classificationNodesById,
  };
}

function resolveCustomerRecord(customers, customerId) {
  const cid = String(customerId || '').trim();
  if (!cid) return null;
  for (const c of customers || []) {
    if (String(c.id || '').trim() === cid || String(c.CustomerListID || '').trim() === cid) {
      return c;
    }
  }
  return { id: cid, CustomerListID: cid, name: cid, Name: cid, billing_mode: 'rental' };
}

function collectBillableCustomerIds(customers, rentals, bottles) {
  const ids = new Set();
  for (const c of customers || []) {
    const id = String(c.CustomerListID || c.id || '').trim();
    if (id) ids.add(id);
  }
  for (const r of rentals || []) {
    const id = String(r.customer_id || '').trim();
    if (id) ids.add(id);
  }
  for (const b of bottles || []) {
    const id = String(b.assigned_customer || b.customer_id || '').trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

async function ensureDraftInvoiceForCustomer(
  supabase,
  organizationId,
  {
    customerId,
    customerRecord,
    subscriptionId,
    periodStart,
    periodEnd,
    dueDate,
    subtotal,
    billingPeriod,
  },
) {
  const subStub = {
    customer_id: customerId,
    id: subscriptionId || `virtual-${customerId}`,
    isVirtual: !subscriptionId,
    billing_period: billingPeriod || 'monthly',
    organization_id: organizationId,
  };

  const existing = await resolveInvoiceNumberForRentalPdf(
    supabase,
    organizationId,
    subStub,
    periodStart,
    periodEnd,
  );
  if (existing) return { invoiceNumber: existing, created: false };

  const { tax, total } = taxFromSubtotal(subtotal);
  const customerName =
    customerRecord?.name || customerRecord?.Name || customerId;

  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reserved = await getNextInvoiceNumbers(organizationId, 1, supabase);
    const invoiceNumber = reserved?.[0];
    if (!invoiceNumber) {
      throw new Error('Failed to reserve invoice number');
    }

    if (subscriptionId) {
      const { error: siErr } = await supabase.from('subscription_invoices').insert({
        organization_id: organizationId,
        subscription_id: subscriptionId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        status: 'draft',
        period_start: periodStart,
        period_end: periodEnd,
        subtotal: Math.max(0, subtotal),
        tax_amount: tax,
        total_amount: total,
        due_date: dueDate,
      });
      if (!siErr) return { invoiceNumber, created: true };
      if (!isMissingTable(siErr) && String(siErr.code || '') !== '23505') {
        lastErr = siErr;
        break;
      }
      if (String(siErr.code || '') === '23505') {
        const again = await resolveInvoiceNumberForRentalPdf(
          supabase,
          organizationId,
          subStub,
          periodStart,
          periodEnd,
        );
        if (again) return { invoiceNumber: again, created: false };
      }
    }

    const { error: invErr } = await supabase.from('invoices').insert({
      organization_id: organizationId,
      customer_id: customerId,
      customer_name: customerName,
      period_start: periodStart,
      period_end: periodEnd,
      invoice_date: periodEnd,
      due_date: dueDate,
      subtotal: Math.max(0, subtotal),
      tax_amount: tax,
      total_amount: total,
      invoice_number: invoiceNumber,
      status: 'pending',
    });

    if (!invErr) return { invoiceNumber, created: true };
    lastErr = invErr;
    if (isMissingTable(invErr)) throw invErr;
    if (String(invErr.code || '') === '23505') {
      const again = await resolveInvoiceNumberForRentalPdf(
        supabase,
        organizationId,
        subStub,
        periodStart,
        periodEnd,
      );
      if (again) return { invoiceNumber: again, created: false };
    }
  }

  if (lastErr) throw lastErr;
  return { invoiceNumber: null, created: false };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {{ force?: boolean, now?: Date, minSubtotal?: number }} [options]
 */
export async function preallocateCycleInvoicesForOrganization(supabase, organizationId, options = {}) {
  const periodMeta = getPeriodForCyclePrep(options.now, { force: options.force });
  if (!periodMeta?.periodStart || !periodMeta?.periodEnd) {
    return {
      skipped: true,
      reason: 'not_cycle_prep_day',
      hint: 'Runs automatically on the last day and first day of each month, or use force/manual.',
    };
  }

  const { periodStart, periodEnd, dueDate, trigger } = periodMeta;
  const minSubtotal = options.minSubtotal != null ? options.minSubtotal : 0.01;

  const [
    { data: customers, error: cErr },
    { data: bottles, error: bErr },
    { data: rentals, error: rErr },
    subRes,
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('organization_id', organizationId),
    supabase.from('bottles').select('*').eq('organization_id', organizationId),
    supabase.from('rentals').select('*').eq('organization_id', organizationId).is('rental_end_date', null),
    supabase
      .from('subscriptions')
      .select('id, customer_id, billing_period, status')
      .eq('organization_id', organizationId),
  ]);

  if (cErr) throw cErr;
  if (bErr) throw bErr;
  if (rErr) throw rErr;

  let subscriptions = [];
  if (!isMissingTable(subRes.error)) {
    if (subRes.error) throw subRes.error;
    subscriptions = subRes.data || [];
  }

  const pricingCtx = await loadPricingContext(supabase, organizationId);
  const billingData = {
    bottles: bottles || [],
    rentals: rentals || [],
    leaseContracts: [],
    leaseContractItems: [],
    useLeaseContractIfPresent: true,
  };

  const subByCustomer = new Map();
  for (const s of subscriptions || []) {
    if (String(s.status || '').toLowerCase() !== 'active') continue;
    const cid = String(s.customer_id || '').trim();
    if (cid) subByCustomer.set(cid, s);
  }

  const customerIds = collectBillableCustomerIds(customers, rentals, bottles);
  let created = 0;
  let already = 0;
  let skippedZero = 0;
  const errors = [];

  for (const customerId of customerIds) {
    try {
      const customerRecord = resolveCustomerRecord(customers, customerId);
      const subRow = subByCustomer.get(customerId);
      const subStub = {
        customer_id: customerId,
        id: subRow?.id,
        billing_period: subRow?.billing_period || 'monthly',
        organization_id: organizationId,
      };

      const total = computeSubscriptionBillingCycleTotal(
        subStub,
        customerRecord,
        pricingCtx,
        billingData,
      );

      if (!Number.isFinite(total) || total < minSubtotal) {
        skippedZero += 1;
        continue;
      }

      const result = await ensureDraftInvoiceForCustomer(supabase, organizationId, {
        customerId,
        customerRecord,
        subscriptionId: subRow?.id || null,
        periodStart,
        periodEnd,
        dueDate: dueDate || getCurrentCycleRange(options.now).dueDate,
        subtotal: total,
        billingPeriod: subStub.billing_period,
      });

      if (result.created) created += 1;
      else if (result.invoiceNumber) already += 1;
    } catch (e) {
      errors.push({ customerId, message: e?.message || String(e) });
    }
  }

  return {
    skipped: false,
    organizationId,
    periodStart,
    periodEnd,
    dueDate,
    trigger,
    created,
    alreadyHadNumber: already,
    skippedZeroSubtotal: skippedZero,
    candidates: customerIds.length,
    errors,
  };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function preallocateCycleInvoicesAllOrganizations(supabase, options = {}) {
  const { data: orgs, error } = await supabase.from('organizations').select('id, name');
  if (error) throw error;

  const results = [];
  for (const org of orgs || []) {
    try {
      const r = await preallocateCycleInvoicesForOrganization(supabase, org.id, options);
      results.push({ organizationId: org.id, name: org.name, ...r });
    } catch (e) {
      results.push({
        organizationId: org.id,
        name: org.name,
        error: e?.message || String(e),
      });
    }
  }
  return results;
}
