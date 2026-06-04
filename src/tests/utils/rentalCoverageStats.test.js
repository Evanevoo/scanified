import {
  countCustomersWithOpenRentals,
  rentalCoveragePercent,
} from '../../utils/rentalCoverageStats';

describe('rentalCoverageStats', () => {
  it('counts distinct customer_id on open rentals', () => {
    const rentals = [
      { customer_id: 'A' },
      { customer_id: 'A' },
      { customer_id: 'B' },
      { customer_id: '' },
      { customer_id: null },
    ];
    expect(countCustomersWithOpenRentals(rentals)).toBe(2);
  });

  it('does not treat row count as customer coverage', () => {
    const rentals = Array.from({ length: 50 }, (_, i) => ({ customer_id: 'CUST-1' }));
    expect(rentalCoveragePercent(countCustomersWithOpenRentals(rentals), 40)).toBe(3);
    expect(rentalCoveragePercent(50, 40)).toBe(100);
  });

  it('returns 0 when there are no customers', () => {
    expect(rentalCoveragePercent(5, 0)).toBe(0);
  });
});
