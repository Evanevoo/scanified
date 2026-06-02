jest.mock('jspdf', () => jest.fn());

import { computeCustomerRentalHistory } from '../../services/customerRentalHistory';
import { buildMovementByLineKeyFromCustomerHistory } from '../../services/rentalMovementForPeriod';
import { movementCountsForLine } from '../../utils/rentalInvoicePdf';

const customer = {
  id: 'cust-1',
  CustomerListID: 'cust-1',
  name: 'Acme Rentals',
};

const allCustomers = [customer];

describe('computeCustomerRentalHistory', () => {
  const ps = '2026-05-01';
  const pe = '2026-05-31';

  it('satisfies END == START + SHIP - RTN per product row', () => {
    const bottles = [
      {
        id: 'b1',
        customer_id: 'cust-1',
        product_code: 'BOX300',
        rental_start_date: '2026-04-01',
      },
      {
        id: 'b2',
        customer_id: 'cust-1',
        product_code: 'BOX300',
        rental_start_date: '2026-05-10',
      },
    ];
    const rentals = [
      {
        id: 'r1',
        customer_id: 'cust-1',
        bottle_id: 'b3',
        bottle_barcode: '9001',
        product_code: 'BOX300',
        rental_start_date: '2026-05-05',
        rental_end_date: '2026-05-20',
      },
    ];
    const { rows } = computeCustomerRentalHistory({
      rentals,
      bottles,
      customerRecord: customer,
      allCustomers,
      periodStart: ps,
      periodEnd: pe,
    });

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.endCount).toBe(row.startCount + row.ship - row.rtn);
    }
  });

  it('counts ship and return movement in the billing month', () => {
    const bottles = [];
    const rentals = [
      {
        id: 'r-ship',
        customer_id: 'cust-1',
        bottle_barcode: '8001',
        product_code: 'BAR300',
        rental_start_date: '2026-05-12',
      },
      {
        id: 'r-rtn',
        customer_id: 'cust-1',
        bottle_barcode: '8002',
        product_code: 'BAR300',
        rental_start_date: '2026-04-01',
        rental_end_date: '2026-05-18',
      },
    ];
    const { rows } = computeCustomerRentalHistory({
      rentals,
      bottles,
      customerRecord: customer,
      allCustomers,
      periodStart: ps,
      periodEnd: pe,
    });
    const bar = rows.find((r) => r.productCode === 'BAR300');
    expect(bar).toMatchObject({ ship: 1, rtn: 1 });
  });

  it('clears atEnd when unit returned in period', () => {
    const bottles = [
      {
        id: 'b-stale',
        customer_id: 'cust-1',
        product_code: 'TANK100',
        rental_start_date: '2026-04-01',
      },
    ];
    const rentals = [
      {
        id: 'r-returned',
        customer_id: 'cust-1',
        bottle_id: 'b-stale',
        product_code: 'TANK100',
        rental_start_date: '2026-04-01',
        rental_end_date: '2026-05-10',
      },
    ];
    const { rows } = computeCustomerRentalHistory({
      rentals,
      bottles,
      customerRecord: customer,
      allCustomers,
      periodStart: ps,
      periodEnd: pe,
    });
    const row = rows.find((r) => r.productCode === 'TANK100');
    expect(row).toMatchObject({ rtn: 1, endCount: 0 });
  });
});

describe('CRH ↔ PDF movement alignment', () => {
  const ps = '2026-05-01';
  const pe = '2026-05-31';

  it('matches PDF movementCountsForLine when CRH map is wired', () => {
    const bottles = [
      {
        id: 'b1',
        customer_id: 'cust-1',
        product_code: 'BOX300',
        rental_start_date: '2026-05-02',
      },
    ];
    const rentals = [
      {
        id: 'r1',
        customer_id: 'cust-1',
        bottle_barcode: '7001',
        product_code: 'BOX300',
        rental_start_date: '2026-05-08',
      },
      {
        id: 'r2',
        customer_id: 'cust-1',
        bottle_barcode: '7002',
        product_code: 'BOX300',
        rental_start_date: '2026-04-01',
        rental_end_date: '2026-05-15',
      },
    ];

    const movementByLineKey = buildMovementByLineKeyFromCustomerHistory({
      rentals,
      bottles,
      customerRecord: customer,
      allCustomers,
      periodStart: ps,
      periodEnd: pe,
    });

    const line = { description: 'BOX300', product_code: 'BOX300', qty: 2 };
    const pdfCounts = movementCountsForLine(
      line,
      ps,
      pe,
      bottles,
      rentals.filter((r) => r.rental_end_date),
      0,
      0,
      0,
      1,
      movementByLineKey,
    );

    const crh = movementByLineKey.get('box300');
    expect(crh).toBeDefined();
    expect(pdfCounts.ship).toBe(crh.ship);
    expect(pdfCounts.rtn).toBe(crh.rtn);
    expect(pdfCounts.end).toBe(2);
  });
});
