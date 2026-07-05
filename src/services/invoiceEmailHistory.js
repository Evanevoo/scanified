import { supabase } from '../supabase/client';

const INVOICE_BUCKET = 'invoices';

export function sanitizeInvoicePdfPathSegment(s) {
  return String(s || '')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 120) || 'invoice';
}

/** @returns {Uint8Array|null} */
export function decodePdfBase64ToBytes(pdfBase64) {
  const raw = String(pdfBase64 || '').trim();
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

function isStorageDuplicateError(error) {
  if (!error) return false;
  const code = error.statusCode ?? error.status;
  if (code === 409 || code === '409') return true;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('already exists') || error.error === 'Duplicate';
}

function isStoragePolicyOrBucketError(error) {
  if (!error) return false;
  const code = error.statusCode ?? error.status;
  if (code === 403 || code === '403') return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('row-level security')
    || msg.includes('bucket not found')
    || msg.includes('not found')
    || msg.includes('invalid')
  );
}

/**
 * Upload PDF to Storage bucket `invoices`. Returns null path on failure (email still sent).
 * @returns {Promise<{ path: string|null, error: string|null, hint: string|null }>}
 */
export async function uploadInvoicePdfToStorage(organizationId, invoiceNumber, pdfBase64) {
  if (!organizationId || !invoiceNumber) {
    return { path: null, error: 'missing_org_or_invoice', hint: null };
  }

  const bytes = decodePdfBase64ToBytes(pdfBase64);
  if (!bytes) {
    return { path: null, error: 'invalid_pdf_bytes', hint: null };
  }

  const sentAt = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${sanitizeInvoicePdfPathSegment(invoiceNumber)}_${sentAt}.pdf`;
  const basePath = `${organizationId}/${fileName}`;

  const uploadOpts = {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: false,
  };

  let path = basePath;
  let { error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, bytes, uploadOpts);

  if (error && isStorageDuplicateError(error)) {
    path = `${organizationId}/${sanitizeInvoicePdfPathSegment(invoiceNumber)}_${sentAt}_${Math.random().toString(36).slice(2, 8)}.pdf`;
    ({ error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, bytes, uploadOpts));
  }

  if (error && isStorageDuplicateError(error)) {
    ({ error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, bytes, {
      ...uploadOpts,
      upsert: true,
    }));
  }

  if (error) {
    const hint = isStoragePolicyOrBucketError(error)
      ? 'Run sql/create_invoices_storage_bucket.sql in Supabase to enable PDF archive.'
      : null;
    console.warn('invoice PDF storage upload failed:', {
      statusCode: error.statusCode ?? error.status,
      message: error.message,
      errorCode: error.error,
      path,
    });
    return { path: null, error: error.message || 'upload_failed', hint };
  }

  return { path, error: null, hint: null };
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
  if (!organizationId || !invoiceNumber) {
    return { ok: false, error: 'Missing organization or invoice number', pdfStoragePath: null };
  }

  const recipients = Array.isArray(emailedTo)
    ? emailedTo.map((e) => String(e || '').trim()).filter(Boolean)
    : [String(emailedTo || '').trim()].filter(Boolean);

  let pdfStoragePath = null;
  let pdfArchiveError = null;
  let pdfArchiveHint = null;

  if (pdfBase64) {
    const upload = await uploadInvoicePdfToStorage(organizationId, invoiceNumber, pdfBase64);
    pdfStoragePath = upload.path;
    pdfArchiveError = upload.error;
    pdfArchiveHint = upload.hint;
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
      return {
        ok: false,
        error: 'invoice_email_sends table not found — run sql/add_invoice_email_sends.sql',
        pdfStoragePath: null,
        pdfArchived: false,
      };
    }
    return { ok: false, error: error.message, pdfStoragePath: null, pdfArchived: false };
  }

  return {
    ok: true,
    id: data?.id,
    pdfStoragePath: data?.pdf_storage_path,
    pdfArchived: Boolean(data?.pdf_storage_path),
    pdfArchiveError,
    pdfArchiveHint,
  };
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
