/**
 * ScanQueue - Queue management for rapid sequential scanning
 * 
 * Manages scan queue with:
 * - Real-time deduplication
 * - Cooldown periods
 * - Visual feedback
 * - Batch operations
 * - Undo functionality
 */

import { ScanResult } from './UnifiedScanner';

export interface QueueConfig {
  cooldownPeriod: number; // milliseconds
  maxQueueSize: number;
  autoProcess: boolean; // Automatically process items
  processingDelay: number; // milliseconds between processing items
}

export interface QueueItem {
  id: string;
  scanResult: ScanResult;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  addedAt: number;
  processedAt?: number;
  error?: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  estimatedTimeRemaining: number; // milliseconds
  totalItems: number;
}

export interface BatchResult {
  successful: ScanResult[];
  failed: Array<{ scanResult: ScanResult; error: string }>;
  duration: number;
}

/**
 * Scan queue manager
 */
export class ScanQueue {
  private queue: QueueItem[] = [];
  private config: QueueConfig;
  private itemCounter: number = 0;
  private processingInterval: NodeJS.Timeout | null = null;
  private lastScanTime: Map<string, number> = new Map();
  private onItemProcessed?: (item: QueueItem) => Promise<void>;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      cooldownPeriod: 500,
      maxQueueSize: 1000,
      autoProcess: false,
      processingDelay: 100,
      ...config,
    };
  }

  /**
   * Add scan to queue
   */
  enqueue(scanResult: ScanResult): QueueItem | null {
    // Check cooldown period
    if (this.isInCooldown(scanResult.barcode)) {
      return null; // Duplicate within cooldown period
    }

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      return null; // Queue full
    }

    const item: QueueItem = {
      id: `queue_${++this.itemCounter}_${Date.now()}`,
      scanResult,
      status: 'pending',
      addedAt: Date.now(),
    };

    this.queue.push(item);
    this.lastScanTime.set(scanResult.barcode, Date.now());

    // Start auto-processing if enabled
    if (this.config.autoProcess && !this.processingInterval) {
      this.startAutoProcessing();
    }

    return item;
  }

  /**
   * Check if barcode is in cooldown period
   */
  private isInCooldown(barcode: string): boolean {
    const lastTime = this.lastScanTime.get(barcode);
    if (!lastTime) return false;

    const now = Date.now();
    const elapsed = now - lastTime;

    return elapsed < this.config.cooldownPeriod;
  }

  /**
   * Remove duplicate items from queue
   */
  deduplicate(): number {
    const seen = new Set<string>();
    const original = this.queue.length;

    this.queue = this.queue.filter(item => {
      if (seen.has(item.scanResult.barcode)) {
        return false; // Duplicate
      }
      seen.add(item.scanResult.barcode);
      return true;
    });

    return original - this.queue.length; // Number removed
  }

  /**
   * Process all items in queue
   */
  async processBatch(): Promise<BatchResult> {
    const startTime = Date.now();
    const successful: ScanResult[] = [];
    const failed: Array<{ scanResult: ScanResult; error: string }> = [];

    const pendingItems = this.queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      try {
        item.status = 'processing';
        
        if (this.onItemProcessed) {
          await this.onItemProcessed(item);
        }

        item.status = 'processed';
        item.processedAt = Date.now();
        successful.push(item.scanResult);
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          scanResult: item.scanResult,
          error: item.error,
        });
      }
    }

    const duration = Date.now() - startTime;

    return { successful, failed, duration };
  }

  /**
   * Start auto-processing
   */
  private startAutoProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      const pending = this.getPendingItems();
      
      if (pending.length === 0) {
        this.stopAutoProcessing();
        return;
      }

      const item = pending[0];
      
      try {
        item.status = 'processing';
        
        if (this.onItemProcessed) {
          await this.onItemProcessed(item);
        }

        item.status = 'processed';
        item.processedAt = Date.now();
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }, this.config.processingDelay);
  }

  /**
   * Stop auto-processing
   */
  private stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Set callback for item processing
   */
  setProcessingCallback(callback: (item: QueueItem) => Promise<void>): void {
    this.onItemProcessed = callback;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): QueueStatus {
    const pending = this.queue.filter(i => i.status === 'pending').length;
    const processing = this.queue.filter(i => i.status === 'processing').length;
    const processed = this.queue.filter(i => i.status === 'processed').length;
    const failed = this.queue.filter(i => i.status === 'failed').length;

    let estimatedTimeRemaining = 0;
    if (pending > 0 && processed > 0) {
      const processedItems = this.queue.filter(i => i.status === 'processed');
      const avgProcessTime = processedItems.reduce((sum, item) => {
        const time = item.processedAt ? item.processedAt - item.addedAt : 0;
        return sum + time;
      }, 0) / processedItems.length;

      estimatedTimeRemaining = pending * avgProcessTime;
    }

    return {
      pending,
      processing,
      processed,
      failed,
      estimatedTimeRemaining,
      totalItems: this.queue.length,
    };
  }

  /**
   * Get pending items
   */
  getPendingItems(): QueueItem[] {
    return this.queue.filter(item => item.status === 'pending');
  }

  /**
   * Get processed items
   */
  getProcessedItems(): QueueItem[] {
    return this.queue.filter(item => item.status === 'processed');
  }

  /**
   * Get failed items
   */
  getFailedItems(): QueueItem[] {
    return this.queue.filter(item => item.status === 'failed');
  }

  /**
   * Get recent items (last N)
   */
  getRecentItems(count: number = 5): QueueItem[] {
    return this.queue.slice(-count);
  }

  /**
   * Get all items
   */
  getAllItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Remove item from queue
   */
  removeItem(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    
    if (index === -1) return false;

    this.queue.splice(index, 1);
    return true;
  }

  /**
   * Undo last scan (remove last item)
   */
  undoLast(): QueueItem | null {
    if (this.queue.length === 0) return null;

    const item = this.queue.pop();
    
    if (item) {
      // Remove from cooldown tracking
      this.lastScanTime.delete(item.scanResult.barcode);
    }

    return item || null;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.stopAutoProcessing();
    this.queue = [];
    this.lastScanTime.clear();
  }

  /**
   * Clear processed items
   */
  clearProcessed(): number {
    const original = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'processed');
    return original - this.queue.length;
  }

  /**
   * Clear failed items
   */
  clearFailed(): number {
    const original = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'failed');
    return original - this.queue.length;
  }

  /**
   * Retry failed items
   */
  retryFailed(): number {
    const failed = this.getFailedItems();
    
    failed.forEach(item => {
      item.status = 'pending';
      item.error = undefined;
    });

    if (failed.length > 0 && this.config.autoProcess) {
      this.startAutoProcessing();
    }

    return failed.length;
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.config.maxQueueSize;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart auto-processing if config changed
    if (updates.autoProcess !== undefined || updates.processingDelay !== undefined) {
      this.stopAutoProcessing();
      if (this.config.autoProcess && this.getPendingItems().length > 0) {
        this.startAutoProcessing();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Export queue data
   */
  exportQueue(): QueueItem[] {
    return this.queue.map(item => ({ ...item }));
  }

  /**
   * Import queue data
   */
  importQueue(items: QueueItem[]): void {
    this.clear();
    this.queue = items.map(item => ({ ...item }));
    
    // Update item counter
    const maxId = Math.max(...items.map(item => {
      const match = item.id.match(/queue_(\d+)_/);
      return match ? parseInt(match[1]) : 0;
    }));
    
    this.itemCounter = maxId;
  }

  /**
   * Reset queue
   */
  reset(): void {
    this.clear();
    this.itemCounter = 0;
  }

  /**
   * Cleanup (stop processing and clear)
   */
  cleanup(): void {
    this.stopAutoProcessing();
    this.clear();
  }
}

export default ScanQueue;
