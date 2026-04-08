/**
 * Simple structured logging for QBWC traffic (QBXML and SOAP context).
 */

const prefix = '[Scanified QBWC]';

export const log = {
  info(message: string, meta?: Record<string, unknown>): void {
    if (meta !== undefined) {
      console.log(prefix, message, meta);
    } else {
      console.log(prefix, message);
    }
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(prefix, message, meta ?? '');
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(prefix, message, meta ?? '');
  },

  /** Full QBXML payloads (can be large). */
  qbxml(direction: 'SENT' | 'RECV', xml: string): void {
    const trimmed = xml.length > 8000 ? `${xml.slice(0, 8000)}\n... [truncated]` : xml;
    console.log(prefix, `QBXML ${direction}:`, trimmed);
  },
};
