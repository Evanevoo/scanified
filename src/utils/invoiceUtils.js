/**
 * Invoice utilities: number generation from invoice_settings, CSV export helpers
 */
import { supabase } from '../supabase/client';
import logger from './logger';
import { getBillingPeriodForSub } from './rentalBillingPeriod';

function distinctBillingPeriodPairs(periods) {
  const seen = new Set();
  const out = [];
  for (const p of periods) {
    const ps = String(p?.periodStart || '').trim();
    const pe = String(p?.periodEnd || '').trim();
    if (!ps || !pe) continue;
    const k = `${ps}\t${pe}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ periodStart: ps, periodEnd: pe });
  }
  return out;
}

function mergeCycleInvoiceEntry(prev, incoming) {
  if (!prev) return incoming;
  const pSent = prev.status === 'sent';
  const iSent = incoming.status === 'sent';
  if (iSent) return incoming;
  if (pSent) return prev;
  const pt = new Date(prev.updated_at || 0).getTime();
  const it = new Date(incoming.updated_at || 0).getTime();
  return it >= pt ? incoming : prev;
}

function appendPeriodFilterToQuery(query, periodPairs) {
  if (!periodPairs?.length) return query;
  if (periodPairs.length === 1) {
    return query
      .eq('period_start', periodPairs[0].periodStart)
      .eq('period_end', periodPairs[0].periodEnd);
  }
  const orExpr = periodPairs
    .map((p) => `and(period_start.eq.${p.periodStart},period_end.eq.${p.periodEnd})`)
    .join(',');
  return query.or(orExpr);
}

/** Empty lookup maps for Rentals Invoice # column. */
export function emptyCycleInvoiceLookup() {
  return { byCustomerId: {}, bySubscriptionId: {} };
}

/**
 * Batch-load cycle invoice numbers for the Rentals table (same tables as resolveInvoiceNumberForRentalPdf).
 */
export async function loadRentalCycleInvoiceLookup(
  supabaseClient,
  organizationId,
  { customerIds = [], subscriptionIds = [], periodPairs = [], virtualCycle = null } = {},
) {
  const mapByCustomer = {};
  const mapBySubscription = {};
  if (!organizationId) return emptyCycleInvoiceLookup();

  const applySubInvRows = (rows) => {
    for (const row of rows || []) {
      const incoming = {
        invoice_number: row.invoice_number,
        status: String(row.status || '').toLowerCase(),
        updated_at: row.updated_at || null,
      };
      const ck = String(row.customer_id || '').trim();
      if (ck) {
        mapByCustomer[ck] = mergeCycleInvoiceEntry(mapByCustomer[ck], incoming);
      }
      const sid = String(row.subscription_id || '').trim();
      if (sid) {
        mapBySubscription[sid] = mergeCycleInvoiceEntry(mapBySubscription[sid], incoming);
      }
    }
  };

  const uniqueCustomerIds = [...new Set(customerIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const uniqueSubIds = [...new Set(subscriptionIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const pairs = distinctBillingPeriodPairs(periodPairs);

  if (
    uniqueCustomerIds.length > 0
    && virtualCycle?.periodStart
    && virtualCycle?.periodEnd
  ) {
    const { data } = await supabaseClient
      .from('invoices')
      .select('customer_id, invoice_number, status, created_at')
      .eq('organization_id', organizationId)
      .eq('period_start', virtualCycle.periodStart)
      .eq('period_end', virtualCycle.periodEnd)
      .in('customer_id', uniqueCustomerIds);
    for (const row of data || []) {
      const key = String(row.customer_id || '').trim();
      if (!key) continue;
      mapByCustomer[key] = {
        invoice_number: row.invoice_number,
        status: String(row.status || '').toLowerCase(),
        updated_at: row.created_at || null,
      };
    }
  }

  const subInvSelect =
    'subscription_id, customer_id, invoice_number, status, updated_at, period_start, period_end';

  if (uniqueSubIds.length > 0 && pairs.length > 0) {
    let q = supabaseClient
      .from('subscription_invoices')
      .select(subInvSelect)
      .eq('organization_id', organizationId)
      .in('subscription_id', uniqueSubIds);
    q = appendPeriodFilterToQuery(q, pairs);
    const { data } = await q;
    applySubInvRows(data);
  }

  if (uniqueCustomerIds.length > 0 && pairs.length > 0) {
    let q = supabaseClient
      .from('subscription_invoices')
      .select(subInvSelect)
      .eq('organization_id', organizationId)
      .in('customer_id', uniqueCustomerIds);
    q = appendPeriodFilterToQuery(q, pairs);
    const { data } = await q;
    applySubInvRows(data);
  }

  return { byCustomerId: mapByCustomer, bySubscriptionId: mapBySubscription };
}

/**
 * Read saved invoice # for a billing cycle (tries QB month period, then live cycle).
 */
export async function resolveInvoiceNumberForRentalCycle(
  supabaseClient,
  organizationId,
  sub,
  qbBillingMonthYm = 'live',
) {
  if (!organizationId) return null;
  const primary = getBillingPeriodForSub(sub, { qbBillingMonthYm });
  const periods = distinctBillingPeriodPairs([primary]);
  if (String(qbBillingMonthYm || 'live').trim().toLowerCase() !== 'live') {
    const live = getBillingPeriodForSub(sub, { qbBillingMonthYm: 'live' });
    for (const p of distinctBillingPeriodPairs([live])) {
      if (!periods.some((x) => x.periodStart === p.periodStart && x.periodEnd === p.periodEnd)) {
        periods.push(p);
      }
    }
  }
  for (const { periodStart, periodEnd } of periods) {
    const n = await resolveInvoiceNumberForRentalPdf(
      supabaseClient,
      organizationId,
      sub,
      periodStart,
      periodEnd,
    );
    if (n) return n;
  }
  return null;
}

/**
 * Reuse an invoice # already stored for this customer + billing cycle so PDF download / email
 * previews do not reserve a new W0000x on every click (invoice_settings counter kept for real inserts).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {{ customer_id?: string, id?: string, isVirtual?: boolean }} sub
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd - YYYY-MM-DD
 * @returns {Promise<string|null>}
 */
export async function resolveInvoiceNumberForRentalPdf(supabaseClient, organizationId, sub, periodStart, periodEnd) {
  const cid = String(sub?.customer_id || '').trim();
  if (!cid || !organizationId || !periodStart || !periodEnd) return null;

  const { data: inv } = await supabaseClient
    .from('invoices')
    .select('invoice_number')
    .eq('organization_id', organizationId)
    .eq('customer_id', cid)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle();
  if (inv?.invoice_number) return String(inv.invoice_number).trim();

  const rawId = sub?.id;
  const subId =
    rawId != null
    && !sub?.isVirtual
    && !String(rawId).startsWith('virtual-')
    && !String(rawId).startsWith('legacy-')
      ? String(rawId).trim()
      : '';
  if (subId) {
    const { data: si } = await supabaseClient
      .from('subscription_invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .eq('subscription_id', subId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (si?.invoice_number) return String(si.invoice_number).trim();
  }

  // Rentals table also keys by customer_id; subscription_id on the row may not match prep # rows.
  const { data: siByCustomer } = await supabaseClient
    .from('subscription_invoices')
    .select('invoice_number')
    .eq('organization_id', organizationId)
    .eq('customer_id', cid)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (siByCustomer?.invoice_number) return String(siByCustomer.invoice_number).trim();

  return null;
}

/**
 * Reserve a block of sequential invoice numbers from invoice_settings (W00000, W00001, ...).
 * Uses client-side compare-and-swap on invoice_settings and trusts next_invoice_number directly.
 * This keeps numbering aligned to your configured counter without jumping to historical max values.
 * @param {string} organizationId
 * @param {number} count - Number of invoice numbers to reserve
 * @returns {Promise<string[]>} Array of formatted invoice numbers (e.g. ['W00000','W00001',...])
 */
export async function getNextInvoiceNumbers(organizationId, count, supabaseClient) {
  if (!organizationId || count < 1) return [];
  const db = supabaseClient || supabase;
  return fallbackGetNextInvoiceNumbers(organizationId, count, db);
}

async function getOrCreateInvoiceSettings(organizationId, supabaseClient) {
  const db = supabaseClient || supabase;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: settings, error } = await db
      .from('invoice_settings')
      .select('invoice_prefix, next_invoice_number')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!error && settings) return settings;
    if (error && error.code !== 'PGRST116') throw error;

    const { data: inserted, error: insertError } = await db
      .from('invoice_settings')
      .insert({
        organization_id: organizationId,
        invoice_prefix: 'W',
        next_invoice_number: 0,
      })
      .select('invoice_prefix, next_invoice_number')
      .single();

    if (!insertError && inserted) return inserted;
    if (insertError && String(insertError.code || '') === '23505') {
      // Another request created defaults in parallel; refetch on next loop.
      continue;
    }
    if (insertError) throw insertError;
  }

  throw new Error('Failed to initialize invoice settings.');
}

async function fallbackGetNextInvoiceNumbers(organizationId, count, supabaseClient) {
  const db = supabaseClient || supabase;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const settings = await getOrCreateInvoiceSettings(organizationId, db);
      const prefix = settings?.invoice_prefix || 'W';
      const safeStart = Math.max(0, settings?.next_invoice_number ?? 0);
      const nowIso = new Date().toISOString();

      const { data: reservedRows, error: reserveError } = await db
        .from('invoice_settings')
        .update({ next_invoice_number: safeStart + count, updated_at: nowIso })
        .eq('organization_id', organizationId)
        .eq('next_invoice_number', safeStart)
        .select('invoice_prefix');
      if (reserveError) throw reserveError;
      if (!reservedRows?.length) {
        // Another request reserved first; retry with fresh settings.
        continue;
      }

      const reservedPrefix = reservedRows[0]?.invoice_prefix || prefix;
      return Array.from({ length: count }, (_, i) =>
        `${reservedPrefix}${String(safeStart + i).padStart(5, '0')}`
      );
    }

    throw new Error('Failed to reserve invoice numbers due to concurrent updates. Please retry.');
  } catch (err) {
    logger.error('fallbackGetNextInvoiceNumbers error:', err);
    return [];
  }
}

/**
 * Reserve a block of sequential agreement numbers for lease_agreements.
 * Atomically fetches next_agreement_number, returns count numbers, and increments.
 * Fixes duplicate key error when creating multiple agreements (e.g. "Apply to all bottles").
 * @param {string} organizationId
 * @param {number} count - Number of agreement numbers to reserve
 * @returns {Promise<string[]>} Array of formatted numbers (e.g. ['LA00001','LA00002',...])
 */
export async function getNextAgreementNumbers(organizationId, count) {
  if (!organizationId || count < 1) return [];
  try {
    let { data: settings, error } = await supabase
      .from('invoice_settings')
      .select('agreement_prefix, next_agreement_number')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: maxAgreement } = await supabase
        .from('lease_agreements')
        .select('agreement_number')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let startingNumber = 1;
      if (maxAgreement?.agreement_number) {
        const match = maxAgreement.agreement_number.match(/\d+$/);
        if (match) startingNumber = parseInt(match[0], 10) + 1;
      }

      const { data: newSettings, error: createError } = await supabase
        .from('invoice_settings')
        .insert({
          organization_id: organizationId,
          agreement_prefix: 'LA',
          next_agreement_number: startingNumber,
        })
        .select()
        .single();

      if (createError) throw createError;
      settings = newSettings;
    } else if (error) {
      throw error;
    }

    const prefix = settings?.agreement_prefix || 'LA';
    let nextNumber = Math.max(1, settings?.next_agreement_number ?? 1);

    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(`${prefix}${String(nextNumber + i).padStart(5, '0')}`);
    }

    const { error: updateError } = await supabase
      .from('invoice_settings')
      .update({ next_agreement_number: nextNumber + count, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    if (updateError) {
      logger.error('Failed to increment agreement number:', updateError);
      throw updateError;
    }
    return numbers;
  } catch (err) {
    logger.error('getNextAgreementNumbers error:', err);
    throw err;
  }
}

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 * Uses RFC 4180: wrap in quotes and escape internal quotes by doubling.
 */
export function escapeCsvValue(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert array of objects to CSV string with proper escaping.
 * @param {Object[]} rows
 * @param {string[]} columns - Optional column order; defaults to Object.keys(rows[0])
 * @param {boolean} includeBom - Add BOM for Excel UTF-8
 */
export function toCsv(rows, columns = null, includeBom = true) {
  if (!rows?.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const header = cols.map(escapeCsvValue).join(',');
  const lines = rows.map((r) =>
    cols.map((c) => escapeCsvValue(r[c] != null ? r[c] : '')).join(',')
  );
  const csv = [header, ...lines].join('\r\n');
  return includeBom ? '\uFEFF' + csv : csv;
}

/**
 * Trigger browser download of a CSV or text file.
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

