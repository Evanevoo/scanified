import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalBulkRentalEmailProgress from '../../components/GlobalBulkRentalEmailProgress';

const mockCtx = {
  active: true,
  status: 'running',
  progress: { sent: 1, failed: 0, total: 3, currentCustomerName: 'Acme', index: 1 },
  resultSummary: '',
  pauseJob: jest.fn(),
  resumeJob: jest.fn(),
  cancelJob: jest.fn(),
  dismiss: jest.fn(),
};

jest.mock('../../context/BulkRentalEmailContext', () => ({
  useBulkRentalEmail: () => mockCtx,
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ accent: 'teal' }),
  resolveAccentToHex: () => '#40B5AD',
}));

describe('GlobalBulkRentalEmailProgress', () => {
  beforeEach(() => {
    mockCtx.active = true;
    mockCtx.status = 'running';
    mockCtx.progress = { sent: 1, failed: 0, total: 3, currentCustomerName: 'Acme', index: 1 };
    mockCtx.resultSummary = '';
    jest.clearAllMocks();
  });

  it('shows progress and control buttons while running', () => {
    render(<GlobalBulkRentalEmailProgress />);
    expect(screen.getByText(/Sending rental invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/1 sent · 0 failed · 1\/3/i)).toBeInTheDocument();
    expect(screen.getByText(/Acme/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(mockCtx.pauseJob).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockCtx.cancelJob).toHaveBeenCalled();
  });

  it('shows dismiss when finished', () => {
    mockCtx.active = false;
    mockCtx.status = 'completed';
    mockCtx.resultSummary = 'Sent 3/3 invoices successfully.';
    render(<GlobalBulkRentalEmailProgress />);
    expect(screen.getByText(/Bulk email finished/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Dismiss'));
    expect(mockCtx.dismiss).toHaveBeenCalled();
  });
});
