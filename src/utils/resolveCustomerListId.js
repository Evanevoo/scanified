import logger from './logger';

export const CUSTOMER_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_RE = CUSTOMER_ROW_UUID_RE;

/** True if value looks like `customers.id` (Postgres uuid), not CustomerListID / numeric import PK. */
export function isCustomerRowUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

// Simple per-session cache so repeated assignments don't hammer the DB.
const memo = new Map();

const memoKey = (orgId, hint) =>
  `${orgId || ''}\t${(hint || '').toString().trim().toLowerCase()}`;

export function isTemporaryCustomerIdentity(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  // Legacy/import placeholders used for walk-ins; never assign bottles to these.
  return (
    raw.toUpperCase() === '999C' ||
    lower === 'temp' ||
    lower === 'temp customer' ||
    lower.includes('temporary') ||
    lower.includes('walk in')
  );
}

export function clearResolveCustomerListIdMemo() {
  memo.clear();
}

/**
 * Resolve any customer hint (CustomerListID, customers.id UUID, or display name)
 * to `{ id, customerListId, name }` for a given organization (`id` = `customers.id` for RPCs that require uuid).
 *
 * Returns null when we cannot confidently resolve so callers can decide what to do.
 */
export async function resolveCustomerListId(supabase, organizationId, hint) {
  if (!organizationId || !hint) return null;
  const key = memoKey(organizationId, hint);
  if (memo.has(key)) return memo.get(key);

  const raw = String(hint).trim();
  if (!raw) return null;

  const save = (row) => {
    if (!row?.id && (row?.CustomerListID == null || String(row.CustomerListID).trim() === '')) {
      memo.set(key, null);
      return null;
    }
    const listRaw = row?.CustomerListID;
    const customerListId =
      listRaw != null && String(listRaw).trim() !== '' ? String(listRaw).trim() : null;
    const out = {
      id: row.id ?? null,
      customerListId,
      name: row.name || raw,
    };
    memo.set(key, out);
    return out;
  };

  try {
    if (UUID_RE.test(raw)) {
      const { data } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('id', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('CustomerListID', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('name', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('id, CustomerListID, name')
        .eq('organization_id', organizationId)
        .ilike('name', raw)
        .limit(1);
      if (data && data.length === 1) return save(data[0]);
    }
  } catch (err) {
    logger.warn('resolveCustomerListId error:', err?.message || err);
  }

  memo.set(key, null);
  return null;
}

/**
 * Resolve order/import customer hints for bottle assignment (URL filter wins, then id, then name).
 */
export async function resolveOrderCustomerForAssignment(
  supabase,
  organizationId,
  { customerId, customerName, filterCustomerName } = {},
) {
  const urlName = String(filterCustomerName || '').trim();
  const importName = String(customerName || '').trim();
  const idHint =
    customerId != null && String(customerId).trim() !== '' ? String(customerId).trim() : '';

  for (const hint of [urlName, idHint, importName]) {
    if (!hint) continue;
    const resolved = await resolveCustomerListId(supabase, organizationId, hint);
    if (resolved?.customerListId || resolved?.id) return resolved;
  }
  return null;
}
