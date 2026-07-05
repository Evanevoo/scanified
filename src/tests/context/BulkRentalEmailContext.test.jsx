import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

jest.mock('../../supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));

jest.mock('react-hot-toast', () => {
  const toastFn = jest.fn();
  toastFn.error = jest.fn();
  toastFn.success = jest.fn();
  return { __esModule: true, default: toastFn };
});

jest.mock('../../services/bulkRentalInvoiceEmailJob', () => {
  const actual = jest.requireActual('../../services/bulkRentalInvoiceEmailJob');
  return {
    ...actual,
    runBulkRentalInvoiceEmailJob: jest.fn(),
  };
});

import {
  BulkRentalEmailProvider,
  useBulkRentalEmail,
} from '../../context/BulkRentalEmailContext';
import { runBulkRentalInvoiceEmailJob } from '../../services/bulkRentalInvoiceEmailJob';

function Harness({ onReady }) {
  const ctx = useBulkRentalEmail();
  React.useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="sent">{ctx.progress.sent}</span>
      <span data-testid="total">{ctx.progress.total}</span>
      <button type="button" onClick={() => ctx.pauseJob()}>pause</button>
      <button type="button" onClick={() => ctx.resumeJob()}>resume</button>
      <button type="button" onClick={() => ctx.cancelJob()}>cancel</button>
      <button type="button" onClick={() => ctx.dismiss()}>dismiss</button>
      <button
        type="button"
        onClick={() =>
          ctx.startJob({
            items: [
              {
                willSend: true,
                email: 'a@test.com',
                invoiceNumber: 'INV-1',
                customerName: 'A',
                row: { id: '1', customer_id: 'c1' },
              },
            ],
            deps: {},
            onComplete: jest.fn(),
          })
        }
      >
        start
      </button>
    </div>
  );
}

describe('BulkRentalEmailContext', () => {
  beforeEach(() => {
    runBulkRentalInvoiceEmailJob.mockReset();
  });

  it('runs job and marks completed on success', async () => {
    runBulkRentalInvoiceEmailJob.mockImplementation(async ({ onProgress }) => {
      onProgress({ sent: 0, failed: 0, total: 1, currentCustomerName: 'A', index: 0 });
      onProgress({ sent: 1, failed: 0, total: 1, currentCustomerName: 'A', index: 1 });
      return { sent: 1, failed: 0, total: 1, cancelled: false };
    });

    let api;
    render(
      <BulkRentalEmailProvider>
        <Harness onReady={(ctx) => { api = ctx; }} />
      </BulkRentalEmailProvider>,
    );

    await waitFor(() => expect(api).toBeDefined());

    await act(async () => {
      await api.startJob({
        items: [{
          willSend: true,
          email: 'a@test.com',
          invoiceNumber: 'INV-1',
          customerName: 'A',
          row: { id: '1', customer_id: 'c1' },
        }],
        deps: {},
      });
    });

    expect(screen.getByTestId('status').textContent).toBe('completed');
    expect(toast.success).toHaveBeenCalled();
  });

  it('rejects second concurrent start', async () => {
    let resolveJob;
    runBulkRentalInvoiceEmailJob.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveJob = () => resolve({ sent: 1, failed: 0, total: 1, cancelled: false });
        }),
    );

    let api;
    render(
      <BulkRentalEmailProvider>
        <Harness onReady={(ctx) => { api = ctx; }} />
      </BulkRentalEmailProvider>,
    );
    await waitFor(() => expect(api).toBeDefined());

    const item = {
      willSend: true,
      email: 'a@test.com',
      invoiceNumber: 'INV-1',
      customerName: 'A',
      row: { id: '1', customer_id: 'c1' },
    };

    let first;
    await act(async () => {
      first = api.startJob({ items: [item], deps: {} });
    });

    await act(async () => {
      await api.startJob({ items: [item], deps: {} });
    });
    expect(toast.error).toHaveBeenCalledWith('A bulk email job is already running.');

    await act(async () => {
      resolveJob();
      await first;
    });
  });

  it('marks cancelled when job returns cancelled flag', async () => {
    runBulkRentalInvoiceEmailJob.mockReset();
    runBulkRentalInvoiceEmailJob.mockResolvedValue({
      sent: 0,
      failed: 0,
      total: 2,
      cancelled: true,
    });

    let api;
    render(
      <BulkRentalEmailProvider>
        <Harness onReady={(ctx) => { api = ctx; }} />
      </BulkRentalEmailProvider>,
    );
    await waitFor(() => expect(api).toBeDefined());

    await act(async () => {
      await api.startJob({
        items: [{
          willSend: true,
          email: 'a@test.com',
          invoiceNumber: 'INV-1',
          customerName: 'A',
          row: { id: '1', customer_id: 'c1' },
        }],
        deps: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('cancelled');
    });
  });
});
