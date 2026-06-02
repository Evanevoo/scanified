jest.mock('../../utils/resolveCustomerListId', () => ({
  resolveCustomerListId: jest.fn(),
}));

import { resolveCustomerListId } from '../../utils/resolveCustomerListId';
import {
  bottleAssignedToCustomerRow,
  bottleHasStaleCustomerAssignment,
  bottleHasStaleCustomerAssignmentConfirmed,
  bottleMatchesAnyActiveCustomer,
} from '../../utils/bottleCustomerDirectory';

describe('bottleCustomerDirectory', () => {
  const saskatoon = {
    id: 'uuid-sask',
    CustomerListID: '80001234',
    name: 'Saskatoon Truck Parts Centre Ltd',
    is_active: true,
  };

  it('matches legacy assignment where assigned_customer is display name', () => {
    const bottle = {
      assigned_customer: 'Saskatoon Truck Parts Centre Ltd',
      customer_name: 'Saskatoon Truck Parts Centre Ltd',
    };
    expect(bottleAssignedToCustomerRow(bottle, saskatoon)).toBe(true);
    expect(bottleMatchesAnyActiveCustomer(bottle, [saskatoon])).toBe(true);
    expect(bottleHasStaleCustomerAssignment(bottle, [saskatoon])).toBe(false);
  });

  it('does not mark stale when only an unrelated customer is in the loaded slice', () => {
    const bottle = {
      assigned_customer: 'Saskatoon Truck Parts Centre Ltd',
      customer_name: 'Saskatoon Truck Parts Centre Ltd',
    };
    const otherOnly = [{ id: 'x', CustomerListID: 'OTHER', name: 'Other Co', is_active: true }];
    expect(bottleHasStaleCustomerAssignment(bottle, otherOnly)).toBe(true);
  });

  describe('bottleHasStaleCustomerAssignmentConfirmed', () => {
    beforeEach(() => {
      resolveCustomerListId.mockReset();
    });

    it('returns false when loaded directory slice misses customer but DB has an active match', async () => {
      const bottle = {
        customer_name: 'Saskatoon Truck Parts Centre Ltd',
        assigned_customer: 'LIST-99',
      };
      const loadedSlice = [{ id: 'other', CustomerListID: 'OTHER', name: 'Other Co', is_active: true }];
      expect(bottleHasStaleCustomerAssignment(bottle, loadedSlice)).toBe(true);

      resolveCustomerListId.mockResolvedValue({
        id: 'uuid-1',
        customerListId: 'LIST-99',
        name: 'Saskatoon Truck Parts Centre Ltd',
      });

      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'uuid-1',
                    CustomerListID: 'LIST-99',
                    name: 'Saskatoon Truck Parts Centre Ltd',
                    is_active: true,
                  },
                }),
              }),
            }),
          }),
        }),
      };

      const confirmed = await bottleHasStaleCustomerAssignmentConfirmed(
        supabase,
        'org-1',
        bottle,
        loadedSlice
      );
      expect(confirmed).toBe(false);
    });
  });
});
