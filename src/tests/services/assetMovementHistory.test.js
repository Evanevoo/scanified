import {
  dedupeSemanticMovementHistory,
  suppressRedundantRentalEndReturns,
} from '../../services/assetMovementHistory';

describe('assetMovementHistory dedupe', () => {
  it('keeps RETURN scan and drops rental_end when billing closed days later', () => {
    const items = [
      {
        id: 'scan-1',
        history_type: 'bottle_scan',
        mode: 'RETURN',
        barcode_number: '689486720',
        customer_id: '80000A64-1711661396A',
        customer_name: 'Lipsett Cartage Ltd.',
        created_at: '2026-05-21T03:38:00.000Z',
      },
      {
        id: 'rental_end_1',
        history_type: 'rental_end',
        barcode_number: '689486720',
        customer_id: '80000A64-1711661396A',
        customer_name: 'Lipsett Cartage Ltd.',
        created_at: '2026-06-01',
        mode: 'RETURN',
      },
    ];
    const out = suppressRedundantRentalEndReturns(dedupeSemanticMovementHistory(items));
    expect(out.some((r) => r.id === 'scan-1')).toBe(true);
    expect(out.some((r) => r.id === 'rental_end_1')).toBe(false);
  });

  it('keeps rental_end when no RETURN scan exists', () => {
    const items = [
      {
        id: 'rental_end_1',
        history_type: 'rental_end',
        barcode_number: '689486720',
        created_at: '2026-06-01',
        mode: 'RETURN',
      },
    ];
    const out = suppressRedundantRentalEndReturns(items);
    expect(out).toHaveLength(1);
  });
});
