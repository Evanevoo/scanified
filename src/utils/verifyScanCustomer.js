import logger from './logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let resolveMemo = new Map();

export function clearVerifyScanCustomerMemo() {
  resolveMemo = new Map();
}

/**
 * Resolve scan payload (mobile may store customers.id UUID or CustomerListID) to CustomerListID + name.
 */
export async function resolveCustomerToListId(supabase, organizationId, customerId, customerName) {
  if (!organizationId) return null;
  const cacheKey = `${customerId || ''}\t${(customerName || '').trim()}`;
  if (resolveMemo.has(cacheKey)) return resolveMemo.get(cacheKey);

  const finish = (row) => {
    const out = row?.CustomerListID
      ? { customerListId: row.CustomerListID, name: row.name || (customerName || '').trim() || '' }
      : null;
    resolveMemo.set(cacheKey, out);
    return out;
  };

  if (customerId && UUID_RE.test(String(customerId))) {
    const { data } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .eq('organization_id', organizationId)
      .eq('id', customerId)
      .maybeSingle();
    const resolved = finish(data);
    if (resolved) return resolved;
  }
  if (customerId) {
    const { data } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .eq('organization_id', organizationId)
      .eq('CustomerListID', String(customerId))
      .maybeSingle();
    const resolved = finish(data);
    if (resolved) return resolved;
  }
  const nameTrim = (customerName || '').trim();
  if (nameTrim) {
    const { data } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .eq('organization_id', organizationId)
      .eq('name', nameTrim)
      .maybeSingle();
    const resolved = finish(data);
    if (resolved) return resolved;
  }
  resolveMemo.set(cacheKey, null);
  return null;
}

/**
 * When verifying, invoice customer is often wrong vs the handset. If every SHIP barcode on this order
 * has the same non-empty customer on bottle_scans, use that for assignment instead of the import row.
 * @returns {null|{customerListId: string, name: string}|'CONFLICT'}
 */
export async function getUnanimousShipScanCustomer(
  supabase,
  organizationId,
  shipBarcodesUnique,
  bottleScanRows,
  normalizeBarcode
) {
  if (!organizationId || !shipBarcodesUnique.length) return null;

  clearVerifyScanCustomerMemo();

  const scanByNorm = new Map();
  (bottleScanRows || []).forEach((scan) => {
    const modeUpper = (scan.mode || '').toString().toUpperCase();
    if (modeUpper !== 'SHIP' && modeUpper !== 'DELIVERY') return;
    const bc = scan.bottle_barcode;
    if (!bc) return;
    const norm = normalizeBarcode(bc);
    if (!norm) return;
    const time = new Date(scan.timestamp || scan.created_at || 0).getTime();
    const existing = scanByNorm.get(norm);
    if (!existing || time >= existing.time) {
      scanByNorm.set(norm, {
        time,
        customer_id: scan.customer_id,
        customer_name: scan.customer_name,
      });
    }
  });

  const resolutions = [];
  for (const rawBc of shipBarcodesUnique) {
    const sc = scanByNorm.get(normalizeBarcode(rawBc));
    const hasCustomer =
      sc && (sc.customer_id || (sc.customer_name && String(sc.customer_name).trim()));
    if (!hasCustomer) return null;
    const resolved = await resolveCustomerToListId(supabase, organizationId, sc.customer_id, sc.customer_name);
    if (!resolved) {
      logger.warn('getUnanimousShipScanCustomer: could not resolve scan customer to CustomerListID', {
        rawBc,
        sc,
      });
      return null;
    }
    resolutions.push(resolved);
  }

  const firstId = resolutions[0].customerListId;
  const allSame = resolutions.every((r) => String(r.customerListId) === String(firstId));
  if (!allSame) return 'CONFLICT';
  return { customerListId: firstId, name: resolutions[0].name };
}
