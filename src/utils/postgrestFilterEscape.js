/**
 * PostgREST `.or()` / `.filter()` embeds patterns as `column.operator.value`.
 * Unquoted values containing `:`, `(`, `)`, `,`, etc. break the logic parser (PGRST100).
 * @see https://postgrest.org/en/stable/references/api/tables_views.html#reserved-characters
 */

/** Limits pasted blobs from blowing URL size and suggestion latency */
export const POSTGREST_SEARCH_TERM_MAX_LENGTH = 200;

export function sanitizePostgrestSearchTerm(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  const firstLine = s.split(/\r?\n/)[0].trim();
  return firstLine.slice(0, POSTGREST_SEARCH_TERM_MAX_LENGTH);
}

export function escapePostgrestFilterLiteral(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Operand for `column.ilike.<quoted %term%>` — null if nothing searchable remains */
export function postgrestQuotedIlikeContains(rawTerm) {
  const term = sanitizePostgrestSearchTerm(rawTerm);
  if (!term) return null;
  return escapePostgrestFilterLiteral(`%${term}%`);
}
