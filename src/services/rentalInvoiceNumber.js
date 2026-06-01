/**
 * Single source of truth for rental invoice numbers:
 * read subscription_invoices / invoices → reserve via invoice_settings when missing.
 * No browser localStorage or sessionStorage counters.
 */

import {
  getNextInvoiceNumbers,
  resolveInvoiceNumberForRentalCycle,
} from '../utils/invoiceUtils';
import { getBillingPeriodForSub, getCurrentCycleRange } from '../utils/rentalBillingPeriod';

function subscriptionIdFromRow(sub) {
  const rawId = sub?.id;
  if (
    rawId == null
    || sub?.isVirtual
    || String(rawId).startsWith('virtual-')
    || String(rawId).startsWith('legacy-')
  ) {
    return '';
  }
  return String(rawId).trim();
}

async function lookupSubscriptionCycleInvoiceNumber(
  supabaseClient,
  organizationId,
  { subscriptionId, customerId, periodStart, periodEnd },
) {
  if (subscriptionId) {
    const { data: si } = await supabaseClient
      .from('subscription_invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .eq('subscription_id', subscriptionId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const n = String(si?.invoice_number || '').trim();
    if (n) return n;
  }
  if (customerId) {
    const { data: siByCustomer } = await supabaseClient
      .from('subscription_invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const n = String(siByCustomer?.invoice_number || '').trim();
    if (n) return n;
  }
  return null;
}

async function ensureVirtualInvoiceNumber(supabaseClient, organizationId, row, qbBillingMonthYm) {
  const { periodStart, periodEnd, dueDate } = getBillingPeriodForSub(row, {
    qbBillingMonthYm,
  });
  const cid = String(row?.customer_id || '').trim();
  if (!organizationId || !cid || !periodStart || !periodEnd) return null;

  const existing = await resolveInvoiceNumberForRentalCycle(
    supabaseClient,
    organizationId,
    row,
    qbBillingMonthYm,
  );
  if (existing) return existing;

  const today = new Date();
  const invoiceDate = today.toISOString().split('T')[0];
  const total = parseFloat(row?.totalPerCycle) || 0;
  const gstAmt = +(total * 0.05).toFixed(2);
  const pstAmt = +(total * 0.06).toFixed(2);
  const taxAmount = +(gstAmt + pstAmt).toFixed(2);
  const totalAmount = +(total + taxAmount).toFixed(2);

  const basePayload = {
    organization_id: organizationId,
    customer_id: cid,
    customer_name: row.customer?.name || row.customer?.Name || cid,
    period_start: periodStart,
    period_end: periodEnd,
    invoice_date: invoiceDate,
    due_date: dueDate || getCurrentCycleRange().dueDate,
    subtotal: total,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    status: 'pending',
  };

  let invoiceNumber = null;
  let lastErr = null;
  for (let i = 0; i < 3; i += 1) {
    const reserved = await getNextInvoiceNumbers(organizationId, 1, supabaseClient);
    invoiceNumber = reserved?.[0];
    if (!invoiceNumber) {
      throw new Error('Failed to reserve a unique invoice number. Please retry.');
    }
    const { error } = await supabaseClient.from('invoices').insert({
      ...basePayload,
      invoice_number: invoiceNumber,
    });
    if (!error) {
      lastErr = null;
      break;
    }
    lastErr = error;
    const isDuplicateInvoiceNumber =
      String(error?.code || '') === '23505'
      && String(error?.message || '').includes('invoices_org_invoice_number_unique');
    if (!isDuplicateInvoiceNumber) throw error;
    const race = await resolveInvoiceNumberForRentalCycle(
      supabaseClient,
      organizationId,
      row,
      qbBillingMonthYm,
    );
    if (race) return race;
  }
  if (lastErr) throw lastErr;
  return invoiceNumber;
}

async function ensureSubscriptionCycleInvoiceNumber(
  supabaseClient,
  organizationId,
  sub,
  qbBillingMonthYm,
) {
  const { periodStart, periodEnd } = getBillingPeriodForSub(sub, { qbBillingMonthYm });
  const { dueDate } = getBillingPeriodForSub(sub, { qbBillingMonthYm });
  const cid = String(sub?.customer_id || '').trim();
  const subId = subscriptionIdFromRow(sub);
  if (!organizationId || !cid || !subId || !periodStart || !periodEnd) return null;

  const existingNo = await lookupSubscriptionCycleInvoiceNumber(supabaseClient, organizationId, {
    subscriptionId: subId,
    customerId: cid,
    periodStart,
    periodEnd,
  });
  if (existingNo) return existingNo;

  const total = parseFloat(sub?.totalPerCycle) || 0;
  const gstAmt = +(total * 0.05).toFixed(2);
  const pstAmt = +(total * 0.06).toFixed(2);
  const taxAmount = +(gstAmt + pstAmt).toFixed(2);
  const totalAmount = +(total + taxAmount).toFixed(2);

  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reserved = await getNextInvoiceNumbers(organizationId, 1, supabaseClient);
    const invoiceNumber = reserved?.[0];
    if (!invoiceNumber) {
      throw new Error('Failed to reserve a unique invoice number. Please retry.');
    }
    const { error } = await supabaseClient.from('subscription_invoices').insert({
      organization_id: organizationId,
      subscription_id: subId,
      customer_id: cid,
      invoice_number: invoiceNumber,
      status: 'draft',
      period_start: periodStart,
      period_end: periodEnd,
      subtotal: total,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      due_date: dueDate || getCurrentCycleRange().dueDate,
    });
    if (!error) return invoiceNumber;
    lastErr = error;
    const raceNo = await lookupSubscriptionCycleInvoiceNumber(supabaseClient, organizationId, {
      subscriptionId: subId,
      customerId: cid,
      periodStart,
      periodEnd,
    });
    if (raceNo) return raceNo;
    if (String(error?.code || '') !== '23505') break;
  }
  if (lastErr) console.warn('ensureSubscriptionCycleInvoiceNumber:', lastErr);
  return null;
}

/**
 * Resolve invoice # for table, PDF, email, CSV — DB first, then reserve from invoice_settings.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {object} sub - Rentals grid row
 * @param {{ qbBillingMonthYm?: string, reserveIfMissing?: boolean }} [options]
 * @returns {Promise<string|null>}
 */
export async function resolveRentalInvoiceNumber(
  supabaseClient,
  organizationId,
  sub,
  options = {},
) {
  const qbBillingMonthYm = options.qbBillingMonthYm ?? 'live';
  const reserveIfMissing = options.reserveIfMissing !== false;

  let invNo = await resolveInvoiceNumberForRentalCycle(
    supabaseClient,
    organizationId,
    sub,
    qbBillingMonthYm,
  );
  if (invNo) return String(invNo).trim();
  if (!reserveIfMissing || !organizationId) return null;

  if (sub?.isVirtual) {
    const v = await ensureVirtualInvoiceNumber(
      supabaseClient,
      organizationId,
      sub,
      qbBillingMonthYm,
    );
    return v ? String(v).trim() : null;
  }

  const ensured = await ensureSubscriptionCycleInvoiceNumber(
    supabaseClient,
    organizationId,
    sub,
    qbBillingMonthYm,
  );
  return ensured ? String(ensured).trim() : null;
}

/** Pre-resolve invoice_number on export rows (table order). Throws if any row cannot get a number. */
export async function attachInvoiceNumbersToExportRows(
  supabaseClient,
  organizationId,
  rows,
  options = {},
) {
  const out = [];
  const missing = [];
  for (const row of rows || []) {
    const invoice_number = await resolveRentalInvoiceNumber(
      supabaseClient,
      organizationId,
      row,
      options,
    );
    if (!invoice_number) {
      const label = row.customer?.name || row.customer?.Name || row.customer_id || 'Customer';
      missing.push(label);
    }
    out.push({ ...row, invoice_number: invoice_number || '' });
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing invoice number for ${missing.length} customer(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}. Run Prep # first.`,
    );
  }
  return out;
}
