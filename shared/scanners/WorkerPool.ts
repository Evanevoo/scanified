/**
 * WorkerPool - Background processing for non-blocking operations
 * 
 * Manages worker threads for:
 * - Asynchronous scan processing
 * - Parallel batch operations
 * - Priority-based task distribution
 * - Graceful fallback to main thread
 */

import { ScanResult } from './UnifiedScanner';

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
  timeout?: number; // milliseconds
}

export interface ProcessedResult<R = any> {
  taskId: string;
  success: boolean;
  result?: R;
  error?: string;
  processingTime: number;
  workerId?: number;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  enableWorkers: boolean; // Can disable for compatibility
  taskTimeout: number; // milliseconds
  maxQueueSize: number;
}

export interface WorkerStats {
  totalWorkers: number;
  availableWorkers: number;
  busyWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgProcessingTime: number;
}

/**
 * Worker pool manager
 * 
 * Note: React Native doesn't support true Web Workers
 * This implementation uses async processing as a fallback
 * For production, could integrate with native threads
 */
export class WorkerPool {
  private config: WorkerPoolConfig;
  private taskQueue: WorkerTask[] = [];
  private processing: Set<string> = new Set();
  private taskCounter: number = 0;
  private stats: {
    completed: number;
    failed: number;
    processingTimes: number[];
  };
  private processors: Map<string, (data: any) => Promise<any>> = new Map();

  constructor(config?: Partial<WorkerPoolConfig>) {
    this.config = {
      maxWorkers: this.detectOptimalWorkerCount(),
      enableWorkers: true,
      taskTimeout: 5000,
      maxQueueSize: 1000,
      ...config,
    };

    this.stats = {
      completed: 0,
      failed: 0,
      processingTimes: [],
    };
  }

  /**
   * Detect optimal worker count based on device
   */
  private detectOptimalWorkerCount(): number {
    // In React Native, we simulate workers with async operations
    // Optimal count based on typical mobile device capabilities
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      return Math.max(2, Math.min(4, (navigator as any).hardwareConcurrency));
    }
    
    return 2; // Default to 2 "workers"
  }

  /**
   * Register a processor for a task type
   */
  registerProcessor(taskType: string, processor: (data: any) => Promise<any>): void {
    this.processors.set(taskType, processor);
  }

  /**
   * Process scan asynchronously
   */
  async processAsync<T = any, R = any>(
    taskType: string,
    data: T,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<ProcessedResult<R>> {
    const task: WorkerTask<T, R> = {
      id: `task_${++this.taskCounter}_${Date.now()}`,
      type: taskType,
      data,
      priority,
      timestamp: Date.now(),
      timeout: this.config.taskTimeout,
    };

    // Check queue size limit
    if (this.taskQueue.length >= this.config.maxQueueSize) {
      return {
        taskId: task.id,
        success: false,
        error: 'Task queue full',
        processingTime: 0,
      };
    }

    // Add to queue
    this.addToQueue(task);

    // Process immediately if workers available
    return this.processTask(task);
  }

  /**
   * Process batch of scans in parallel
   */
  async processBatchParallel<T = any, R = any>(
    taskType: string,
    dataItems: T[],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<ProcessedResult<R>[]> {
    const promises = dataItems.map(data =>
      this.processAsync<T, R>(taskType, data, priority)
    );

    return Promise.all(promises);
  }

  /**
   * Add task to queue (sorted by priority)
   */
  private addToQueue(task: WorkerTask): void {
    this.taskQueue.push(task);
    
    // Sort by priority (high first)
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Process a task
   */
  private async processTask<T = any, R = any>(task: WorkerTask<T, R>): Promise<ProcessedResult<R>> {
    const startTime = Date.now();

    // Check if processor exists
    const processor = this.processors.get(task.type);
    
    if (!processor) {
      return {
        taskId: task.id,
        success: false,
        error: `No processor registered for task type: ${task.type}`,
        processingTime: Date.now() - startTime,
      };
    }

    // Mark as processing
    this.processing.add(task.id);

    try {
      // Process with timeout
      const result = await this.withTimeout(
        processor(task.data),
        task.timeout || this.config.taskTimeout
      );

      const processingTime = Date.now() - startTime;
      
      // Record stats
      this.stats.completed++;
      this.stats.processingTimes.push(processingTime);
      if (this.stats.processingTimes.length > 100) {
        this.stats.processingTimes.shift();
      }

      // Remove from processing
      this.processing.delete(task.id);

      return {
        taskId: task.id,
        success: true,
        result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Record failure
      this.stats.failed++;
      this.processing.delete(task.id);

      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processingTime,
      };
    }
  }

  /**
   * Execute promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Get available worker count
   */
  getAvailableWorkers(): number {
    return Math.max(0, this.config.maxWorkers - this.processing.size);
  }

  /**
   * Get busy worker count
   */
  getBusyWorkers(): number {
    return this.processing.size;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    const avgProcessingTime = this.stats.processingTimes.length > 0
      ? this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length
      : 0;

    return {
      totalWorkers: this.config.maxWorkers,
      availableWorkers: this.getAvailableWorkers(),
      busyWorkers: this.getBusyWorkers(),
      queuedTasks: this.taskQueue.length,
      completedTasks: this.stats.completed,
      failedTasks: this.stats.failed,
      avgProcessingTime,
    };
  }

  /**
   * Clear task queue
   */
  clearQueue(): void {
    this.taskQueue = [];
  }

  /**
   * Check if workers are busy
   */
  isBusy(): boolean {
    return this.processing.size >= this.config.maxWorkers;
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (this.processing.size > 0 || this.taskQueue.length > 0) {
      if (Date.now() - startTime > timeoutMs) {
        return false; // Timeout
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return true;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<WorkerPoolConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkerPoolConfig {
    return { ...this.config };
  }

  /**
   * Reset worker pool
   */
  reset(): void {
    this.taskQueue = [];
    this.processing.clear();
    this.taskCounter = 0;
    this.stats = {
      completed: 0,
      failed: 0,
      processingTimes: [],
    };
  }

  /**
   * Cleanup (wait for completion and reset)
   */
  async cleanup(timeoutMs: number = 10000): Promise<void> {
    await this.waitForCompletion(timeoutMs);
    this.reset();
  }
}

/**
 * Pre-configured processors for common tasks
 */
export class ScanProcessors {
  /**
   * Database lookup processor
   */
  static async databaseLookup(barcode: string): Promise<any> {
    // Placeholder for database lookup
    // In production, would query Supabase or other database
    return {
      barcode,
      found: false,
      data: null,
    };
  }

  /**
   * Barcode validation processor
   */
  static async validateBarcode(barcode: string): Promise<{ valid: boolean; format?: string }> {
    // Basic validation
    if (!barcode || typeof barcode !== 'string') {
      return { valid: false };
    }

    // Check common formats
    if (/^\d{13}$/.test(barcode)) {
      return { valid: true, format: 'EAN-13' };
    }
    
    if (/^\d{12}$/.test(barcode)) {
      return { valid: true, format: 'UPC-A' };
    }
    
    if (/^[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/.test(barcode)) {
      return { valid: true, format: 'Custom' };
    }

    return { valid: true, format: 'Unknown' };
  }

  /**
   * Image processing processor
   */
  static async processImage(imageData: any): Promise<any> {
    // Placeholder for image processing
    // In production, would apply enhancements, filters, etc.
    return {
      processed: true,
      enhanced: false,
    };
  }
}

export default WorkerPool;
