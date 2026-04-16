/**
 * Parse DB timestamps for display/sorting in the browser.
 * Supabase/Postgres often return ISO without Z (e.g. "2026-03-18T14:19:00");
 * in JS that parses as *local* time and shifts the instant. Values without an
 * explicit offset are treated as UTC (matches typical server-stored timestamps).
 */
export function parseDbTimestamp(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : new Date(t);
  }
  let s = typeof value === 'string' ? value.trim() : String(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(s)) s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d)/, '$1T$2');
  if (s.endsWith('+00') || s.endsWith('-00')) s = s.slice(0, -3) + 'Z';
  const hasExplicitTz = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasExplicitTz) {
    s = s.replace(/\.\d+$/, '') + 'Z';
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
