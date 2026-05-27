/**
 * Replace `{placeholder}` tokens in invoice email subject/body/signature.
 * Runs multiple passes so values may contain other placeholders (e.g. payment_methods includes {e_transfer_email}).
 */
export function applyInvoiceEmailTemplateVars(text, vars) {
  let out = String(text ?? '');
  if (!out || !vars || typeof vars !== 'object') return out;

  const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (let pass = 0; pass < 5; pass += 1) {
    const prev = out;
    for (const [key, val] of Object.entries(vars)) {
      if (val === undefined || val === null) continue;
      const re = new RegExp(`\\{${escapeRe(key)}\\}`, 'gi');
      out = out.replace(re, String(val));
    }
    if (out === prev) break;
  }
  return out;
}

/**
 * Remove "Please remit payment to:" blocks from the email body so remit details
 * stay on the PDF only. Safe to run after placeholders are applied.
 */
export function stripRemitInstructionsFromInvoiceEmailBody(text) {
  let s = String(text ?? '').replace(/\r\n/g, '\n');
  if (!s.trim()) return s;
  s = s.replace(
    /\n*\s*please\s+remit\s+payment\s+to\s*:?\s*\n[\s\S]*?(?=\n\s*(?:for\s+any\s+billing|thank\s+you|sincerely)|\n{3,}|$)/gi,
    '\n',
  );
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** Variable map for rental invoice emails (Subscriptions + Settings template). */
export function buildRentalInvoiceEmailVarMap({
  invoiceNumber,
  formattedAmount,
  customerName,
  customerPurchaseOrder,
  orgName,
  orgWebsite,
  remitName,
  remitLine1,
  remitLine2,
  remitLine3,
  remitAddressBlock,
  billingInquiryEmail,
  savedTemplate,
  daysAtLocationSummary,
}) {
  const tpl = savedTemplate || {};
  const profileName = String(orgName || '').trim();
  /** Bill-to / legal remit name when set; callers pass remitName as remit_address.remit_name || orgName. */
  const signingName = String(remitName || '').trim() || profileName;
  const purchase_order = String(customerPurchaseOrder ?? '').trim();
  const eTransfer = String(tpl.e_transfer_email || '').trim();
  const rawPayment = String(tpl.payment_methods || '').trim();
  const payment_methods = applyInvoiceEmailTemplateVars(rawPayment, {
    e_transfer_email: eTransfer,
    organization_name: signingName,
    organization_profile_name: profileName,
    organization_website: String(orgWebsite || '').trim(),
    billing_inquiry_email: String(billingInquiryEmail || '').trim(),
    purchase_order,
    customer_name: String(customerName || '').trim(),
  });
  const amountStr = String(formattedAmount ?? '').trim();
  const amountDisplay = amountStr.startsWith('$') ? amountStr : `$${amountStr}`;
  return {
    invoice_number: String(invoiceNumber || '').trim(),
    amount: amountDisplay,
    customer_name: String(customerName || '').trim(),
    purchase_order,
    organization_name: signingName,
    organization_profile_name: profileName,
    organization_website: String(orgWebsite || '').trim(),
    remit_name: String(remitName || '').trim(),
    remit_address_line1: String(remitLine1 || '').trim(),
    remit_address_line2: String(remitLine2 || '').trim(),
    remit_address_line3: String(remitLine3 || '').trim(),
    remit_address: String(remitAddressBlock || '').trim(),
    e_transfer_email: eTransfer,
    payment_methods,
    billing_inquiry_email: String(billingInquiryEmail || '').trim(),
    days_at_location_summary: String(daysAtLocationSummary || '').trim(),
  };
}

/**
 * Settings stores payment copy in `payment_methods`; it only appears in the email when the body
 * contains `{payment_methods}`. If the placeholder is absent, append the rendered block so users
 * who only filled "Payment methods" still get that text in the message.
 */
export function mergePaymentMethodsIntoInvoiceEmailBody(body, savedBodyRaw, emailVars) {
  let s = String(body ?? '').replace(/\r\n/g, '\n');
  const pmBlock = String(emailVars?.payment_methods || '').trim();
  if (!pmBlock) return s;
  if (/\{payment_methods\}/i.test(String(savedBodyRaw || ''))) return s;
  const t = s.trim();
  if (!t) return pmBlock;
  const collapseWs = (x) => x.replace(/\s+/g, ' ').trim();
  if (collapseWs(s).includes(collapseWs(pmBlock))) return s;
  return `${t}\n\n${pmBlock}`.trim();
}
