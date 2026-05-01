export function generateInvoiceNumber(prefix = 'W', date = new Date()) {
  // Required format: 1 letter + 5 digits (e.g. W12345).
  const seed = date.getTime() % 100000;
  return `${prefix}${String(seed).padStart(5, '0')}`;
}

export function getNextBillingDate(currentDate, billingPeriod) {
  const d = new Date(currentDate);
  if (billingPeriod === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function getPeriodEnd(periodStart, billingPeriod) {
  const d = new Date(periodStart);
  if (billingPeriod === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function getDaysRemainingInPeriod(periodEnd) {
  const now = new Date();
  const end = new Date(periodEnd);
  const diff = Math.floor((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function getTotalDaysInPeriod(periodStart, periodEnd) {
  return Math.floor((new Date(periodEnd) - new Date(periodStart)) / (1000 * 60 * 60 * 24));
}

export function calculateProration(unitPrice, periodStart, periodEnd, changeDate) {
  const totalDays = getTotalDaysInPeriod(periodStart, periodEnd);
  if (totalDays <= 0) return 0;
  const remainingDays = Math.floor((new Date(periodEnd) - new Date(changeDate)) / (1000 * 60 * 60 * 24));
  const fraction = Math.max(0, remainingDays) / totalDays;
  return Math.round(unitPrice * fraction * 100) / 100;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function pad(n) { return String(n).padStart(2, '0'); }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatPeriod(start, end) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sStr = `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}`;
  const eStr = e ? `${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}` : '...';
  return `${sStr} – ${eStr}`;
}

export const STATUS_COLORS = {
  active: 'success',
  paused: 'warning',
  cancelled: 'error',
  expired: 'default',
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'error',
  void: 'default',
};

export function computeSubscriptionTotal(items) {
  return (items || [])
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + (parseFloat(i.unit_price) || 0) * (i.quantity || 1), 0);
}

export function computeMRR(subscriptions, items) {
  let mrr = 0;
  for (const sub of (subscriptions || [])) {
    if (sub.status !== 'active') continue;
    const subItems = (items || []).filter((i) => i.subscription_id === sub.id && i.status === 'active');
    const total = subItems.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (i.quantity || 1), 0);
    mrr += sub.billing_period === 'yearly' ? total / 12 : total;
  }
  return Math.round(mrr * 100) / 100;
}

export function getEndOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
