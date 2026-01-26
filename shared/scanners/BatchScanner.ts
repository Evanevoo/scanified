/**
 * BatchScanner - Orchestrates batch scanning operations
 * 
 * Manages batch scanning sessions with:
 * - Session tracking
 * - Real-time statistics
 * - Duplicate detection
 * - Progress monitoring
 */

import { ScanResult, BatchSummary } from './UnifiedScanner';

export interface BatchConfig {
  duplicateCooldown: number; // milliseconds
  autoCompleteThreshold?: number; // number of scans
  targetRate?: number; // target scans per second
  allowDuplicates?: boolean;
  validateScans?: boolean;
}

export interface BatchSession {
  id: string;
  startTime: number;
  endTime?: number;
  scans: ScanResult[];
  config: BatchConfig;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface BatchOperationResult {
  accepted: boolean;
  reason?: string;
  scanResult: ScanResult;
  sessionStats: BatchStats;
}

export interface BatchStats {
  totalScans: number;
  uniqueBarcodes: number;
  duplicates: number;
  errors: number;
  averageRate: number; // scans per second
  elapsedTime: number; // milliseconds
  estimatedCompletion?: number; // milliseconds (if target set)
}

/**
 * Batch scanning orchestrator
 */
export class BatchScanner {
  private sessions: Map<string, BatchSession> = new Map();
  private activeSessionId: string | null = null;
  private sessionCounter: number = 0;

  /**
   * Start a new batch session
   */
  startBatch(config?: Partial<BatchConfig>): BatchSession {
    const sessionId = `batch_${++this.sessionCounter}_${Date.now()}`;
    
    const defaultConfig: BatchConfig = {
      duplicateCooldown: 500,
      autoCompleteThreshold: undefined,
      targetRate: undefined,
      allowDuplicates: false,
      validateScans: true,
    };

    const session: BatchSession = {
      id: sessionId,
      startTime: Date.now(),
      scans: [],
      config: { ...defaultConfig, ...config },
      status: 'active',
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;

    return session;
  }

  /**
   * Process a scan in batch context
   */
  processScan(scanResult: ScanResult, sessionId?: string): BatchOperationResult {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return {
        accepted: false,
        reason: 'No active batch session',
        scanResult,
        sessionStats: this.getEmptyStats(),
      };
    }

    if (session.status !== 'active') {
      return {
        accepted: false,
        reason: `Batch session is ${session.status}`,
        scanResult,
        sessionStats: this.calculateStats(session),
      };
    }

    // Check for duplicates
    if (!session.config.allowDuplicates) {
      const isDuplicate = this.isDuplicate(scanResult, session);
      
      if (isDuplicate) {
        return {
          accepted: false,
          reason: 'Duplicate barcode (within cooldown period)',
          scanResult,
          sessionStats: this.calculateStats(session),
        };
      }
    }

    // Add scan to session
    session.scans.push(scanResult);

    // Check auto-complete threshold
    if (session.config.autoCompleteThreshold && 
        session.scans.length >= session.config.autoCompleteThreshold) {
      this.completeBatch(session.id);
    }

    return {
      accepted: true,
      scanResult,
      sessionStats: this.calculateStats(session),
    };
  }

  /**
   * Check if scan is a duplicate
   */
  private isDuplicate(scanResult: ScanResult, session: BatchSession): boolean {
    const cooldown = session.config.duplicateCooldown;
    const now = Date.now();

    return session.scans.some(
      (scan) => 
        scan.barcode === scanResult.barcode && 
        (now - scan.timestamp) < cooldown
    );
  }

  /**
   * Pause batch session
   */
  pauseBatch(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session || session.status !== 'active') {
      return false;
    }

    session.status = 'paused';
    return true;
  }

  /**
   * Resume paused batch session
   */
  resumeBatch(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session || session.status !== 'paused') {
      return false;
    }

