jest.mock('jspdf', () => jest.fn());

import { averageBillableDaysForInvoiceLine } from '../../utils/rentalInvoicePdf';

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
