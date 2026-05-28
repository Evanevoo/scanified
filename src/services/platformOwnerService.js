import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Batch tenant metrics for owner portal (requires get_tenant_summaries RPC).
 * @param {string[]} orgIds
 * @returns {Promise<Map<string, { userCount: number, customerCount: number, bottleCount: number, contactEmail: string }>>}
 */
export async function fetchTenantSummaries(orgIds) {
  const map = new Map();
  if (!orgIds?.length) return map;

  const { data, error } = await supabase.rpc('get_tenant_summaries', {
    p_org_ids: orgIds,
  });

  if (error) {
    logger.warn('get_tenant_summaries RPC unavailable, caller may fall back:', error.message);
    return map;
  }

  for (const row of data || []) {
    map.set(row.organization_id, {
      userCount: Number(row.user_count) || 0,
      customerCount: Number(row.customer_count) || 0,
      bottleCount: Number(row.bottle_count) || 0,
      contactEmail: row.contact_email || 'No contact found',
    });
  }
  return map;
}
