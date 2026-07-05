/**
 * Background bulk rental invoice email runner (pause / cancel between customers).
 */

import { supabase } from '../supabase/client';
import {
  applyInvoiceEmailTemplateVars,
  buildRentalInvoiceEmailVarMap,
  mergePaymentMethodsIntoInvoiceEmailBody,
  stripRemitInstructionsFromInvoiceEmailBody,
} from '../utils/invoiceEmailTemplateVars';
import { logInvoiceEmailSend } from '../services/invoiceEmailHistory';
import { getBillingPeriodForSub } from '../utils/rentalBillingPeriod';

export function createBulkEmailJobController() {
  return {
    paused: false,
    cancelled: false,
  };
}

async function waitUntilResumed(controller) {
  while (controller.paused && !controller.cancelled) {
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
}

function daysAtLocationSummaryFromBottles(bottles) {
  const vals = (bottles || [])
    .map((b) => Number(b.days_at_location))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!vals.length) return 'See attached PDF for on-hand assets.';
  const max = Math.max(...vals);
  const avg = Math.round(vals.reduce((a, c) => a + c, 0) / vals.length);
  return `On-hand assets: max ${max} days at location, average ${avg} days (see PDF).`;
}

/**
 * @param {object} params
 * @param {Array} params.items - preview items with willSend, row, email, invoiceNumber, customerName
 * @param {ReturnType<typeof createBulkEmailJobController>} params.controller
 * @param {(progress: object) => void} params.onProgress
 * @param {object} params.deps
 */
