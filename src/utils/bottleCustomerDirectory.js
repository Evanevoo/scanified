import { isActiveCustomerRecord } from './leaseCustomerMatchKeys';
import { resolveCustomerListId } from './resolveCustomerListId';

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

const CUSTOMER_PK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Same rules as CustomerDetail `bottleAssignedToCurrentCustomer` — List ID, UUID pk, or legacy display name on any assignment field.
 */
export function bottleAssignedToCustomerRow(bottle, customer) {
  if (!bottle || !customer) return false;
  const listId = String(customer.CustomerListID || '').trim();
  const pk = String(customer.id || customer.customer_id || '').trim();
  const name = String(customer.name || customer.Name || '').trim();

  const ac = String(bottle.assigned_customer ?? '').trim();
  const cu = String(bottle.customer_uuid ?? bottle.customer_id ?? '').trim();
  const cn = String(bottle.customer_name ?? '').trim();

  if (listId && (ac === listId || cu === listId)) return true;
  if (pk && CUSTOMER_PK_UUID_RE.test(pk) && (ac === pk || cu === pk)) return true;
  if (name && (ac === name || cu === name || cn === name)) return true;
  if (name) {
    const nn = normalizeName(name);
    if (nn && (normalizeName(ac) === nn || normalizeName(cn) === nn)) return true;
  }
  return false;
}

/** True when any active directory row matches this bottle (including legacy name-on-assigned_customer). */
export function bottleMatchesAnyActiveCustomer(bottle, customers) {
  if (!bottle || !customers?.length) return false;
  for (const c of customers) {
    if (!isActiveCustomerRecord(c)) continue;
    if (bottleAssignedToCustomerRow(bottle, c)) return true;
  }
  return false;
}

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
  if (bottleMatchesAnyActiveCustomer(bottle, list)) return false;

  // Fallback: normalized id/name keys (handles minor directory field variants).
  for (const c of list) {
    if (!isActiveCustomerRecord(c)) continue;
    const ids = [normalize(c.id), normalize(c.CustomerListID), normalize(c.customer_id)].filter(Boolean);
    if (ids.some((id) => keys.has(id))) return false;
    const nn = normalizeName(c.name || c.Name || '');
    if (nn && keys.has(nn)) return false;
  }
  return true;
}

/** True when assignment is empty or matches an active customer in the directory. */
export function isActiveCustomerAssignment(assignedCustomerId, customerName, customers) {
  if (!String(assignedCustomerId || '').trim() && !String(customerName || '').trim()) return true;
  return !bottleHasStaleCustomerAssignment(
    { assigned_customer: assignedCustomerId, customer_name: customerName },
    customers
  );
}

/**
 * Look up an active customer row for this bottle's assignment hints (DB), even when the
 * in-memory directory slice (e.g. first 1000 customers on Asset Detail) did not include a match.
 */
export async function findActiveCustomerForBottle(supabase, organizationId, bottle) {
  if (!supabase || !organizationId || !bottle) return null;

  const selectCols =
    'id, CustomerListID, name, Name, is_active, is_deleted, deleted_at, archived, customer_id';

  const tryRow = (row) => {
    if (row && isActiveCustomerRecord(row) && bottleAssignedToCustomerRow(bottle, row)) return row;
    return null;
  };

  const hints = [
    bottle.assigned_customer,
    bottle.customer_uuid,
    bottle.customer_id,
    bottle.customer_name,
  ]
    .map((h) => String(h || '').trim())
    .filter(Boolean);
  const seen = new Set();

  for (const hint of hints) {
    const key = hint.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const resolved = await resolveCustomerListId(supabase, organizationId, hint);
    if (resolved?.id || resolved?.customerListId) {
      let query = supabase.from('customers').select(selectCols).eq('organization_id', organizationId);
      if (resolved.id) {
        query = query.eq('id', resolved.id);
      } else {
        query = query.eq('CustomerListID', resolved.customerListId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        const hit = tryRow(data);
        if (hit) return hit;
      }
    }

    if (CUSTOMER_PK_UUID_RE.test(hint)) {
      const { data } = await supabase
        .from('customers')
        .select(selectCols)
        .eq('organization_id', organizationId)
        .eq('id', hint)
        .maybeSingle();
      const hit = tryRow(data);
      if (hit) return hit;
    }

    const { data: byList } = await supabase
      .from('customers')
      .select(selectCols)
      .eq('organization_id', organizationId)
      .eq('CustomerListID', hint)
      .maybeSingle();
    const listHit = tryRow(byList);
    if (listHit) return listHit;

    const { data: byNameRows } = await supabase
      .from('customers')
      .select(selectCols)
      .eq('organization_id', organizationId)
      .ilike('name', hint)
      .limit(5);
    for (const row of byNameRows || []) {
      const hit = tryRow(row);
      if (hit) return hit;
    }
  }

  return null;
}

/** True only when assignment hints exist and no active customer matches in memory or DB. */
export async function bottleHasStaleCustomerAssignmentConfirmed(
  supabase,
  organizationId,
  bottle,
  customers
) {
  if (!bottleHasStaleCustomerAssignment(bottle, customers)) return false;
  const active = await findActiveCustomerForBottle(supabase, organizationId, bottle);
  return !active;
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
