import { closeOpenRentalsForBottle } from '../../services/closeOpenRentalsForBottle';
import { finalizeVerifiedReturnBarcodes } from '../../services/finalizeVerifiedReturnBarcodes';
import { toYmd } from '../../services/returnScanEndDate';

jest.mock('../../utils/findBottleByScanIdentifier', () => ({
  findBottleRowByScanIdentifier: jest.fn(),
}));

jest.mock('../../utils/resolveCustomerListId', () => ({
  resolveCustomerListId: jest.fn(),
}));

import { findBottleRowByScanIdentifier } from '../../utils/findBottleByScanIdentifier';
import { resolveCustomerListId } from '../../utils/resolveCustomerListId';

function mockSupabaseForFinalize({ scanTimestamp } = {}) {
  const rentalPatches = [];
  const supabase = {
    from(table) {
      if (table === 'bottle_scans') {
        const scanChain = {
          eq: () => scanChain,
          order: () => ({
            limit: () => {
              const result = Promise.resolve({
                data: scanTimestamp
                  ? [{ timestamp: scanTimestamp, mode: 'RETURN' }]
                  : [],
                error: null,
              });
              result.eq = () => result;
              return result;
            },
          }),
        };
        return { select: () => scanChain };
      }
      if (table === 'rentals') {
        const chain = {
          eq: () => chain,
          or: () => chain,
          is: () => chain,
          select: () => Promise.resolve({ data: [{ id: 'rental-1' }], error: null }),
          update: (patch) => {
            rentalPatches.push(patch);
            return chain;
          },
        };
        return chain;
      }
      if (table === 'bottles') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
    rentalPatches,
  };
  return supabase;
}

describe('closeOpenRentalsForBottle', () => {
  it('dedupes rental ids when matching bottle_id and barcode', async () => {
    const patches = [];
    const supabase = {
      from: () => {
        const chain = {
          eq: () => chain,
          or: () => chain,
          is: () => chain,
          select: () => Promise.resolve({ data: [{ id: 'same-id' }], error: null }),
          update: (patch) => {
            patches.push(patch);
            return chain;
          },
        };
        return chain;
      },
    };

    const closed = await closeOpenRentalsForBottle(supabase, 'org-1', {
      bottleId: 'b1',
      barcode: '689486720',
      endDate: '2026-05-21',
      customerKeys: ['80000a64-1711661396a'],
    });

    expect(closed).toBe(1);
    expect(patches[0].rental_end_date).toBe('2026-05-21');
  });
});

describe('finalizeVerifiedReturnBarcodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveCustomerListId.mockResolvedValue({
      customerListId: '80000A64-1711661396A',
      name: 'Lipsett Cartage Ltd.',
    });
  });

  it('closes rental with scan date and unassigns bottle still on verify customer', async () => {
    findBottleRowByScanIdentifier.mockResolvedValue({
      id: 'b1',
      barcode_number: '689486720',
      assigned_customer: '80000A64-1711661396A',
      customer_name: 'Lipsett Cartage Ltd.',
    });

    const supabase = mockSupabaseForFinalize({ scanTimestamp: '2026-05-21T03:38:00.000Z' });

    const result = await finalizeVerifiedReturnBarcodes(supabase, 'org-1', {
      returnBarcodes: ['689486720'],
      customerId: '80000A64-1711661396A',
      customerName: 'Lipsett Cartage Ltd.',
      orderNumber: '74914',
      endDate: '2026-06-01',
    });

    expect(result.rentalsClosed).toBeGreaterThan(0);
    expect(result.bottlesUnassigned).toBe(1);
    expect(supabase.rentalPatches[0]?.rental_end_date).toBe('2026-05-21');
  });

  it('closes rental when bottle already unassigned (orphan)', async () => {
    findBottleRowByScanIdentifier.mockResolvedValue({
      id: 'b1',
      barcode_number: '660330800',
      assigned_customer: null,
      customer_name: null,
      status: 'empty',
    });

    const supabase = mockSupabaseForFinalize({ scanTimestamp: '2026-05-13T12:00:00.000Z' });

    const result = await finalizeVerifiedReturnBarcodes(supabase, 'org-1', {
      returnBarcodes: ['660330800'],
      customerId: 'cust-deleted',
      customerName: 'Prairie Fleet Services',
    });

    expect(result.rentalsClosed).toBeGreaterThan(0);
    expect(result.bottlesUnassigned).toBe(0);
  });

  it('returns zero when no barcodes provided', async () => {
    const result = await finalizeVerifiedReturnBarcodes({}, 'org-1', { returnBarcodes: [] });
    expect(result).toEqual({ rentalsClosed: 0, bottlesUnassigned: 0 });
  });
});

describe('returnScanEndDate toYmd', () => {
  it('parses ISO timestamps', () => {
    expect(toYmd('2026-05-21T03:38:00.000Z')).toBe('2026-05-21');
    expect(toYmd('2026-05-21')).toBe('2026-05-21');
  });
});
