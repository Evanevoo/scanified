import { supabase } from '../supabase/client';
import logger from '../utils/logger';

/**
 * Operations queue: the set of things currently needing a human decision.
 *
 * Every query here is count-only (`head: true`) so the dashboard stays cheap no
 * matter how much history an org accumulates -- Postgres returns a count, not rows.
 *
 * Exception taxonomy (matches billingFromAssets.js / CustomerDetail):
 *   rentals.is_dns truthy                                    -> a "not scanned" exception row
 *     dns_description contains "return not on balance"       -> RNB
 *     dns_description contains "return not scanned"          -> RNS
 *     otherwise                                              -> DNS (delivered, not scanned)
 */

const RNB_MATCH = '%return not on balance%';
const RNS_MATCH = '%return not scanned%';

/** Open (unclosed) not-scanned rows for an org, optionally narrowed by description. */
function openDnsCountQuery(organizationId, descriptionMatch) {
  let q = supabase
    .from('rentals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_dns', true)
    .is('rental_end_date', null);
  if (descriptionMatch) q = q.ilike('dns_description', descriptionMatch);
  return q;
}

/**
 * Pending imports awaiting approval, plus the age of the oldest one.
 * A SHIP scan means the bottle is physically at the customer but bills nothing
 * until its order is approved -- so age here is a direct revenue-leak signal.
 */
async function fetchUnapprovedOrders(organizationId) {
  const pendingFilter = (table) =>
    supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

  const oldestFilter = (table) =>
    supabase
      .from(table)
      .select('created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

  const [invCount, recCount, invOldest, recOldest] = await Promise.all([
    pendingFilter('imported_invoices'),
    pendingFilter('imported_sales_receipts'),
    oldestFilter('imported_invoices'),
    oldestFilter('imported_sales_receipts'),
  ]);

  const count = (invCount.count || 0) + (recCount.count || 0);

  const timestamps = [invOldest.data?.[0]?.created_at, recOldest.data?.[0]?.created_at]
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((n) => Number.isFinite(n));
  const oldestMs = timestamps.length > 0 ? Math.min(...timestamps) : null;

  return {
    count,
    oldestAgeDays:
      oldestMs == null ? null : Math.floor((Date.now() - oldestMs) / 86400000),
  };
}

/**
 * One round of every queue metric. Returns partial data on failure rather than
 * throwing -- a dashboard that renders 4 of 5 tiles beats one that renders none.
 */
export async function fetchOperationsQueue(organizationId) {
  if (!organizationId) {
    return { unapprovedOrders: { count: 0, oldestAgeDays: null }, dns: 0, rnb: 0, rns: 0, lost: 0 };
  }

  try {
    const [orders, dnsTotal, rnb, rns, lost] = await Promise.all([
      fetchUnapprovedOrders(organizationId),
      openDnsCountQuery(organizationId),
      openDnsCountQuery(organizationId, RNB_MATCH),
      openDnsCountQuery(organizationId, RNS_MATCH),
      supabase
        .from('bottles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'lost'),
    ]);

    const rnbCount = rnb.count || 0;
    const rnsCount = rns.count || 0;

    return {
      unapprovedOrders: orders,
      // Plain DNS = all not-scanned rows minus the two return-exception flavours.
      dns: Math.max((dnsTotal.count || 0) - rnbCount - rnsCount, 0),
      rnb: rnbCount,
      rns: rnsCount,
      lost: lost.count || 0,
    };
  } catch (error) {
    logger.error('fetchOperationsQueue failed:', error);
    return { unapprovedOrders: { count: 0, oldestAgeDays: null }, dns: 0, rnb: 0, rns: 0, lost: 0, error: true };
  }
}
