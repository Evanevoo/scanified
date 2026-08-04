/**
 * Shared guard used everywhere a barcode gets assigned/reassigned to an order's customer
 * (bottleAssignmentService's direct-ship path, reconcileShippedBottleAssignments, and the
 * per-order "Fix delivered assignments" action): never write an assignment for an order that is
 * not the barcode's most recent scan activity anywhere in the org. Without this, fixing/approving
 * an older order after a newer delivery to a different customer already happened silently
 * reassigns the bottle back to the older (wrong) customer — confirmed on barcode 685952298
 * (delivered to a new customer 7/29, then an older 6/25 order's "fix" clobbered it back).
 */
export function normalizeOrderNumForRecency(n) {
  if (n == null || n === '') return '';
  const s = String(n).trim();
  return /^\d+$/.test(s) ? s.replace(/^0+/, '') || '0' : s;
}

/** Barcodes whose most recent bottle_scans event anywhere in the org belongs to a different order. */
export async function findStaleBarcodesForOrder(supabase, organizationId, barcodes, orderNumber) {
  const targetOrderNorm = normalizeOrderNumForRecency(orderNumber);
  const list = [...new Set((barcodes || []).map((b) => String(b || '').trim()).filter(Boolean))];
  if (!targetOrderNorm || !list.length) return new Set();

  const { data: scans } = await supabase
    .from('bottle_scans')
    .select('bottle_barcode, order_number, created_at')
    .eq('organization_id', organizationId)
    .in('bottle_barcode', list);

  const latestByBarcode = new Map();
  (scans || []).forEach((s) => {
    const bc = String(s.bottle_barcode || '').trim();
    if (!bc) return;
    const t = new Date(s.created_at || 0).getTime();
    const existing = latestByBarcode.get(bc);
    if (!existing || t >= existing.time) {
      latestByBarcode.set(bc, { orderNumber: String(s.order_number || '').trim(), time: t });
    }
  });

  const stale = new Set();
  latestByBarcode.forEach((latest, bc) => {
    if (normalizeOrderNumForRecency(latest.orderNumber) !== targetOrderNorm) stale.add(bc);
  });
  return stale;
}
