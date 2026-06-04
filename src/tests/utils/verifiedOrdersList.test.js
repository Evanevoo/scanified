import {
  expandImportRecordsToOrderRows,
  flattenImportRecordsToOrderRows,
} from '../../utils/verifiedOrdersList';
import { dedupeVerifiedOrdersByOrderNumber } from '../../utils/verifiedOrdersDedup';

const norm = (n) => {
  const s = String(n).trim();
  return /^\d+$/.test(s) ? s.replace(/^0+/, '') || '0' : s;
};

describe('verifiedOrdersList', () => {
  it('expands approved import file into per-order Invoice rows', () => {
    const approvedInvoice = {
      id: 'inv-file-1',
      status: 'approved',
      approved_at: '2026-06-04T17:00:00.000Z',
      data: {
        verified_order_numbers: ['75794'],
        customer_name: 'BCDR Mechanical Repair Services Co. Inc.',
        rows: [
          {
            reference_number: '75794',
            customer_name: 'BCDR Mechanical Repair Services Co. Inc.',
          },
          {},
        ],
      },
    };
    const rows = expandImportRecordsToOrderRows(approvedInvoice, 'invoice', norm);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('invoice');
    expect(rows[0].displayType).toBe('Invoice');
    expect(rows[0].order_number).toBe('75794');
  });

  it('invoice row wins over scanned when same order (75794 case)', () => {
    const importRows = flattenImportRecordsToOrderRows(
      [
        {
          records: [
            {
              id: 'inv-1',
              status: 'approved',
              approved_at: '2026-06-04T17:00:00.000Z',
              data: { verified_order_numbers: ['75794'], rows: [{ reference_number: '75794' }, {}] },
            },
          ],
          tableType: 'invoice',
        },
      ],
      norm,
    );
    const scanned = {
      id: 'scanned_75794',
      type: 'scanned',
      displayType: 'Scanned Order',
      order_number: '75794',
      customer_name: 'BCDR Mechanical Repair Services Co. Inc.',
      verified_at: '2026-06-04T17:38:00.000Z',
      scans: [{}, {}],
    };
    const out = dedupeVerifiedOrdersByOrderNumber([...importRows, scanned]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('invoice');
    expect(out[0].displayType).toBe('Invoice');
  });
});
