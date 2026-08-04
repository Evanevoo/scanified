/**
 * Date/time utilities with correct local timezone handling for mobile apps.
 * Ensures displayed timestamps match the user's current location timezone.
 */

/** Get the device's IANA timezone (e.g. "America/New_York", "Australia/Sydney") */
export function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * Supabase/Postgres timestamp columns here are `timestamp without time zone`, so
 * PostgREST serializes them with no trailing Z/offset (e.g. "2026-08-02T17:00:00")
 * even though the stored instant is UTC. `new Date(isoString)` on a string with no
 * offset is parsed as *device-local* time, not UTC -- so a scan stored as 17:00 UTC
 * (10:00 local in Mountain time) rendered as-is instead of converting, showing
 * "5:00 PM" for something that actually happened at 10:00 AM. Treat any timestamp
 * with no explicit offset as UTC before constructing the Date, matching the web
 * app's `parseDbTimestamp` (src/utils/parseDbTimestamp.js).
 */
function parseDbTimestamp(isoString: string): Date {
  let s = isoString.trim();
  if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(s)) s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d)/, '$1T$2');
  if (s.endsWith('+00') || s.endsWith('-00')) s = s.slice(0, -3) + 'Z';
  const hasExplicitTz = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasExplicitTz) {
    s = s.replace(/\.\d+$/, '') + 'Z';
  }
  return new Date(s);
}

/**
 * Format an ISO date string for display in the user's local timezone.
 * Use this for all user-facing timestamps (scans, fills, etc).
 */
export function formatDateTimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = parseDbTimestamp(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    const tz = getDeviceTimezone();
    if (tz) {
      return d.toLocaleString(undefined, {
        timeZone: tz,
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date string as date-only in local timezone.
 */
export function formatDateLocal(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = parseDbTimestamp(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    const tz = getDeviceTimezone();
    if (tz) {
      return d.toLocaleDateString(undefined, { timeZone: tz });
    }
    return d.toLocaleDateString();
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date string as time-only in local timezone.
 */
export function formatTimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = parseDbTimestamp(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    const tz = getDeviceTimezone();
    if (tz) {
      return d.toLocaleTimeString(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

/**
 * Get start of today (local midnight) as ISO string for DB queries.
 * Use for "today's scans" etc - ensures correct timezone.
 */
export function getStartOfTodayISO(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

/**
 * Get end of today (local 23:59:59.999) as ISO string for DB queries.
 */
export function getEndOfTodayISO(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return end.toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone).
 * Use when you need local date for filtering.
 */
export function getTodayLocalYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
