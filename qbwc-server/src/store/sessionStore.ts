import type { CustomerModInput } from '../qbxml/builders.js';

/**
 * Tracks one QuickBooks Web Connector session (ticket) and sync step state.
 * In-memory only; tickets expire when closeConnection runs or process restarts.
 */
export type WorkState =
  | { kind: 'need_customer_query' }
  | { kind: 'awaiting_customer_query_response' }
  | { kind: 'need_customer_mod' }
  | { kind: 'awaiting_customer_mod_response' }
  | { kind: 'complete' };

export interface WcSession {
  ticket: string;
  username: string;
  createdAt: number;
  /** QBXML version from QBWC for the current run. */
  qbMajor: number;
  qbMinor: number;
  workState: WorkState;
  pendingMods: CustomerModInput[];
  lastError: string;
  /** Last QBXML we asked QuickBooks to run (for logging / debugging). */
  lastQbxmlSent?: string;
  /** Last raw response from QuickBooks (for logging / debugging). */
  lastQbxmlReceived?: string;
}

const sessions = new Map<string, WcSession>();

export function createSession(ticket: string, username: string): WcSession {
  const s: WcSession = {
    ticket,
    username,
    createdAt: Date.now(),
    qbMajor: 13,
    qbMinor: 0,
    workState: { kind: 'need_customer_query' },
    pendingMods: [],
    lastError: '',
  };
  sessions.set(ticket, s);
  return s;
}

export function getSession(ticket: string): WcSession | undefined {
  return sessions.get(ticket);
}

export function deleteSession(ticket: string): void {
  sessions.delete(ticket);
}

export function clearSessionError(ticket: string): void {
  const s = sessions.get(ticket);
  if (s) s.lastError = '';
}
