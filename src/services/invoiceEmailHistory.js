import { supabase } from '../supabase/client';

const INVOICE_BUCKET = 'invoices';

function sanitizePathSegment(s) {
  return String(s || '')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 120) || 'invoice';
}

/**
 * Upload PDF bytes from a base64 data-URI segment and record the send in invoice_email_sends.
 */
export async function logInvoiceEmailSend({
  organizationId,
  subscriptionId,
  subscriptionInvoiceId,
  customerId,
  invoiceNumber,
  periodStart,
  periodEnd,
  emailedTo,
  emailFrom,
  subject,
  messageId,
  sentByUserId,
  pdfBase64,
}) {
  if (!organizationId || !invoiceNumber) return { ok: false, error: 'Missing organization or invoice number' };

  const recipients = Array.isArray(emailedTo)
    ? emailedTo.map((e) => String(e || '').trim()).filter(Boolean)
    : [String(emailedTo || '').trim()].filter(Boolean);

  let pdfStoragePath = null;
  if (pdfBase64) {
    const sentAt = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${sanitizePathSegment(invoiceNumber)}_${sentAt}.pdf`;
    pdfStoragePath = `${organizationId}/${fileName}`;
    try {
      const binary = atob(String(pdfBase64));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const { error: upErr } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(pdfStoragePath, blob, { contentType: 'application/pdf', upsert: true });
      if (upErr) {
        console.warn('invoice PDF storage upload failed:', upErr);
        pdfStoragePath = null;
      }
    } catch (e) {
      console.warn('invoice PDF storage upload threw:', e);
      pdfStoragePath = null;
    }
  }

  const { data, error } = await supabase
    .from('invoice_email_sends')
    .insert({
      organization_id: organizationId,
      subscription_id: subscriptionId || null,
      subscription_invoice_id: subscriptionInvoiceId || null,
      customer_id: customerId || null,
      invoice_number: String(invoiceNumber).trim(),
      period_start: periodStart || null,
      period_end: periodEnd || null,
      emailed_to: recipients,
      email_from: emailFrom || null,
      subject: subject || null,
      message_id: messageId || null,
      sent_by_user_id: sentByUserId || null,
      pdf_storage_path: pdfStoragePath,
    })
    .select('id, pdf_storage_path')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return { ok: false, error: 'invoice_email_sends table not found — run sql/add_invoice_email_sends.sql' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id, pdfStoragePath: data?.pdf_storage_path };
}

export async function fetchInvoiceEmailSends(organizationId, { limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('invoice_email_sends')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sent_at', { ascending: false })
    .limit(Math.min(limit, 1000));
  if (error) throw error;
  return data || [];
}

export async function downloadStoredInvoicePdf(pdfStoragePath) {
  if (!pdfStoragePath) return null;
  const { data, error } = await supabase.storage.from(INVOICE_BUCKET).download(pdfStoragePath);
  if (error) throw error;
  return data;
}

export async function getSignedInvoicePdfUrl(pdfStoragePath, expiresIn = 3600) {
  if (!pdfStoragePath) return null;
  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(pdfStoragePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}
