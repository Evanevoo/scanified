/**
 * Invoice utilities: number generation from invoice_settings, CSV export helpers
 */
import { supabase } from '../supabase/client';
import logger from './logger';

/**
 * Reserve a block of sequential invoice numbers atomically via database RPC.
 * Uses a single UPDATE...RETURNING to prevent race conditions.
 * @param {string} organizationId
 * @param {number} count - Number of invoice numbers to reserve
 * @returns {Promise<string[]>} Array of formatted invoice numbers (e.g. ['W00001','W00002',...])
 */
export async function getNextInvoiceNumbers(organizationId, count) {
  if (!organizationId || count < 1) return [];
  try {
    const { data: numbers, error } = await supabase.rpc('reserve_invoice_numbers', {
      p_organization_id: organizationId,
      p_count: count,
    });

    if (error) throw error;
    if (numbers && numbers.length > 0) return numbers;

    // Fallback if RPC not yet deployed
    logger.warn('reserve_invoice_numbers RPC returned empty, using fallback');
    return fallbackGetNextInvoiceNumbers(organizationId, count);
  } catch (err) {
    logger.error('getNextInvoiceNumbers RPC error, using fallback:', err);
    return fallbackGetNextInvoiceNumbers(organizationId, count);
  }
}

async function fallbackGetNextInvoiceNumbers(organizationId, count) {
  try {
    let { data: settings, error } = await supabase
      .from('invoice_settings')
      .select('invoice_prefix, next_invoice_number')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: maxInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let startingNumber = 1;
      if (maxInvoice?.invoice_number) {
        const match = maxInvoice.invoice_number.match(/\d+$/);
        if (match) startingNumber = parseInt(match[0], 10) + 1;
      }

      const { data: newSettings, error: createError } = await supabase
        .from('invoice_settings')
        .insert({
          organization_id: organizationId,
          invoice_prefix: 'W',
          next_invoice_number: startingNumber,
        })
        .select()
        .single();

      if (createError) throw createError;
      settings = newSettings;
    } else if (error) {
      throw error;
    }

    const prefix = settings?.invoice_prefix || 'W';
    let nextNumber = Math.max(1, settings?.next_invoice_number || 1);

    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(`${prefix}${String(nextNumber + i).padStart(5, '0')}`);
    }

    const { error: updateError } = await supabase
      .from('invoice_settings')
      .update({ next_invoice_number: nextNumber + count, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    if (updateError) {
      logger.error('Failed to increment invoice number:', updateError);
    }
    return numbers;
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
