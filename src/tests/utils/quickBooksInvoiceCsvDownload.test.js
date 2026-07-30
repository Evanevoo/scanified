import {
  downloadQuickBooksInvoiceCsv,
  resolveTaxCode,
  formatTrackaboutQbDate,
  buildTrackaboutQbInvoiceRow,
  TRACKABOUT_QB_EXPORT_COLUMNS,
} from '../../utils/quickBooksInvoiceCsvDownload';

describe('resolveTaxCode', () => {
  it('returns E when no tax', () => {
    expect(resolveTaxCode(0, 0)).toBe('E');
  });
  it('returns SSK when only gst (SK invoices always use combined code)', () => {
    expect(resolveTaxCode(1, 0)).toBe('SSK');
  });
  it('returns SSK when only pst', () => {
    expect(resolveTaxCode(0, 1)).toBe('SSK');
  });
  it('returns SSK when both', () => {
    expect(resolveTaxCode(1, 1)).toBe('SSK');
  });
});

describe('formatTrackaboutQbDate', () => {
  it('formats ISO dates as M/D/YYYY', () => {
    expect(formatTrackaboutQbDate('2026-03-31')).toBe('3/31/2026');
  });
});

describe('buildTrackaboutQbInvoiceRow', () => {
  it('matches Trackabout column order with P.O. last and SSK tax', () => {
    const row = buildTrackaboutQbInvoiceRow({
      invoiceNumber: 'R75879',
      customerNumber: '8000038A-1347307530A',
      subtotal: 36,
      invoiceDate: '2026-03-31',
      dueDate: '2026-04-30',
      name: 'Balzers Regina',
      purchaseOrder: 'PO-123',
    });
    expect(Object.keys(row)).toEqual(TRACKABOUT_QB_EXPORT_COLUMNS);
    expect(row['TX code']).toBe('SSK');
    expect(row.TX).toBe(3.96);
    expect(row.Total).toBe(39.96);
    expect(row.Rate).toBe(36);
    expect(row.Date).toBe('3/31/2026');
    expect(row['Due date']).toBe('4/30/2026');
    expect(row['P.O.']).toBe('PO-123');
  });
});

describe('downloadQuickBooksInvoiceCsv', () => {
  let capturedCsv;
  let downloadName;
  let blobSpy;

  beforeEach(() => {
    capturedCsv = null;
    downloadName = null;

    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();

    const RealBlob = global.Blob;
    blobSpy = jest.spyOn(global, 'Blob').mockImplementation((parts, opts) => {
      const first = parts && parts[0];
      capturedCsv = typeof first === 'string' ? first : null;
      return new RealBlob(parts, opts);
    });

    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const a = origCreate('a');
        Object.defineProperty(a, 'download', {
          configurable: true,
          set(name) {
            downloadName = name;
          },
          get() {
            return downloadName;
          },
        });
        jest.spyOn(a, 'click').mockImplementation(() => {});
        return a;
      }
      return origCreate(tag);
    });
  });

  afterEach(() => {
    if (blobSpy) blobSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('returns 0 for empty rows', () => {
    expect(downloadQuickBooksInvoiceCsv([])).toBe(0);
    expect(downloadQuickBooksInvoiceCsv(null)).toBe(0);
  });

  it('throws when rows lack invoice_number', () => {
    expect(() =>
      downloadQuickBooksInvoiceCsv([
        {
          id: 'sub-1',
          customer_id: 'CUST001',
          totalPerCycle: 100,
          itemCount: 5,
        },
      ]),
    ).toThrow(/missing invoice_number/i);
  });

  it('writes Trackabout columns with P.O. last and SSK', () => {
    const rows = [
      {
        id: 'sub-1',
        customer_id: 'CUST001',
        invoice_number: 'W00501',
        totalPerCycle: 100,
        itemCount: 5,
        billing_period: 'monthly',
        customer: { name: 'Acme Gas', purchase_order: 'PO-9' },
      },
    ];

    const n = downloadQuickBooksInvoiceCsv(rows, {
      filePrefix: 'quickbooks_invoices_test',
      invoiceDate: '2026-04-30',
      dueDate: '2026-05-31',
    });

    expect(n).toBe(1);
    expect(capturedCsv).toBeTruthy();

    const lines = capturedCsv.trim().split('\n');
    expect(lines[0]).toBe(TRACKABOUT_QB_EXPORT_COLUMNS.join(','));
    expect(lines[1]).toMatch(/^W00501,/);
    expect(lines[1]).toContain('SSK');
    expect(lines[1]).toContain('Acme Gas');
    expect(lines[1]).toMatch(/PO-9$/);
    expect(lines[1]).not.toContain('GST,');
    expect(lines[1]).not.toContain('# of Bottles');
    expect(downloadName).toBe('quickbooks_invoices_test_2026-04-30.csv');
  });
});
