import { XMLParser } from 'fast-xml-parser';
import { log } from '../logger.js';

export interface ParsedCustomer {
  listId: string;
  editSequence: string;
  name: string;
  companyName?: string;
  isActive: boolean;
  accountNumber?: string;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Parse CustomerQueryRs from a QBXML response. Tolerates missing/malformed XML.
 */
export function parseCustomerQueryResponse(responseXml: string): ParsedCustomer[] {
  if (!responseXml || typeof responseXml !== 'string') {
    return [];
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    removeNSPrefix: true,
  });

  let root: unknown;
  try {
    root = parser.parse(responseXml);
  } catch (e) {
    log.warn('Failed to parse QBXML (malformed)', { message: e instanceof Error ? e.message : String(e) });
    return [];
  }

  const obj = root as Record<string, unknown>;
  const qb = (obj.QBXML ?? obj.qbxml) as Record<string, unknown> | undefined;
  const msgs = qb?.QBXMLMsgsRs as Record<string, unknown> | undefined;
  const queryRs = msgs?.CustomerQueryRs as Record<string, unknown> | undefined;
  if (!queryRs) {
    return [];
  }

  const statusCode = queryRs['@_statusCode'] ?? queryRs['@_statuscode'];
  if (statusCode !== undefined && String(statusCode) !== '0') {
    const statusMsg = queryRs['@_statusMessage'] ?? queryRs['@_statusmessage'];
    log.warn('CustomerQueryRs reported non-zero status', {
      statusCode: String(statusCode),
      statusMessage: statusMsg !== undefined ? String(statusMsg) : '',
    });
  }

  const rets = asArray<Record<string, unknown>>(queryRs.CustomerRet as Record<string, unknown> | Record<string, unknown>[]);

  const out: ParsedCustomer[] = [];
  for (const row of rets) {
    const listId = String(row.ListID ?? '').trim();
    const editSeq = String(row.EditSequence ?? '').trim();
    const name = String(row.Name ?? '').trim();
    if (!listId || !editSeq || !name) continue;

    const isActiveRaw = row.IsActive;
    const isActive = isActiveRaw === undefined || isActiveRaw === true || String(isActiveRaw).toLowerCase() === 'true';

    out.push({
      listId,
      editSequence: editSeq,
      name,
      companyName: row.CompanyName !== undefined ? String(row.CompanyName) : undefined,
      isActive,
      accountNumber: row.AccountNumber !== undefined ? String(row.AccountNumber).trim() : undefined,
    });
  }

  return out;
}

/**
 * Best-effort check for errors in CustomerModRs (batch may contain multiple).
 */
export function customerModHadErrors(responseXml: string): boolean {
  if (!responseXml) return false;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    removeNSPrefix: true,
  });
  let root: unknown;
  try {
    root = parser.parse(responseXml);
  } catch {
    return true;
  }
  const qb = (root as Record<string, unknown>).QBXML as Record<string, unknown> | undefined;
  const msgs = qb?.QBXMLMsgsRs as Record<string, unknown> | undefined;
  const modRs = msgs?.CustomerModRs;
  const rows = asArray<Record<string, unknown>>(modRs as Record<string, unknown> | Record<string, unknown>[]);
  for (const r of rows) {
    const code = r['@_statusCode'] ?? r['@_statuscode'];
    if (code !== undefined && String(code) !== '0') {
      return true;
    }
  }
  return false;
}
