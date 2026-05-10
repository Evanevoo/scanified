import {
  downloadQuickBooksInvoiceCsv,
  resolveTaxCode,
  QB_CSV_LAST_INV_MAP_KEY,
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
  let mockSessionStorage;

  beforeEach(() => {
    capturedCsv = null;
    downloadName = null;

    const ls = {
      getItem: jest.fn((key) => {
        if (key === 'invoice_state') return '{}';
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    mockSessionStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: ls,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: ls,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

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

  it('writes CSV with QuickBooks-oriented columns and W invoice numbers', () => {
    const rows = [
      {
        id: 'sub-1',
        customer_id: 'CUST001',
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
      sequenceMonth: '2026-04',
    });

    expect(n).toBe(1);
    expect(capturedCsv).toBeTruthy();

    const lines = capturedCsv.trim().split('\n');
    expect(lines.length).toBe(2);

    const header = lines[0];
    expect(header).toContain('Invoice#');
    expect(header).toContain('Customer Number');
    expect(header).toContain('Total');
    expect(header).toContain('Date');
    expect(header).toContain('GST');
    expect(header).toContain('PST');
    expect(header).toContain('TX');
    expect(header).toContain('TX code');
    expect(header).toContain('Due date');
    expect(header).toContain('Rate');
    expect(header).toContain('Name');
    expect(header).toContain('# of Bottles');

    const dataLine = lines[1];
    expect(dataLine).toMatch(/^W\d{5},/);
    expect(dataLine).toContain('CUST001');
    expect(dataLine).toContain('Acme Gas');
    expect(downloadName).toBe('quickbooks_invoices_test_2026-04-30.csv');

    expect(mockSessionStorage.setItem).toHaveBeenCalled();
    const mapCall = mockSessionStorage.setItem.mock.calls.find(
      (c) => c[0] === QB_CSV_LAST_INV_MAP_KEY,
    );
    expect(mapCall).toBeTruthy();
    const payload = JSON.parse(mapCall[1]);
    expect(payload.seqMonth).toBe('2026-04');
    expect(payload.byRowKey).toBeDefined();
  });
});
