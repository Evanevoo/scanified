/**
 * Home dashboard "Rental coverage": share of customers with at least one open rental row.
 * Not open-rental-row count ÷ customers (that caps at 100% when rows ≥ customers).
 */

export function countCustomersWithOpenRentals(rentals) {
  const seen = new Set();
  for (const r of rentals || []) {
    const id = String(r?.customer_id ?? '').trim();
    if (id) seen.add(id);
  }
  return seen.size;
}

export function rentalCoveragePercent(customersWithBalance, totalCustomers) {
  const total = Number(totalCustomers) || 0;
  const withBalance = Number(customersWithBalance) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((withBalance / total) * 100));
}
