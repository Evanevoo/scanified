import logger from './logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
 * to `{ customerListId, name }` for a given organization.
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
    const out = row?.CustomerListID
      ? { customerListId: row.CustomerListID, name: row.name || raw }
      : null;
    memo.set(key, out);
    return out;
  };

  try {
    if (UUID_RE.test(raw)) {
      const { data } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('id', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('CustomerListID', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', organizationId)
        .eq('name', raw)
        .maybeSingle();
      if (data) return save(data);
    }

    {
      const { data } = await supabase
        .from('customers')
        .select('CustomerListID, name')
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
