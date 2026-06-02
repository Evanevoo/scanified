import { fetchLatestReturnScanDatesByBarcode, toYmd } from '../../services/returnScanEndDate';

describe('returnScanEndDate', () => {
  it('toYmd parses ISO timestamps and date strings', () => {
    expect(toYmd('2026-05-21T03:38:00.000Z')).toBe('2026-05-21');
    expect(toYmd('2026-05-21')).toBe('2026-05-21');
    expect(toYmd('')).toBe('');
  });

  it('fetchLatestReturnScanDatesByBarcode maps normalized barcodes', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({
                    data: [
                      {
                        bottle_barcode: '689486720',
                        timestamp: '2026-05-21T03:38:00.000Z',
                        mode: 'RETURN',
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }),
    };

    const map = await fetchLatestReturnScanDatesByBarcode(supabase, 'org-1', ['689486720']);
    expect(map.get('689486720')).toBe('2026-05-21');
  });
});
