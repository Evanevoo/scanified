/**
 * rentals.bottle_id FK -> bottles.id. Clear links before deleting or re-pointing bottles.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {string[]} bottleIds
 * @returns {Promise<{ error: Error | null }>}
 */
export async function clearRentalsBottleLinksForBottleIds(supabase, organizationId, bottleIds) {
  if (!organizationId || !bottleIds?.length) return { error: null };
  const { error } = await supabase
    .from('rentals')
    .update({ bottle_id: null })
    .in('bottle_id', bottleIds)
    .eq('organization_id', organizationId);
  return { error: error || null };
}

/**
 * Clear every rental row in the org that still points at a bottle (e.g. before "delete all bottles").
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @returns {Promise<{ error: Error | null }>}
 */
export async function clearAllRentalsBottleLinksForOrg(supabase, organizationId) {
  if (!organizationId) return { error: null };
  const { error } = await supabase
    .from('rentals')
    .update({ bottle_id: null })
    .eq('organization_id', organizationId)
    .not('bottle_id', 'is', null);
  return { error: error || null };
}
