jest.mock('../../supabase/client', () => ({
  supabase: {
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

import {
  sanitizeInvoicePdfPathSegment,
  decodePdfBase64ToBytes,
} from '../../services/invoiceEmailHistory';

describe('invoiceEmailHistory helpers', () => {
  it('sanitizes invoice numbers for storage paths', () => {
    expect(sanitizeInvoicePdfPathSegment('W00839')).toBe('W00839');
    expect(sanitizeInvoicePdfPathSegment('INV/2026#1')).toBe('INV_2026_1');
  });

  it('decodes base64 PDF payload to bytes', () => {
    const b64 = btoa('%PDF-1.4 test');
    const bytes = decodePdfBase64ToBytes(b64);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('%PDF');
  });

  it('returns null for invalid base64', () => {
    expect(decodePdfBase64ToBytes('!!!')).toBeNull();
    expect(decodePdfBase64ToBytes('')).toBeNull();
  });
});
