import { buildOrderNumberVariants } from '../../utils/orderNumberVariants';

describe('buildOrderNumberVariants', () => {
  it('includes row-level reference numbers so scans on sibling orders are collected', () => {
    const variants = buildOrderNumberVariants('S47782', {
      recordRows: [{ reference_number: '71969', qty_out: 1 }],
    });
    expect(variants).toContain('S47782');
    expect(variants).toContain('71969');
  });

  it('adds padded and stripped numeric forms', () => {
    const variants = buildOrderNumberVariants('071760', {});
    expect(variants).toContain('071760');
    expect(variants).toContain('71760');
    expect(variants).toContain('071760'.padStart(6, '0'));
  });
});
