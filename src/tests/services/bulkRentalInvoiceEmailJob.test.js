import {
  createBulkEmailJobController,
  runBulkRentalInvoiceEmailJob,
} from '../../services/bulkRentalInvoiceEmailJob';

jest.mock('../../supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { default_invoice_email: 'billing@test.com', email: 'org@test.com' },
        error: null,
      }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { email: 'sender@test.com' } } },
      }),
    },
  },
}));

jest.mock('../../services/invoiceEmailHistory', () => ({
  logInvoiceEmailSend: jest.fn().mockResolvedValue({
    ok: true,
    pdfArchived: true,
    pdfStoragePath: 'org/inv.pdf',
  }),
}));

function makePreviewItem(id, name, email = 'cust@test.com') {
  return {
    willSend: true,
    email,
    invoiceNumber: `INV-${id}`,
    customerName: name,
    row: {
      id: `sub-${id}`,
      customer_id: `cust-${id}`,
      customer: { name, email },
      billing_period: 'monthly',
    },
  };
}

function makeDeps(overrides = {}) {
  const doc = {
    output: jest.fn(() => 'data:application/pdf;base64,QUJD'),
  };
  return {
    organization: { id: 'org-1', name: 'Test Org', email: 'org@test.com' },
    profile: { id: 'u1', email: 'sender@test.com', full_name: 'Sender' },
    user: { id: 'u1', email: 'sender@test.com' },
    getSavedEmailTemplate: jest.fn(() => null),
    remitAddress: null,
    remitAddressBlock: '',
    matchCustomerRecordBySubscriptionId: jest.fn(() => null),
    qbCsvBillingMonth: 'live',
    buildInvoicePdfForRow: jest.fn().mockResolvedValue({
      doc,
      customerName: 'Customer',
      amountDue: 100,
      invoiceNumber: 'INV-1',
      bottles: [],
    }),
    zipGroupsCache: null,
    persistRentalInvoiceEmailSent: jest.fn().mockResolvedValue(undefined),
    withGlobalSignature: jest.fn((msg) => msg),
    ensureInvoiceContext: jest.fn((msg) => msg),
    defaultTemplateSignature: 'Thanks',
    onInvoiceSent: jest.fn(),
    ...overrides,
  };
}

describe('bulkRentalInvoiceEmailJob', () => {
  it('createBulkEmailJobController starts unpaused and not cancelled', () => {
    const c = createBulkEmailJobController();
    expect(c).toEqual({ paused: false, cancelled: false });
  });

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-1' }),
    });
  });

  it('returns zero counts when nothing to send', async () => {
    const result = await runBulkRentalInvoiceEmailJob({
      items: [{ willSend: false, customerName: 'X' }],
      controller: createBulkEmailJobController(),
      onProgress: jest.fn(),
      deps: makeDeps(),
    });
    expect(result).toEqual({
      sent: 0,
      failed: 0,
      total: 0,
      cancelled: false,
      pdfArchiveFailed: 0,
      sendErrors: [],
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends each preview item and reports progress', async () => {
    const onProgress = jest.fn();
    const deps = makeDeps();
    const items = [
      makePreviewItem('1', 'Alpha Co'),
      makePreviewItem('2', 'Beta Co'),
    ];

    const result = await runBulkRentalInvoiceEmailJob({
      items,
      controller: createBulkEmailJobController(),
      onProgress,
      deps,
    });

    expect(result).toEqual({
      sent: 2,
      failed: 0,
      total: 2,
      cancelled: false,
      pdfArchiveFailed: 0,
      sendErrors: [],
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(deps.buildInvoicePdfForRow).toHaveBeenCalledTimes(2);
    expect(deps.onInvoiceSent).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    expect(onProgress.mock.calls[0][0]).toMatchObject({ total: 2, sent: 0, failed: 0 });
  });

  it('counts failed sends when API returns non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const result = await runBulkRentalInvoiceEmailJob({
      items: [makePreviewItem('1', 'Fail Co')],
      controller: createBulkEmailJobController(),
      onProgress: jest.fn(),
      deps: makeDeps(),
    });
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.total).toBe(1);
    expect(result.sendErrors).toHaveLength(1);
  });

  it('stops after current customer when cancelled before next iteration', async () => {
    const controller = createBulkEmailJobController();
    const deps = makeDeps({
      buildInvoicePdfForRow: jest.fn().mockImplementation(async () => {
        controller.cancelled = true;
        return {
          doc: { output: () => 'data:application/pdf;base64,QUJD' },
          customerName: 'Customer',
          amountDue: 50,
          invoiceNumber: 'INV-X',
          bottles: [],
        };
      }),
    });

    const result = await runBulkRentalInvoiceEmailJob({
      items: [makePreviewItem('1', 'One'), makePreviewItem('2', 'Two')],
      controller,
      onProgress: jest.fn(),
      deps,
    });

    expect(result.sent).toBe(1);
    expect(result.total).toBe(2);
    expect(result.cancelled).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
