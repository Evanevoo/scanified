/**
 * Shared rental billing period boundaries (monthly = previous calendar month).
 * Used by Rentals UI, invoice PDF, QB export, and subscriptionService.generateInvoice.
 */

/** `YYYY-MM` → `YYYY-MM-DD` (last day of that month). */
export function lastDayOfMonthYm(ym) {
  const parts = String(ym || '').trim().split('-');
  if (parts.length < 2) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const d = new Date(y, m, 0);
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Invoice / due dates for QuickBooks CSV when billing a closed calendar month. */
export function qbCsvDatesForBilledMonth(ym) {
  const periodEnd = lastDayOfMonthYm(ym);
  if (!periodEnd) return { invoiceDate: null, dueDate: null };
  const y = parseInt(ym.split('-')[0], 10);
  const m = parseInt(ym.split('-')[1], 10);
  const dueD = new Date(y, m + 1, 0);
  const dueDate = `${dueD.getFullYear()}-${String(dueD.getMonth() + 1).padStart(2, '0')}-${String(dueD.getDate()).padStart(2, '0')}`;
  return { invoiceDate: periodEnd, dueDate };
}

/** Live billing cycle: previous calendar month + due end of current month. */
export function getCurrentCycleRange(now = new Date()) {
  const toLocalYmd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const periodStart = toLocalYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const periodEnd = toLocalYmd(new Date(now.getFullYear(), now.getMonth(), 0));
  const dueDate = toLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { periodStart, periodEnd, dueDate };
}

function normPeriodDay(v) {
  const s = String(v || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Billing period for a subscription row.
 * @param {object} sub
 * @param {{ qbBillingMonthYm?: string|null, now?: Date }} [options] - `qbBillingMonthYm`: `YYYY-MM` or `live`
 */
export function getBillingPeriodForSub(sub, options = {}) {
  const qbYmRaw = options.qbBillingMonthYm != null ? String(options.qbBillingMonthYm).trim() : '';
  const fallback = getCurrentCycleRange(options.now);
  const isYearly = String(sub?.billing_period || '').toLowerCase() === 'yearly';

  if (!isYearly && qbYmRaw && qbYmRaw.toLowerCase() !== 'live') {
    const periodEnd = lastDayOfMonthYm(qbYmRaw);
    if (periodEnd) {
      const parts = qbYmRaw.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isFinite(y) && Number.isFinite(m)) {
        const periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
        const { dueDate } = qbCsvDatesForBilledMonth(qbYmRaw);
        return {
          periodStart,
          periodEnd,
          dueDate: dueDate || fallback.dueDate,
          sequenceMonth: qbYmRaw,
        };
      }
    }
  }

  const subStart = normPeriodDay(sub?.current_period_start);
  const subEnd = normPeriodDay(sub?.current_period_end);
  const periodStart =
    isYearly && subStart && subEnd && subStart <= subEnd ? subStart : fallback.periodStart;
  const periodEnd =
    isYearly && subStart && subEnd && subStart <= subEnd ? subEnd : fallback.periodEnd;
  return {
    periodStart,
    periodEnd,
    dueDate: fallback.dueDate,
    sequenceMonth: String(periodStart || '').slice(0, 7) || null,
  };
}

/** Alias for PDF period (includes dueDate). */
export function computeInvoicePdfPeriodForRow(row, qbBillingMonthYm = null, now = new Date()) {
  return getBillingPeriodForSub(row, { qbBillingMonthYm, now });
}

/** QB CSV / sessionStorage map month key for a subscription row. */
export function sequenceMonthForSub(sub, qbBillingMonthYm = 'live', now = new Date()) {
  const { sequenceMonth, periodStart } = getBillingPeriodForSub(sub, { qbBillingMonthYm, now });
  if (sequenceMonth) return sequenceMonth;
  const live = getCurrentCycleRange(now);
  return String(periodStart || live.periodStart).slice(0, 7);
}

/**
 * Billing period to pre-assign invoice numbers before month-end / month-start runs.
 * - Last calendar day of month (e.g. May 31): current month (May 1–31) — numbers ready to invoice that month.
 * - First day of month (e.g. Jun 1): previous month (May 1–31) — same as live Rentals cycle.
 * - Other days: null unless `force: true` (then uses live getCurrentCycleRange).
 */
export function getPeriodForCyclePrep(now = new Date(), options = {}) {
  const { force = false } = options;
  const toLocalYmd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isLastDayOfMonth = tomorrow.getDate() === 1;
  const isFirstDayOfMonth = now.getDate() === 1;

  if (isLastDayOfMonth) {
    const periodStart = toLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1));
    const periodEnd = toLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const { dueDate } = getCurrentCycleRange(now);
    return {
      periodStart,
      periodEnd,
      dueDate,
      sequenceMonth: periodStart.slice(0, 7),
      trigger: 'month_end',
    };
  }

  if (isFirstDayOfMonth) {
    const live = getCurrentCycleRange(now);
    return {
      ...live,
      sequenceMonth: String(live.periodStart || '').slice(0, 7),
      trigger: 'month_start',
    };
  }

  if (force) {
    const live = getCurrentCycleRange(now);
    return {
      ...live,
      sequenceMonth: String(live.periodStart || '').slice(0, 7),
      trigger: 'manual',
    };
  }

  return null;
}
