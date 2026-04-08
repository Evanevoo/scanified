import { createHash } from 'node:crypto';

const BARCODE_PREFIX = 'SCAN';

/**
 * Deterministic barcode from display name only (exported API).
 * Note: two different QuickBooks customers with the same Name could collide; the sync path uses
 * {@link barcodeForListIdAndName} so each ListID gets a stable unique value.
 */
export function generateBarcode(customerName: string): string {
  const normalized = customerName.trim().toLowerCase();
  const hex = createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 16);
  return `${BARCODE_PREFIX}-${hex}`;
}

/**
 * Stable, unique barcode per QuickBooks customer row (ListID + name).
 * Used when applying CustomerModRq AccountNumber (barcode field).
 */
export function barcodeForListIdAndName(listId: string, customerName: string): string {
  const payload = `${listId}\0${customerName.trim()}`;
  const hex = createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16);
  return `${BARCODE_PREFIX}-${hex}`;
}

export function shouldApplyBarcode(currentAccountNumber: string | undefined, expected: string): boolean {
  const cur = (currentAccountNumber ?? '').trim();
  return cur !== expected;
}
