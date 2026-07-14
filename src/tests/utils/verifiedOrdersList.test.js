import {
  collectVerifiedOrderNumbersFromImports,
  expandImportRecordsToOrderRows,
  filterScannedOrdersWithoutImportCoverage,
  flattenImportRecordsToOrderRows,
  supplementImportRowsForScannedOrders,
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

  it('collect uses vor only on pending files (not every row on the file)', () => {
    const pending = {
      status: 'pending',
      data: {
        verified_order_numbers: ['75794'],
        rows: [{ reference_number: '75794' }, { reference_number: '75999' }],
      },
    };
    const norms = collectVerifiedOrderNumbersFromImports([[pending]], norm);
    expect(norms.has('75794')).toBe(true);
    expect(norms.has('75999')).toBe(false);
  });

  it('pending file without verified_order_numbers does not appear on Verified Orders', () => {
    const pending = {
      id: 'inv-s49665',
      status: 'pending',
      data: {
        customer_name: 'Brynn Johnson',
        rows: [{ reference_number: 'S49665', customer_name: 'Brynn Johnson' }],
      },
    };
    const rows = expandImportRecordsToOrderRows(pending, 'invoice', norm);
    expect(rows).toHaveLength(0);
  });

  it('pending file only expands orders in verified_order_numbers', () => {
    const pending = {
      id: 'inv-partial',
      status: 'pending',
      data: {
        verified_order_numbers: ['S49665'],
        rows: [
          { reference_number: 'S49665', customer_name: 'Brynn Johnson' },
          { reference_number: 'S49999', customer_name: 'Other' },
        ],
      },
    };
    const rows = expandImportRecordsToOrderRows(pending, 'invoice', norm);
    expect(rows).toHaveLength(1);
    expect(rows[0].order_number).toBe('S49665');
    expect(rows[0]._partialVerifiedOnPendingFile).toBe(true);
  });

  it('drops scanned row when import already covers order 75794', () => {
    const importRows = flattenImportRecordsToOrderRows(
      [
        {
          records: [
            {
              id: 'inv-1',
              status: 'approved',
              data: { verified_order_numbers: ['75794'], rows: [{ reference_number: '75794' }] },
            },
          ],
          tableType: 'invoice',
        },
      ],
      norm,
    );
    const scanned = [
      {
        order_number: '75794',
        type: 'scanned',
        displayType: 'Scanned Order',
      },
    ];
    expect(filterScannedOrdersWithoutImportCoverage(scanned, importRows, norm)).toHaveLength(0);
  });

  it('supplement adds invoice row when flatten missed but import file contains order', () => {
    const recordSets = [
      {
        records: [
          {
            id: 'inv-2',
            status: 'approved',
            approved_at: '2026-06-04T17:00:00.000Z',
            data: {
              verified_order_numbers: ['75794'],
              rows: [{ InvoiceNumber: '75794', customer_name: 'BCDR Mechanical Repair Services Co. Inc.' }],
            },
          },
        ],
        tableType: 'invoice',
      },
    ];
    const scanned = [{ order_number: '75794', type: 'scanned' }];
    const base = [];
    const supplemented = supplementImportRowsForScannedOrders({
      importOrderRows: base,
      scannedOrders: scanned,
      recordSets,
      normalizeOrderNum: norm,
    });
    expect(supplemented).toHaveLength(1);
    expect(supplemented[0].type).toBe('invoice');
    expect(supplemented[0].order_number).toBe('75794');
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