    session.status = 'active';
    return true;
  }

  /**
   * Complete batch session and return summary
   */
  completeBatch(sessionId?: string): BatchSummary {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return this.getEmptySummary();
    }

    session.endTime = Date.now();
    session.status = 'completed';

    const summary = this.createSummary(session);

    // Clear active session if this was it
    if (this.activeSessionId === session.id) {
      this.activeSessionId = null;
    }

    return summary;
  }

  /**
   * Cancel batch session
   */
  cancelBatch(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    session.status = 'cancelled';
    session.endTime = Date.now();

    // Clear active session if this was it
    if (this.activeSessionId === session.id) {
      this.activeSessionId = null;
    }

    return true;
  }

  /**
   * Get session by ID (or active session)
   */
  private getSession(sessionId?: string): BatchSession | undefined {
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    
    if (this.activeSessionId) {
      return this.sessions.get(this.activeSessionId);
    }

    return undefined;
  }

  /**
   * Get active session
   */
  getActiveSession(): BatchSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Calculate real-time statistics for session
   */
  calculateStats(session: BatchSession): BatchStats {
    const now = Date.now();
    const elapsedTime = now - session.startTime;
    const scans = session.scans;
    const uniqueBarcodes = new Set(scans.map((s) => s.barcode)).size;
    const averageRate = elapsedTime > 0 ? (scans.length / (elapsedTime / 1000)) : 0;

    let estimatedCompletion: number | undefined;
    if (session.config.autoCompleteThreshold && averageRate > 0) {
      const remaining = session.config.autoCompleteThreshold - scans.length;
      estimatedCompletion = (remaining / averageRate) * 1000; // milliseconds
    }

    return {
      totalScans: scans.length,
      uniqueBarcodes,
      duplicates: scans.length - uniqueBarcodes,
      errors: 0, // Would track validation errors if implemented
      averageRate,
      elapsedTime,
      estimatedCompletion,
    };
  }

  /**
   * Create batch summary
   */
  private createSummary(session: BatchSession): BatchSummary {
    const endTime = session.endTime || Date.now();
    const duration = endTime - session.startTime;
    const scans = session.scans;
    const uniqueBarcodes = new Set(scans.map((s) => s.barcode)).size;

    return {
      totalScans: scans.length,
      uniqueBarcodes,
      duplicates: scans.length - uniqueBarcodes,
      errors: 0,
      duration,
      scansPerSecond: duration > 0 ? (scans.length / (duration / 1000)) : 0,
      startTime: session.startTime,
      endTime,
    };
  }

  /**
   * Get empty stats
   */
  private getEmptyStats(): BatchStats {
    return {
      totalScans: 0,
      uniqueBarcodes: 0,
      duplicates: 0,
      errors: 0,
      averageRate: 0,
      elapsedTime: 0,
    };
  }

  /**
   * Get empty summary
   */
  private getEmptySummary(): BatchSummary {
    return {
      totalScans: 0,
      uniqueBarcodes: 0,
      duplicates: 0,
      errors: 0,
      duration: 0,
      scansPerSecond: 0,
      startTime: 0,
      endTime: 0,
    };
  }

  /**
   * Remove last scan from active session
   */
  undoLastScan(sessionId?: string): ScanResult | null {
    const session = this.getSession(sessionId);
    
    if (!session || session.scans.length === 0) {
      return null;
    }

    return session.scans.pop() || null;
  }

  /**
   * Clear all scans from active session
   */
  clearScans(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    session.scans = [];
    return true;
  }

  /**
   * Get scans from session
   */
  getScans(sessionId?: string): ScanResult[] {
    const session = this.getSession(sessionId);
    return session ? [...session.scans] : [];
  }

  /**
   * Get recent scans (last N)
   */
  getRecentScans(count: number = 5, sessionId?: string): ScanResult[] {
    const scans = this.getScans(sessionId);
    return scans.slice(-count);
  }

  /**
   * Export session data
   */
  exportSession(sessionId?: string): BatchSession | null {
    const session = this.getSession(sessionId);
    return session ? { ...session } : null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): BatchSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear completed sessions
   */
  clearCompletedSessions(): number {
    let cleared = 0;
    
    this.sessions.forEach((session, id) => {
      if (session.status === 'completed' || session.status === 'cancelled') {
        this.sessions.delete(id);
        cleared++;
      }
    });

    return cleared;
  }

  /**
   * Reset batch scanner (clear all sessions)
   */
  reset(): void {
    this.sessions.clear();
    this.activeSessionId = null;
    this.sessionCounter = 0;
  }
}

export default BatchScanner;
