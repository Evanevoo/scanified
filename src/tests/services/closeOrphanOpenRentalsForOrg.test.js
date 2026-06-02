import {
  isOrphanOpenRental,
  findOrphanOpenRentalsToClose,
  bottleAssignedToRentalCustomer,
} from '../../services/closeOrphanOpenRentalsForOrg';

const lipsett = {
  CustomerListID: '80000A64-1711661396A',
  name: 'Lipsett Cartage Ltd.',
};

describe('closeOrphanOpenRentalsForOrg', () => {
  const lookup = new Map([
    ['80000a64-1711661396a', lipsett],
    ['lipsett cartage ltd.', lipsett],
  ]);

  it('detects orphan when bottle is unassigned after return', () => {
    const rental = {
      id: 'r1',
      customer_id: '80000A64-1711661396A',
      customer_name: 'Lipsett Cartage Ltd.',
      bottle_barcode: '689486720',
    };
    const bottle = {
      id: 'b1',
      barcode_number: '689486720',
      assigned_customer: null,
      customer_name: null,
      status: 'empty',
    };
    expect(isOrphanOpenRental(rental, bottle, lookup)).toBe(true);
    expect(bottleAssignedToRentalCustomer(bottle, rental, lookup)).toBe(false);
  });

  it('keeps rental when bottle still assigned to billing customer', () => {
    const rental = {
      id: 'r1',
      customer_id: '80000A64-1711661396A',
      bottle_barcode: '689486720',
    };
    const bottle = {
      id: 'b1',
      barcode_number: '689486720',
      assigned_customer: '80000A64-1711661396A',
      customer_name: 'Lipsett Cartage Ltd.',
      status: 'rented',
    };
    expect(isOrphanOpenRental(rental, bottle, lookup)).toBe(false);
  });

  it('finds orphans in open rental list', () => {
    const openRentals = [
      {
        id: 'r1',
        customer_id: '80000A64-1711661396A',
        bottle_barcode: '689486720',
      },
      {
        id: 'r2',
        customer_id: '80000A64-1711661396A',
        bottle_barcode: '111',
      },
    ];
    const bottles = [
      {
        id: 'b1',
        barcode_number: '689486720',
        assigned_customer: null,
        customer_name: null,
      },
      {
        id: 'b2',
        barcode_number: '111',
        assigned_customer: '80000A64-1711661396A',
        customer_name: 'Lipsett Cartage Ltd.',
      },
    ];
    const found = findOrphanOpenRentalsToClose(openRentals, bottles, [lipsett]);
    expect(found.map((r) => r.id)).toEqual(['r1']);
  });
});