export async function runBulkRentalInvoiceEmailJob({ items, controller, onProgress, deps }) {
  const toSend = (items || []).filter((i) => i.willSend);
  const total = toSend.length;
  let sent = 0;
  let failed = 0;
  let pdfArchiveFailed = 0;
  const sendErrors = [];

  if (total === 0) {
    return { sent: 0, failed: 0, total: 0, cancelled: false, pdfArchiveFailed: 0, sendErrors: [] };
  }

  const {
    organization,
    profile,
    user,
    getSavedEmailTemplate,
    remitAddress,
    remitAddressBlock,
    matchCustomerRecordBySubscriptionId,
    qbCsvBillingMonth,
    buildInvoicePdfForRow,
    zipGroupsCache,
    persistRentalInvoiceEmailSent,
    withGlobalSignature,
    ensureInvoiceContext,
    defaultTemplateSignature,
    onInvoiceSent,
  } = deps;

  let defaultFrom = '';
  let billingInquiryEmail = organization?.default_invoice_email || organization?.email || '';
  const orgName = organization?.name || 'your organization';
  const orgWebsite = organization?.website || '';

  try {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('invoice_emails, default_invoice_email, email')
      .eq('id', organization.id)
      .single();
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionEmail = sessionData?.session?.user?.email?.trim() || '';
    const profileEmail = profile?.email?.trim() || '';
    defaultFrom =
      sessionEmail
      || profileEmail
      || user?.email?.trim()
      || orgData?.default_invoice_email
      || orgData?.email
      || '';
    billingInquiryEmail = orgData?.default_invoice_email || orgData?.email || billingInquiryEmail;
  } catch {
    defaultFrom = profile?.email?.trim() || user?.email?.trim() || '';
  }

  const savedEmailTemplate = getSavedEmailTemplate();
  const remitName = String(remitAddress?.remit_name || orgName).trim();
  const remitLine1 = String(remitAddress?.remit_address_line1 || '').trim();
  const remitLine2 = String(remitAddress?.remit_address_line2 || '').trim();
  const remitLine3 = String(remitAddress?.remit_address_line3 || '').trim();

  onProgress({ sent, failed, total, currentCustomerName: '', index: 0 });

  for (let index = 0; index < toSend.length; index += 1) {
    if (controller.cancelled) break;
    await waitUntilResumed(controller);
    if (controller.cancelled) break;

    const item = toSend[index];
    const row = item.row;
    const customerEmail = item.email;
    const customerName = item.customerName;

    onProgress({
      sent,
      failed,
      total,
      currentCustomerName: customerName,
      index,
    });

    try {
      const invNo = item.invoiceNumber;
      const bulkSnapOpts = zipGroupsCache ? { zipGroupsCache } : {};
      const bulkPdfBundle = await buildInvoicePdfForRow(row, invNo, bulkSnapOpts);
      const { doc, customerName: cn, amountDue, invoiceNumber: pdfInvNo } = bulkPdfBundle;
      const formattedAmount = amountDue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const customerPoBulk = String(
        row?.customer?.purchase_order
          ?? matchCustomerRecordBySubscriptionId(row?.customer_id)?.purchase_order
          ?? '',
      ).trim();
      const emailVars = buildRentalInvoiceEmailVarMap({
        invoiceNumber: pdfInvNo,
        formattedAmount,
        customerName,
        customerPurchaseOrder: customerPoBulk,
        orgName,
        orgWebsite,
        remitName,
        remitLine1,
        remitLine2,
        remitLine3,
        remitAddressBlock,
        billingInquiryEmail,
        savedTemplate: savedEmailTemplate,
        daysAtLocationSummary: daysAtLocationSummaryFromBottles(bulkPdfBundle.bottles),
      });

      const bulkBodyRaw = savedEmailTemplate?.body;
      const bulkHasBody = typeof bulkBodyRaw === 'string' && bulkBodyRaw.trim().length > 0;
      let msgBody = bulkHasBody
        ? applyInvoiceEmailTemplateVars(bulkBodyRaw, emailVars)
        : `Your invoice ${pdfInvNo} for $${formattedAmount} is attached.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.`;
      msgBody = stripRemitInstructionsFromInvoiceEmailBody(msgBody);
      msgBody = mergePaymentMethodsIntoInvoiceEmailBody(msgBody, bulkBodyRaw, emailVars);
      if (bulkHasBody && !msgBody.includes(pdfInvNo)) {
        msgBody = `Invoice ${pdfInvNo}\n\n${msgBody}`;
      }
      msgBody = ensureInvoiceContext(msgBody, pdfInvNo, formattedAmount);
      if (!bulkHasBody && customerPoBulk) {
        msgBody = `${String(msgBody).trim()}\n\nCustomer P.O.: ${customerPoBulk}`;
      }
      const renderedSignature = applyInvoiceEmailTemplateVars(
        String(savedEmailTemplate?.signature || defaultTemplateSignature),
        emailVars,
      );
      msgBody = withGlobalSignature(msgBody, renderedSignature);
      const bulkSubjectRaw = savedEmailTemplate?.subject;
      const bulkHasSubject = typeof bulkSubjectRaw === 'string' && bulkSubjectRaw.trim().length > 0;
      const subject = bulkHasSubject
        ? applyInvoiceEmailTemplateVars(bulkSubjectRaw, emailVars)
        : `Invoice ${pdfInvNo} – ${customerName} – ${orgName}`;
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfFileName = `Invoice_${String(cn || customerName).replace(/[^\w-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const bodyHtml = msgBody.replace(/\n/g, '<br/>');

      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerEmail,
          from: defaultFrom,
          senderName: profile?.full_name || user?.user_metadata?.full_name || '',
          subject,
          body: bodyHtml,
          pdfBase64,
          pdfFileName,
          invoiceNumber: pdfInvNo,
        }),
      });

      if (!response.ok) {
        failed += 1;
        sendErrors.push({
          customerName,
          invoiceNumber: item.invoiceNumber,
          reason: `Email API ${response.status}`,
        });
      } else {
        sent += 1;
        try {
          const bulkPayload = await response.json().catch(() => ({}));
          await persistRentalInvoiceEmailSent(row, pdfInvNo);
          const { periodStart: bPs, periodEnd: bPe } = getBillingPeriodForSub(row, {
            qbBillingMonthYm: qbCsvBillingMonth,
          });
          const rowSid = String(row.id || '').trim();
          const logResult = await logInvoiceEmailSend({
            organizationId: organization.id,
            subscriptionId:
              rowSid && !row.isVirtual && !rowSid.startsWith('legacy-') && !rowSid.startsWith('virtual-')
                ? rowSid
                : null,
            customerId: row.customer_id,
            invoiceNumber: pdfInvNo,
            periodStart: bPs,
            periodEnd: bPe,
            emailedTo: [customerEmail].filter(Boolean),
            emailFrom: defaultFrom,
            subject,
            messageId: bulkPayload?.messageId,
            sentByUserId: profile?.id || user?.id,
            pdfBase64,
          });
          if (!logResult.pdfArchived) {
            pdfArchiveFailed += 1;
          }
          if (typeof onInvoiceSent === 'function') {
            onInvoiceSent({ row, pdfInvNo });
          }
        } catch {
          /* status update best-effort; email already sent */
        }
      }
    } catch (err) {
      failed += 1;
      sendErrors.push({
        customerName,
        invoiceNumber: item.invoiceNumber,
        reason: err?.message || 'send_failed',
      });
    }

    onProgress({
      sent,
      failed,
      total,
      currentCustomerName: customerName,
      index: index + 1,
    });
  }

  return {
    sent,
    failed,
    total,
    cancelled: controller.cancelled,
    pdfArchiveFailed,
    sendErrors,
  };
}
