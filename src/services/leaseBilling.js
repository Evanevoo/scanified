/**
 * Lease billing: amounts come only from lease_contract_items — not from pricingResolution.
 */

function normKey(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Active contract for subscription billing (today in [start_date, end_date]).
 */
export function findActiveLeaseContract(contracts, subscriptionCustomerId, organizationId) {
  const today = new Date().toISOString().split('T')[0];
  const subKey = normKey(subscriptionCustomerId);
  return (
    (contracts || []).find((c) => {
      if (organizationId && c.organization_id && c.organization_id !== organizationId) return false;
      if (c.status && c.status !== 'active') return false;
      if (normKey(c.customer_id) !== subKey) return false;
      if (c.start_date && c.start_date > today) return false;
      if (c.end_date && c.end_date < today) return false;
      return true;
    }) || null
  );
}

/** Annual amount for one lease line (yearly_price wins if set). */
export function leaseContractLineAnnualAmount(line) {
  const yp = line?.yearly_price != null ? parseFloat(line.yearly_price) : null;
  if (yp != null && Number.isFinite(yp)) return Math.round(yp * 100) / 100;
  const up = parseFloat(line?.unit_price);
  const qty = parseInt(line?.contracted_quantity, 10);
  const q = Number.isFinite(qty) && qty >= 0 ? qty : 0;
  if (Number.isFinite(up)) return Math.round(up * q * 100) / 100;
  return 0;
}

export function sumLeaseContractAnnualTotal(items) {
  const t = (items || []).reduce((s, l) => s + leaseContractLineAnnualAmount(l), 0);
  return Math.round(t * 100) / 100;
}

/**
 * Map annual lease total to one subscription billing cycle (monthly = 1/12 of annual).
 */
export function leaseAnnualToCycleTotal(annualTotal, subscriptionBillingPeriod) {
  const period = String(subscriptionBillingPeriod || 'monthly').toLowerCase();
  if (period === 'yearly') return Math.round(parseFloat(annualTotal) * 100) / 100;
  return Math.round((parseFloat(annualTotal) / 12) * 100) / 100;
}

export function leaseLineCycleAmount(line, subscriptionBillingPeriod) {
  const annual = leaseContractLineAnnualAmount(line);
  return leaseAnnualToCycleTotal(annual, subscriptionBillingPeriod);
}
