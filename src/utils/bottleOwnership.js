/**
 * Customer-owned cylinders are the customer's property — not company fleet on rent.
 * Fill level (full/empty) is not tracked; status must not be "rented".
 *
 * DB column `bottles.status` is constrained by bottles_status_check (no "unknown").
 * Customer-owned "not tracked" is stored as `available` and displayed as N/A.
 */

/** Stored status for customer-owned bottles when fill/rental does not apply. */
export const CUSTOMER_OWNED_STORED_STATUS = 'available';

export function isCustomerOwnedOwnership(ownership) {
  const o = String(ownership || '').trim().toLowerCase();
  if (!o) return false;
  if (o === 'customer owned' || o.includes('customer-owned')) return true;
  if (o.includes('customer') && (o.includes('owned') || /\bown(ed)?\b/.test(o))) return true;
  return false;
}

export function normalizeBottleStatus(status) {
  if (status == null || status === '') return 'empty';
  const v = String(status).toLowerCase().trim();
  if (['filled', 'full', 'available'].includes(v)) return 'filled';
  if (v === 'empty') return 'empty';
  if (v === 'rented') return 'rented';
  if (v === 'lost') return 'lost';
  return 'empty';
}

/** Status written to DB for customer-owned bottles (must pass bottles_status_check). */
export function persistedStatusForOwnership(status, ownership) {
  const normalized = normalizeBottleStatus(status);
  if (!isCustomerOwnedOwnership(ownership)) return normalized;
  if (normalized === 'lost') return 'lost';
  if (normalized === 'rented' || normalized === 'filled' || normalized === 'empty') {
    return CUSTOMER_OWNED_STORED_STATUS;
  }
  return CUSTOMER_OWNED_STORED_STATUS;
}

/** @deprecated Use persistedStatusForOwnership */
export function coerceStatusForOwnership(status, ownership) {
  return persistedStatusForOwnership(status, ownership);
}

/** UI label — customer-owned uses N/A (fill not tracked), same as Ownership page. */
export function bottleStatusDisplayLabel(status, ownership) {
  if (isCustomerOwnedOwnership(ownership)) {
    if (normalizeBottleStatus(status) === 'lost') return 'Lost';
    return 'N/A';
  }
  const s = normalizeBottleStatus(status);
  if (s === 'filled') return 'Full';
  if (s === 'empty') return 'Empty';
  if (s === 'rented') return 'Rented';
  if (s === 'lost') return 'Lost';
  return 'Unknown';
}

export function bottleStatusChipColor(status, ownership) {
  if (isCustomerOwnedOwnership(ownership)) {
    return normalizeBottleStatus(status) === 'lost' ? 'error' : 'default';
  }
  const s = normalizeBottleStatus(status);
  if (s === 'filled') return 'success';
  if (s === 'empty') return 'warning';
  if (s === 'rented') return 'info';
  if (s === 'lost') return 'error';
  return 'default';
}
