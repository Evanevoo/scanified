import { normalizeImportOrderNum, resolveImportOrderNumber } from './importAutoApproveMatch';

const DEFAULT_AUTO_APPROVAL_REASON =
  'Quantities match between invoice and scanned data; shipped bottles are at home or already with the delivery customer';

export function parseImportDataField(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data || '{}');
    } catch {
      return {};
    }
  }
  return typeof data === 'object' ? data : {};
}

export function distinctOrderNumbersFromImportData(data) {
  const rows = data?.rows || data?.line_items || [];
  return [
    ...new Set(
      rows
        .map(
          (r) =>
            r.reference_number ||
            r.order_number ||
            r.invoice_number ||
            r.sales_receipt_number,
        )
        .filter(Boolean),
    ),
  ];
}

/**
 * Append an order to verified_order_numbers (normalized dedupe).
 * Ensures the key exists so per-order verify tracking is consistent.
 */
export function appendVerifiedOrderToImportData(existingData, orderNumber) {
  const parsed = parseImportDataField(existingData);
  const normOrder = normalizeImportOrderNum;
  const verifiedOrderNumbers = Array.isArray(parsed.verified_order_numbers)
    ? [...parsed.verified_order_numbers]
    : [];
  const orderCanon = String(orderNumber || '').trim();
  const orderNorm = normOrder(orderCanon);
  if (orderNorm && !verifiedOrderNumbers.some((n) => normOrder(n) === orderNorm)) {
    verifiedOrderNumbers.push(orderCanon);
  }
  const distinctOrderNumbers = distinctOrderNumbersFromImportData(parsed);
  const allOrdersVerified =
    distinctOrderNumbers.length > 0 &&
    distinctOrderNumbers.every((on) =>
      verifiedOrderNumbers.some((v) => normOrder(v) === normOrder(on)),
    );
  const newData = { ...parsed, verified_order_numbers: verifiedOrderNumbers };
  return { newData, verifiedOrderNumbers, allOrdersVerified, orderCanon: orderCanon || resolveImportOrderNumber(parsed) };
}

/**
 * Build a Supabase update payload for auto-approve that also marks the order verified.
 */
export function buildAutoApproveImportRowUpdate(existingData, orderNumber, options = {}) {
  const { newData, allOrdersVerified } = appendVerifiedOrderToImportData(existingData, orderNumber);
  const now = new Date().toISOString();
  const autoApprovalReason = options.autoApprovalReason || DEFAULT_AUTO_APPROVAL_REASON;
  const payload = {
    data: newData,
    status: 'approved',
    approved_at: now,
    verified_at: now,
    auto_approved: true,
    auto_approval_reason: autoApprovalReason,
  };
  if (options.verifiedBy) {
    payload.verified_by = options.verifiedBy;
  }
  return { updatePayload: payload, allOrdersVerified };
}
