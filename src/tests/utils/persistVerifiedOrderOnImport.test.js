import {
  appendVerifiedOrderToImportData,
  buildAutoApproveImportRowUpdate,
} from '../../utils/persistVerifiedOrderOnImport';

describe('persistVerifiedOrderOnImport', () => {
  test('appendVerifiedOrderToImportData adds order to verified_order_numbers', () => {
    const { newData, allOrdersVerified } = appendVerifiedOrderToImportData(
      {
        rows: [{ order_number: 'S49043', product_code: 'DNS', qty_out: 1 }],
      },
      'S49043',
    );
    expect(newData.verified_order_numbers).toEqual(['S49043']);
    expect(allOrdersVerified).toBe(true);
  });

  test('appendVerifiedOrderToImportData dedupes normalized order numbers', () => {
    const { newData } = appendVerifiedOrderToImportData(
      { verified_order_numbers: ['0049043'], rows: [{ order_number: '49043' }] },
      '49043',
    );
    expect(newData.verified_order_numbers).toHaveLength(1);
  });

  test('buildAutoApproveImportRowUpdate sets approved and verified timestamps', () => {
    const { updatePayload } = buildAutoApproveImportRowUpdate(
      { rows: [{ order_number: '76455', qty_out: 1 }] },
      '76455',
      { verifiedBy: 'user-123' },
    );
    expect(updatePayload.status).toBe('approved');
    expect(updatePayload.auto_approved).toBe(true);
    expect(updatePayload.verified_by).toBe('user-123');
    expect(updatePayload.data.verified_order_numbers).toContain('76455');
    expect(updatePayload.approved_at).toBeTruthy();
    expect(updatePayload.verified_at).toBeTruthy();
  });
});
