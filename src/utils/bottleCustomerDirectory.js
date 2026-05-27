import { isActiveCustomerRecord } from './leaseCustomerMatchKeys';

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Keys on a bottle row that may point at the customer directory. */
export function collectBottleCustomerKeys(bottle) {
  const keys = new Set();
  const add = (v) => {
    const k = normalize(String(v || '').trim());
    if (k) keys.add(k);
  };
  add(bottle?.assigned_customer);
  add(bottle?.customer_id);
  add(bottle?.customer_uuid);
  const nk = normalizeName(bottle?.customer_name);
  if (nk) keys.add(nk);
  return keys;
}

/** True when the bottle row still names a customer but no active directory row matches. */
export function bottleHasStaleCustomerAssignment(bottle, customers) {
  if (!bottle) return false;
  const keys = collectBottleCustomerKeys(bottle);
  if (keys.size === 0) return false;
  const list = customers || [];
  if (!list.length) return false;

  for (const c of list) {
    if (!isActiveCustomerRecord(c)) continue;
    const ids = [normalize(c.id), normalize(c.CustomerListID), normalize(c.customer_id)].filter(Boolean);
    if (ids.some((id) => keys.has(id))) return false;
    const nn = normalizeName(c.name || c.Name || '');
    if (nn && keys.has(nn)) return false;
  }
  return true;
}

/** Label for UI when assignment points at a removed customer (name preferred). */
export function staleBottleCustomerLabel(bottle) {
  const name = String(bottle?.customer_name || '').trim();
  if (name) return name;
  const id = String(
    bottle?.assigned_customer || bottle?.customer_id || bottle?.customer_uuid || ''
  ).trim();
  return id || 'Unknown customer';
}

/**
 * Clear bottles still pointing at a customer row that is being deleted (List ID, UUID, or leftover name).
 */
export async function unassignBottlesForRemovedCustomer(supabase, organizationId, customer) {
  if (!supabase || !organizationId || !customer) return;
  const payload = {
    assigned_customer: null,
    customer_name: null,
    customer_uuid: null,
  };
  const listId = String(customer.CustomerListID || '').trim();
  const uuid = String(customer.id || '').trim();
  const name = String(customer.name || customer.Name || '').trim();

  if (listId) {
    await supabase
      .from('bottles')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('assigned_customer', listId);
  }
  if (uuid) {
    await supabase
      .from('bottles')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('customer_uuid', uuid);
  }
  if (name) {
    await supabase
      .from('bottles')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('customer_name', name);
  }
}
