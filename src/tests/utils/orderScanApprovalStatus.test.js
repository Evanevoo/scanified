import {
  extractOrderNumbersFromImportData,
  normalizeOrderNumForLookup,
  bottleReflectsCompletedReturn,
} from '../../utils/orderScanApprovalStatus';

describe('orderScanApprovalStatus', () => {
  it('extracts sales_order_number from import payload', () => {
    const orders = extractOrderNumbersFromImportData({
      sales_order_number: '74914',
      rows: [{ order_number: 'INV-1' }],
    });
    expect(orders).toContain('74914');
    expect(orders).toContain('INV-1');
  });

  it('normalizes leading zeros on numeric orders', () => {
    expect(normalizeOrderNumForLookup('074914')).toBe('74914');
    expect(normalizeOrderNumForLookup('74914')).toBe('74914');
  });

  it('detects completed return from empty in-house bottle', () => {
    expect(
      bottleReflectsCompletedReturn({
        status: 'empty',
        location: 'In House',
        assigned_customer: null,
        customer_name: null,
      }),
    ).toBe(true);
    expect(
      bottleReflectsCompletedReturn({
        status: 'rented',
        assigned_customer: 'CUST1',
        customer_name: 'Prairie Fleet',
      }),
    ).toBe(false);
  });
});
