jest.mock('jspdf', () => jest.fn());

import {
  averageBillableDaysForInvoiceLine,
  daysHeldInBillingPeriod,
  movementCountsForLine,
} from '../../utils/rentalInvoicePdf';

describe('averageBillableDaysForInvoiceLine', () => {
  const ps = '2026-05-01';
  const pe = '2026-05-31';

  it('uses delivery-to-period-end for on-hand units', () => {
    const line = { description: 'BCS8-300', product_code: 'BCS8-300' };
    const bottles = [
      {
        product_code: 'BCS8-300',
        rental_start_date: '2026-05-10',
      },
    ];
    // May 10–31 inclusive = 22 days
    expect(averageBillableDaysForInvoiceLine(line, ps, pe, bottles, [])).toBe(22);
  });

  it('uses delivery-to-return for units returned in period', () => {
    const line = { description: 'BOX300', product_code: 'BOX300' };
    const returns = [
      {
        product_code: 'BOX300',
        rental_start_date: '2026-04-15',
        rental_end_date: '2026-05-15',
      },
    ];
    // Clipped to period: May 1–15 = 15 days
    expect(averageBillableDaysForInvoiceLine(line, ps, pe, [], returns)).toBe(15);
  });

  it('prefers returnScanDate over rental_end_date for billable days', () => {
    const line = { description: 'BOX300', product_code: 'BOX300' };
    const returns = [
      {
        product_code: 'BOX300',
        rental_start_date: '2026-05-01',
        rental_end_date: '2026-06-01',
        returnScanDate: '2026-05-20',
      },
    ];
    expect(averageBillableDaysForInvoiceLine(line, ps, pe, [], returns)).toBe(20);
  });

  it('averages multiple units on the same line', () => {
    const line = { description: 'BAR300', product_code: 'BAR300' };
    const bottles = [
      { product_code: 'BAR300', rental_start_date: '2026-05-01' },
      { product_code: 'BAR300', rental_start_date: '2026-05-16' },
    ];
    // 31 days + 16 days → average 24 (rounded)
    expect(averageBillableDaysForInvoiceLine(line, ps, pe, bottles, [])).toBe(24);
  });

  it('falls back to full period when no serialized rows match', () => {
    const line = { description: 'UNKNOWN', product_code: 'UNKNOWN' };
    expect(averageBillableDaysForInvoiceLine(line, ps, pe, [], [])).toBe(31);
  });
});

describe('daysHeldInBillingPeriod', () => {
  it('clips return date to billing period end', () => {
    expect(daysHeldInBillingPeriod('2026-05-01', '2026-05-20', '2026-05-01', '2026-05-31')).toBe(20);
    expect(daysHeldInBillingPeriod('2026-04-01', '2026-05-15', '2026-05-01', '2026-05-31')).toBe(15);
  });
});

describe('movementCountsForLine', () => {
  const ps = '2026-05-01';
  const pe = '2026-05-31';
  const line = { description: 'BOX300', product_code: 'BOX300', qty: 3 };

  it('shows SHIP/RTN on billed qty lines instead of zeroing them', () => {
    const bottles = [
      { product_code: 'BOX300', rental_start_date: '2026-05-02' },
      { product_code: 'BOX300', rental_start_date: '2026-05-10' },
      { product_code: 'BOX300', rental_start_date: '2026-04-01' },
    ];
    const returns = [
      { product_code: 'BOX300', rental_start_date: '2026-04-01', rental_end_date: '2026-05-15' },
    ];
    expect(
      movementCountsForLine(line, ps, pe, bottles, returns, 2, 1, 3, 1),
    ).toEqual({ ship: 2, rtn: 1, end: 3 });
  });

  it('uses global totals for a single generic rental-charges line', () => {
    const genericLine = {
      description: 'Rental charges (monthly)',
      qty: 5,
    };
    expect(
      movementCountsForLine(genericLine, ps, pe, [], [], 4, 2, 5, 1),
    ).toEqual({ ship: 4, rtn: 2, end: 5 });
  });

  it('prefers CRH movement map when provided', () => {
    const movementByLineKey = new Map([
      ['box300', { ship: 7, rtn: 3, end: 10, start: 6 }],
    ]);
    expect(
      movementCountsForLine(line, ps, pe, [], [], 0, 0, 0, 1, movementByLineKey),
    ).toEqual({ ship: 7, rtn: 3, end: 3 });
  });
});
