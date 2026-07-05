import { parseDbTimestamp } from './parseDbTimestamp';

const US_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const expandYear = (y) => {
  const n = Number(y);
  if (!Number.isFinite(n)) return null;
  if (n >= 100) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
};

const hasTimeComponent = (raw) => {
  if (raw == null) return false;
  const s = String(raw).trim();
  return /[T\s]\d/.test(s) || /:\d{2}/.test(s);
};

/**
 * Parse invoice/receipt dates from import payloads (US slash/dash, ISO date, or DB timestamps).
 */
export function parseImportDateString(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : new Date(raw.getTime());
  }

  const s = String(raw).trim();
  if (!s) return null;

  const us = s.match(US_DATE);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = expandYear(us[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year) {
      const d = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  if (ISO_DATE_ONLY.test(s)) {
    const [, y, m, d] = s.match(ISO_DATE_ONLY);
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return parseDbTimestamp(s);
}

/**
 * Human-readable import date for Import Approvals lists.
 * Date-only values stay on the calendar day (UTC); timestamps respect timeZone.
 */
export function formatImportDateForDisplay(raw, { timeZone = 'UTC' } = {}) {
  const parsed = parseImportDateString(raw);
  if (!parsed) return String(raw ?? '').trim();

  const dateOnly = !hasTimeComponent(raw);
  const tz = dateOnly ? 'UTC' : timeZone;

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(dateOnly ? {} : { hour: 'numeric', minute: '2-digit' }),
    }).format(parsed);
  } catch {
    return parsed.toLocaleDateString('en-US');
  }
}
