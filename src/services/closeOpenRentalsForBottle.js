/**
 * Close open rental rows for a bottle (by bottle_id and/or barcode).
 * Use on every return path so billing stops when inventory is cleared.
 */

export function barcodeVariants(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  const out = new Set([s]);
  const noLead = s.replace(/^0+/, '') || '0';
  out.add(noLead);
  if (/^\d+$/.test(noLead)) {
    out.add(noLead.padStart(5, '0'));
    out.add(noLead.padStart(6, '0'));
  }
  return [...out];
}

const norm = (v) => String(v || '').trim().toLowerCase();

function buildCustomerOrFilter(customerKeys) {
  const keys = [...new Set((customerKeys || []).map(norm).filter(Boolean))];
  if (!keys.length) return null;
  const parts = [];
  for (const k of keys) {
    parts.push(`customer_id.eq.${k}`, `customer_name.eq.${k}`);
  }
  return parts.join(',');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {{ bottleId?: string|null, barcode?: string|null, endDate?: string, closedByOrder?: string|null, customerKeys?: string[] }} params
 * @returns {Promise<number>} count of rental rows updated (best effort)
 */
export async function closeOpenRentalsForBottle(supabaseClient, organizationId, params = {}) {
  if (!organizationId) return 0;
  const endDate = params.endDate || new Date().toISOString().split('T')[0];
  const updatedAt = new Date().toISOString();
  const patch = {
    rental_end_date: endDate,
    updated_at: updatedAt,
  };
  if (params.closedByOrder) {
    patch.closed_by_order = String(params.closedByOrder).trim();
  }

  const bottleId = params.bottleId != null ? String(params.bottleId).trim() : '';
  const barcodes = barcodeVariants(params.barcode);
  const customerOr = buildCustomerOrFilter(params.customerKeys);
  const closedIds = new Set();

  const runUpdate = async (queryFactory) => {
    const { data, error } = await queryFactory();
    if (error) throw error;
    for (const row of data || []) {
      if (row?.id != null) closedIds.add(String(row.id));
    }
  };

  if (bottleId) {
    await runUpdate(() => {
      let q = supabaseClient
        .from('rentals')
        .update(patch)
        .eq('organization_id', organizationId)
        .eq('bottle_id', bottleId)
        .is('rental_end_date', null);
      if (customerOr) q = q.or(customerOr);
      return q.select('id');
    });
  }

  for (const bc of barcodes) {
    await runUpdate(() => {
      let q = supabaseClient
        .from('rentals')
        .update(patch)
        .eq('organization_id', organizationId)
        .eq('bottle_barcode', bc)
        .is('rental_end_date', null);
      if (customerOr) q = q.or(customerOr);
      return q.select('id');
    });
  }

  return closedIds.size;
}
