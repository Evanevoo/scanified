import {
  buildOpenRentalsBillingIndex,
  mergeOpenRentalsForBillingBasis,
  mergeOpenRentalsForBillingBasisFromIndex,
} from '../../services/openRentalsBillingBasis';

describe('openRentalsBillingBasis index', () => {
  const openRentals = [
    { id: 'r1', customer_id: 'LIST-1', customer_name: 'Acme', bottle_id: 'b1', rental_start_date: '2024-01-01' },
    { id: 'r2', customer_id: 'LIST-1', customer_name: 'Acme', bottle_id: 'b2', rental_start_date: '2024-02-01' },
    { id: 'r3', customer_id: 'Other', customer_name: 'Beta', bottle_id: 'b3', rental_start_date: '2024-01-15' },
  ];

  it('indexed merge matches full scan merge', () => {
    const index = buildOpenRentalsBillingIndex(openRentals);
    const keys = { customerListId: 'LIST-1', customerName: 'Acme', customerPkId: '' };
    const fromIndex = mergeOpenRentalsForBillingBasisFromIndex(index, keys);
    const fromScan = mergeOpenRentalsForBillingBasis(openRentals, keys);
    expect(fromIndex.map((r) => r.id).sort()).toEqual(fromScan.map((r) => r.id).sort());
  });
});
