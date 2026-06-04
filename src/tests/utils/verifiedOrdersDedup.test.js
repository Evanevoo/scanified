import {
  dedupeVerifiedOrdersByOrderNumber,
  normalizeVerifiedOrderNumber,
  pickPreferredVerifiedOrder,
} from '../../utils/verifiedOrdersDedup';

describe('verifiedOrdersDedup', () => {
  it('normalizes numeric order numbers', () => {
    expect(normalizeVerifiedOrderNumber('075764')).toBe('75764');
    expect(normalizeVerifiedOrderNumber('75764')).toBe('75764');
  });

  it('prefers invoice over scanned for the same order number', () => {
    const invoice = {
      id: 'inv-1',
      type: 'invoice',
      order_number: '75764',
      customer_name: 'Metal Shapes Manufacturing',
      approved_at: '2026-06-04T13:06:00.000Z',
      data_parsed: { rows: [{}, {}] },
    };
    const scanned = {
      id: 'scanned_75764',
      type: 'scanned',
      order_number: '75764',
      customer_name: 'Metal Shapes Manufacturing Saskatoon Inc.',
      verified_at: '2026-06-04T14:04:00.000Z',
      scans: [{}, {}],
    };
    expect(pickPreferredVerifiedOrder(invoice, scanned)).toBe(invoice);
    expect(pickPreferredVerifiedOrder(scanned, invoice)).toBe(invoice);

    const out = dedupeVerifiedOrdersByOrderNumber([scanned, invoice]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('invoice');
    expect(out[0].customer_name).toBe('Metal Shapes Manufacturing');
  });

  it('keeps separate rows when order numbers differ', () => {
    const a = { id: '1', type: 'invoice', order_number: '100' };
    const b = { id: '2', type: 'invoice', order_number: '200' };
    expect(dedupeVerifiedOrdersByOrderNumber([a, b])).toHaveLength(2);
  });

  it('uses latest timestamp when same type duplicates', () => {
    const older = {
      id: '1',
      type: 'invoice',
      order_number: '99',
      approved_at: '2026-01-01T00:00:00.000Z',
    };
    const newer = {
      id: '2',
      type: 'invoice',
      order_number: '99',
      approved_at: '2026-06-01T00:00:00.000Z',
    };
    const out = dedupeVerifiedOrdersByOrderNumber([older, newer]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('2');
  });
});
