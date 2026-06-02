/**
 * Close all open rental rows for a bottle (by bottle_id and/or barcode).
 * Use on every return path so billing stops when inventory is cleared.
 */

function barcodeVariants(raw) {
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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} organizationId
 * @param {{ bottleId?: string|null, barcode?: string|null, endDate?: string, closedByOrder?: string|null }} params
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

  let closed = 0;

  if (bottleId) {
    const { data, error } = await supabaseClient
      .from('rentals')
      .update(patch)
      .eq('organization_id', organizationId)
      .eq('bottle_id', bottleId)
      .is('rental_end_date', null)
      .select('id');
    if (error) throw error;
    closed += (data || []).length;
  }

  for (const bc of barcodes) {
    const { data, error } = await supabaseClient
      .from('rentals')
      .update(patch)
      .eq('organization_id', organizationId)
      .eq('bottle_barcode', bc)
      .is('rental_end_date', null)
      .select('id');
    if (error) throw error;
    closed += (data || []).length;
  }

  return closed;
}
