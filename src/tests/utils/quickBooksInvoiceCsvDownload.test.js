import {
  downloadQuickBooksInvoiceCsv,
  resolveTaxCode,
} from '../../utils/quickBooksInvoiceCsvDownload';

describe('resolveTaxCode', () => {
  it('returns E when no tax', () => {
    expect(resolveTaxCode(0, 0)).toBe('E');
  });
  it('returns GST when only gst', () => {
    expect(resolveTaxCode(1, 0)).toBe('GST');
  });
  it('returns PST when only pst', () => {
    expect(resolveTaxCode(0, 1)).toBe('PST');
  });
  it('returns SSK when both', () => {
    expect(resolveTaxCode(1, 1)).toBe('SSK');
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

  it('writes CSV using pre-resolved invoice numbers only', () => {
    const rows = [
      {
        id: 'sub-1',
        customer_id: 'CUST001',
        invoice_number: 'W00501',
        totalPerCycle: 100,
        itemCount: 5,
        billing_period: 'monthly',
        customer: { name: 'Acme Gas' },
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
    expect(lines.length).toBe(2);
    expect(lines[1]).toMatch(/^W00501,/);
    expect(lines[1]).toContain('CUST001');
    expect(lines[1]).toContain('Acme Gas');
    expect(downloadName).toBe('quickbooks_invoices_test_2026-04-30.csv');
  });
});
