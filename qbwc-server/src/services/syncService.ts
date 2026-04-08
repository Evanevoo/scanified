import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCustomerModBatchRq,
  buildCustomerQueryRq,
  wrapQbxmlMessage,
  type CustomerModInput,
} from '../qbxml/builders.js';
import { barcodeForListIdAndName, generateBarcode, shouldApplyBarcode } from './barcodeService.js';
import { customerModHadErrors, parseCustomerQueryResponse, type ParsedCustomer } from '../qbxml/parsers.js';
import { log } from '../logger.js';
import type { WcSession } from '../store/sessionStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
const lastCustomersPath = join(dataDir, 'last-customers.json');

export interface SyncedCustomerSnapshot extends ParsedCustomer {
  /** Barcode we expect in AccountNumber (ListID-based). */
  expectedBarcode: string;
  /** Result of generateBarcode(name) for API consumers. */
  nameOnlyBarcode: string;
}

let lastSyncedCustomers: SyncedCustomerSnapshot[] = [];
let manualSyncRequested = false;

export function requestManualSync(): void {
  manualSyncRequested = true;
  log.info('Manual sync requested via REST');
}

export function consumeManualSyncFlag(): boolean {
  if (!manualSyncRequested) return false;
  manualSyncRequested = false;
  return true;
}

export function getLastSyncedCustomers(): SyncedCustomerSnapshot[] {
  return [...lastSyncedCustomers];
}

function persistLastCustomers(rows: SyncedCustomerSnapshot[]): void {
  lastSyncedCustomers = rows;
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(lastCustomersPath, JSON.stringify(rows, null, 2), 'utf8');
  } catch (e) {
    log.warn('Could not persist last-customers.json', { message: e instanceof Error ? e.message : String(e) });
  }
}

export function loadPersistedCustomersIfAny(): void {
  try {
    if (!existsSync(lastCustomersPath)) return;
    const raw = readFileSync(lastCustomersPath, 'utf8');
    const parsed = JSON.parse(raw) as SyncedCustomerSnapshot[];
    if (Array.isArray(parsed)) {
      lastSyncedCustomers = parsed;
    }
  } catch {
    /* ignore */
  }
}

function snapshotFromParsed(rows: ParsedCustomer[]): SyncedCustomerSnapshot[] {
  return rows.map((c) => {
    const expectedBarcode = barcodeForListIdAndName(c.listId, c.name);
    return {
      ...c,
      expectedBarcode,
      nameOnlyBarcode: generateBarcode(c.name),
    };
  });
}

/**
 * After a successful CustomerQuery response: compute CustomerMod rows for missing/wrong barcodes.
 */
export function applyCustomerQueryResults(session: WcSession, responseXml: string): void {
  const customers = parseCustomerQueryResponse(responseXml);
  const snapshots = snapshotFromParsed(customers);
  persistLastCustomers(snapshots);

  const mods: CustomerModInput[] = [];
  for (const c of customers) {
    if (!c.isActive) continue;
    const expected = barcodeForListIdAndName(c.listId, c.name);
    if (!shouldApplyBarcode(c.accountNumber, expected)) continue;
    mods.push({
      listId: c.listId,
      editSequence: c.editSequence,
      name: c.name,
      accountNumber: expected,
    });
  }

  session.pendingMods = mods;
  log.info('Customer query processed', {
    total: customers.length,
    pendingMods: mods.length,
  });
}

/**
 * Official Intuit WSDL returns a single QBXML string from sendRequestXML (empty string = no work).
 */
export function buildSendRequestXml(session: WcSession): string {
  const { qbMajor, qbMinor } = session;

  if (session.workState.kind === 'need_customer_query') {
    const inner = buildCustomerQueryRq('scanified-customer-query');
    const xml = wrapQbxmlMessage(inner, qbMajor, qbMinor);
    session.workState = { kind: 'awaiting_customer_query_response' };
    session.lastQbxmlSent = xml;
    log.qbxml('SENT', xml);
    return xml;
  }

  if (session.workState.kind === 'need_customer_mod' && session.pendingMods.length > 0) {
    const inner = buildCustomerModBatchRq(session.pendingMods, 'scanified-mod');
    const xml = wrapQbxmlMessage(inner, qbMajor, qbMinor);
    session.workState = { kind: 'awaiting_customer_mod_response' };
    session.lastQbxmlSent = xml;
    log.qbxml('SENT', xml);
    return xml;
  }

  return '';
}

/**
 * @returns Progress 0–100 for QBWC, or negative to trigger getLastError.
 */
export function handleReceiveResponse(session: WcSession, responseXml: string): number {
  session.lastQbxmlReceived = responseXml;
  log.qbxml('RECV', responseXml);

  if (session.workState.kind === 'awaiting_customer_query_response') {
    try {
      applyCustomerQueryResults(session, responseXml);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      session.lastError = `Customer query handling failed: ${msg}`;
      log.error(session.lastError);
      session.workState = { kind: 'complete' };
      return -1;
    }

    if (session.pendingMods.length > 0) {
      session.workState = { kind: 'need_customer_mod' };
      return 40;
    }

    session.workState = { kind: 'complete' };
    return 100;
  }

  if (session.workState.kind === 'awaiting_customer_mod_response') {
    if (customerModHadErrors(responseXml)) {
      session.lastError = 'CustomerModRs reported an error; see QuickBooks Web Connector log.';
      log.error(session.lastError);
      session.pendingMods = [];
      session.workState = { kind: 'complete' };
      return -1;
    }
    session.pendingMods = [];
    session.workState = { kind: 'complete' };
    return 100;
  }

  log.warn('receiveResponseXML in unexpected workState; ignoring', { state: session.workState.kind });
  return 100;
}
