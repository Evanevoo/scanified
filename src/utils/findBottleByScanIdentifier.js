import logger from './logger';

/**
 * Resolve a scanned / import identifier to a `bottles` row.
 * Tries `barcode_number`, leading-zero-stripped variant, then `serial_number`.
 */
export async function findBottleRowByScanIdentifier(supabase, organizationId, rawIdentifier) {
  const id = String(rawIdentifier ?? '').trim();
  if (!id || !organizationId) return null;

  const fetchByBarcode = async (bn) => {
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('barcode_number', bn)
      .limit(1);
    if (error) logger.warn('findBottleRowByScanIdentifier barcode:', error.message);
    return data?.[0] || null;
  };

  const byBarcode = await fetchByBarcode(id);
  if (byBarcode) return byBarcode;

  const stripped = id.replace(/^0+/, '') || id;
  if (stripped !== id) {
    const byStripped = await fetchByBarcode(stripped);
    if (byStripped) return byStripped;
  }

  const { data: serialRows, error: se } = await supabase
    .from('bottles')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('serial_number', id)
    .limit(1);
  if (se) logger.warn('findBottleRowByScanIdentifier serial:', se.message);
  if (serialRows?.[0]) return serialRows[0];

  return null;
}
