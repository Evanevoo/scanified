import { isBottleLostForBilling } from './billingFromAssets';

/**
 * Build subscription-shaped rows for yearly lease agreements (QuickBooks CSV, Excel, PDF ZIP).
 * Mirrors Lease agreement pricing used previously on the Rentals page.
 */
export function buildYearlyLeaseExportRows(workspace) {
  const customers = workspace.customersData || [];
  const bottles = workspace.allBottles || [];
  const agreements = (workspace.leaseAgreements || []).filter((a) => {
    const st = String(a.status || '').toLowerCase();
    return st !== 'cancelled' && st !== 'expired' && st !== 'renewed';
  });

  const bottleCountByCustomerId = {};
  for (const b of bottles) {
    if (isBottleLostForBilling(b)) continue;
    const cid = b.assigned_customer;
    if (cid == null || cid === '') continue;
    const key = String(cid);
    bottleCountByCustomerId[key] = (bottleCountByCustomerId[key] || 0) + 1;
  }

  const norm = (v) => String(v || '').trim().toLowerCase();
  const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

  // Built once instead of doing customers.find(...) (O(customers)) per agreement inside
  // the .map() below -- same O(agreements x customers) shape as the Rentals billing bug
  // fixed earlier this session, just in the export path here instead of every render.
  const customersByKey = new Map();
  for (const c of customers) {
    const listIdKey = norm(c.CustomerListID);
    if (listIdKey) customersByKey.set(listIdKey, c);
    const idKey = norm(c.id);
    if (idKey) customersByKey.set(idKey, c);
    const nameKey = normName(c.name || c.Name);
    if (nameKey && !customersByKey.has(nameKey)) customersByKey.set(nameKey, c);
  }

  const findCustomer = (customerId, customerName) => {
    const id = norm(customerId);
    const nk = normName(customerName);
    return (id && customersByKey.get(id)) || (nk && customersByKey.get(nk)) || undefined;
  };

  return agreements
    .map((a) => {
      const dir = findCustomer(a.customer_id, a.customer_name);
      const displayName =
        dir?.name || dir?.Name || a.customer_name || a.customer_id || 'Customer';
      const customerMerged = dir
        ? { ...dir }
        : {
            name: displayName,
            Name: displayName,
            CustomerListID: a.customer_id,
            id: a.customer_id,
          };
      const cidKey = String(
        customerMerged.CustomerListID || customerMerged.id || a.customer_id || '',
      ).trim();

      let assigned = cidKey ? bottleCountByCustomerId[cidKey] || 0 : 0;
      if (assigned === 0 && cidKey) {
        for (const [k, v] of Object.entries(bottleCountByCustomerId)) {
          if (norm(k) === norm(cidKey) || norm(k) === norm(String(a.customer_id || ''))) {
            assigned = v;
            break;
          }
        }
      }

      const baseAnnual = parseFloat(a.annual_amount) || 0;
      const capRaw = a.max_asset_count;
      const capParsed =
        capRaw != null && capRaw !== '' ? parseInt(String(capRaw), 10) : NaN;
      const hasCap = Number.isFinite(capParsed) && capParsed > 0;

      let itemCount = 1;
      let totalPerCycle = baseAnnual;

      if (a.bottle_id) {
        itemCount = 1;
        totalPerCycle = baseAnnual;
      } else if (hasCap) {
        const covered = assigned <= 0 ? 0 : Math.min(assigned, capParsed);
        itemCount = covered;
        totalPerCycle = baseAnnual * covered;
      } else {
        const effective = assigned > 0 ? assigned : 1;
        itemCount = effective;
        totalPerCycle = baseAnnual * effective;
      }

      const rounded = Math.round(totalPerCycle * 100) / 100;

      return {
        id: `lease-agreement-${a.id}`,
        customer: customerMerged,
        customer_id: customerMerged.CustomerListID || customerMerged.id || a.customer_id,
        billing_period: 'yearly',
        itemCount,
        totalPerCycle: rounded,
        status: String(a.status || 'active').toLowerCase(),
        isVirtual: true,
        legacySource: 'lease_agreements',
        customer_name: displayName,
      };
    })
    .filter(
      (r) =>
        (parseFloat(r.itemCount) || 0) > 0 && (parseFloat(r.totalPerCycle) || 0) > 0,
    );
}
