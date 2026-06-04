import {
  extractOrderNumbersFromImportData,
  normalizeOrderNumForLookup,
  bottleReflectsCompletedReturn,
  isScanEffectiveForAssignmentReplay,
  scanRecordModeFamily,
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

  it('treats RETURN scans as effective for assignment replay before order verify', () => {
    const pendingReturn = {
      history_type: 'bottle_scan',
      mode: 'RETURN',
      order_number: '74914',
      scan_assignment_effective: false,
    };
    const pendingShip = {
      history_type: 'bottle_scan',
      mode: 'SHIP',
      order_number: '74914',
      scan_assignment_effective: false,
    };
    expect(isScanEffectiveForAssignmentReplay(pendingReturn)).toBe(true);
    expect(isScanEffectiveForAssignmentReplay(pendingShip)).toBe(false);
    expect(scanRecordModeFamily(pendingReturn)).toBe('RETURN');
  });
});
