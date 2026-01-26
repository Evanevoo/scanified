/**
 * PerformanceMonitor - Real-time performance tracking and optimization
 * 
 * Tracks and analyzes:
 * - Scan timing metrics
 * - Frame processing performance
 * - Database lookup times
 * - Memory usage
 * - Battery impact
 * - Auto-tuning recommendations
 */

export interface PerformanceMetrics {
  scanTime: number; // milliseconds (frame to result)
  processingTime: number; // milliseconds (image enhancement)
  lookupTime: number; // milliseconds (database)
  totalTime: number; // milliseconds (end-to-end)
  frameRate: number; // actual FPS
  memoryUsage?: number; // MB
  batteryDrain?: number; // percentage per hour
}

export interface PerformanceStats {
  avgScanTime: number;
  avgProcessingTime: number;
  avgLookupTime: number;
  avgTotalTime: number;
  scansPerSecond: number;
  targetFPS: number;
  actualFPS: number;
  fpsEfficiency: number; // percentage
  totalScans: number;
  fastestScan: number;
  slowestScan: number;
}

export interface PerformanceIssue {
  type: 'slow_scan' | 'slow_processing' | 'slow_lookup' | 'low_fps' | 'high_memory' | 'battery_drain';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  value?: number;
  threshold?: number;
}

export interface OptimizedSettings {
  targetFPS: number;
  downsampleFactor: number;
  cacheSize: number;
  workerCount: number;
  skipSimilarFrames: boolean;
  enableImageProcessing: boolean;
  recommendations: string[];
}

/**
 * Performance monitoring and optimization engine
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsSize: number = 100;
  private targetFPS: number = 15;
  private startTime: number = Date.now();
  private scanCount: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = Date.now();

  constructor(targetFPS: number = 15, maxMetricsSize: number = 100) {
    this.targetFPS = targetFPS;
    this.maxMetricsSize = maxMetricsSize;
  }

  /**
   * Record scan timing
   */
  recordScanTime(duration: number): void {
    const now = Date.now();
    
    const metric: PerformanceMetrics = {
      scanTime: duration,
      processingTime: 0,
      lookupTime: 0,
      totalTime: duration,
      frameRate: this.calculateCurrentFPS(),
      timestamp: now,
    } as any;

    this.addMetric(metric);
    this.scanCount++;
  }

  /**
   * Record processing time (image enhancement)
   */
  recordProcessingTime(duration: number): void {
    if (this.metrics.length > 0) {
      const lastMetric = this.metrics[this.metrics.length - 1];
      lastMetric.processingTime = duration;
      lastMetric.totalTime += duration;
    }
  }

  /**
   * Record database lookup time
   */
  recordLookupTime(duration: number): void {
    if (this.metrics.length > 0) {
      const lastMetric = this.metrics[this.metrics.length - 1];
      lastMetric.lookupTime = duration;
      lastMetric.totalTime += duration;
    }
  }

  /**
   * Record frame processed
   */
  recordFrame(): void {
    this.frameCount++;
    this.lastFrameTime = Date.now();
  }

  /**
   * Add metric to history
   */
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }
  }

  /**
   * Calculate current FPS
   */
  private calculateCurrentFPS(): number {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // seconds
    
    if (elapsed === 0) return 0;
    
    return this.frameCount / elapsed;
  }

  /**
   * Get average scan time
   */
  getAverageScanTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.scanTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get average processing time
   */
  getAverageProcessingTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.processingTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get average lookup time
   */
  getAverageLookupTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.lookupTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get average total time
   */
  getAverageTotalTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.totalTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get scans per second
   */
  getScansPerSecond(): number {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // seconds
    
    if (elapsed === 0) return 0;
    
    return this.scanCount / elapsed;
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): PerformanceStats {
    const actualFPS = this.calculateCurrentFPS();
    const fpsEfficiency = this.targetFPS > 0 ? (actualFPS / this.targetFPS) * 100 : 0;

    const scanTimes = this.metrics.map(m => m.scanTime);
    const fastestScan = scanTimes.length > 0 ? Math.min(...scanTimes) : 0;
    const slowestScan = scanTimes.length > 0 ? Math.max(...scanTimes) : 0;

    return {
      avgScanTime: this.getAverageScanTime(),
      avgProcessingTime: this.getAverageProcessingTime(),
      avgLookupTime: this.getAverageLookupTime(),
      avgTotalTime: this.getAverageTotalTime(),
      scansPerSecond: this.getScansPerSecond(),
      targetFPS: this.targetFPS,
      actualFPS,
      fpsEfficiency,
      totalScans: this.scanCount,
      fastestScan,
      slowestScan,
    };
  }

  /**
   * Detect performance issues
   */
  detectBottlenecks(): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const stats = this.getStats();

    // Check scan time (target: < 100ms)
    if (stats.avgScanTime > 100) {
      issues.push({
        type: 'slow_scan',
        severity: stats.avgScanTime > 200 ? 'high' : 'medium',
        description: `Average scan time is ${Math.round(stats.avgScanTime)}ms (target: < 100ms)`,
        recommendation: 'Consider reducing image processing or enabling frame skipping',
        value: stats.avgScanTime,
        threshold: 100,
      });
    }

    // Check processing time (target: < 200ms)
    if (stats.avgProcessingTime > 200) {
      issues.push({
        type: 'slow_processing',
        severity: stats.avgProcessingTime > 400 ? 'high' : 'medium',
        description: `Average processing time is ${Math.round(stats.avgProcessingTime)}ms (target: < 200ms)`,
        recommendation: 'Disable image enhancements or reduce resolution',
        value: stats.avgProcessingTime,
        threshold: 200,
      });
    }

    // Check lookup time (target: < 50ms)
    if (stats.avgLookupTime > 50) {
      issues.push({
        type: 'slow_lookup',
        severity: stats.avgLookupTime > 100 ? 'high' : 'medium',
        description: `Average lookup time is ${Math.round(stats.avgLookupTime)}ms (target: < 50ms)`,
        recommendation: 'Increase cache size or preload frequent barcodes',
        value: stats.avgLookupTime,
        threshold: 50,
      });
    }

    // Check FPS efficiency (target: > 80%)
    if (stats.fpsEfficiency < 80) {
      issues.push({
        type: 'low_fps',
        severity: stats.fpsEfficiency < 50 ? 'high' : (stats.fpsEfficiency < 65 ? 'medium' : 'low'),
        description: `FPS efficiency is ${Math.round(stats.fpsEfficiency)}% (target: > 80%)`,
        recommendation: 'Reduce target FPS or optimize frame processing',
        value: stats.fpsEfficiency,
        threshold: 80,
      });
    }

    return issues;
  }

  /**
   * Auto-tune settings based on performance
   */
  autoTune(): OptimizedSettings {
    const stats = this.getStats();
    const issues = this.detectBottlenecks();
    const recommendations: string[] = [];

    // Start with current/default settings
    let targetFPS = this.targetFPS;
    let downsampleFactor = 1;
    let cacheSize = 100;
    let workerCount = 2;
    let skipSimilarFrames = true;
    let enableImageProcessing = true;

    // Adjust based on performance issues
    const hasSeriousIssues = issues.some(i => i.severity === 'high');
    const hasModeratIssues = issues.some(i => i.severity === 'medium');

    if (hasSeriousIssues) {
      // Aggressive optimization for serious issues
      targetFPS = Math.max(5, Math.floor(targetFPS * 0.6));
      downsampleFactor = 2;
      enableImageProcessing = false;
      skipSimilarFrames = true;
      
      recommendations.push('Performance is poor - applied aggressive optimizations');
      recommendations.push('Disabled image processing for faster scanning');
      recommendations.push('Reduced target FPS and enabled frame skipping');
    } else if (hasModeratIssues) {
      // Moderate optimization
      targetFPS = Math.max(10, Math.floor(targetFPS * 0.8));
      downsampleFactor = 1.5;
      
      recommendations.push('Performance is below target - applied moderate optimizations');
      recommendations.push('Slightly reduced quality for better speed');
    } else if (stats.fpsEfficiency > 120 && stats.avgTotalTime < 80) {
      // Performance is excellent - can increase quality
      targetFPS = Math.min(30, Math.ceil(targetFPS * 1.2));
      downsampleFactor = 1;
      enableImageProcessing = true;
      
      recommendations.push('Performance is excellent - increased quality settings');
      recommendations.push('Enabled full image processing');
    }

    // Cache optimization based on lookup time
    if (stats.avgLookupTime > 30) {
      cacheSize = 200;
      recommendations.push('Increased cache size to improve lookup performance');
    }

    // Worker optimization based on processing time
    if (stats.avgProcessingTime > 150) {
      workerCount = Math.min(4, workerCount + 1);
      recommendations.push('Increased worker count for parallel processing');
    }

    return {
      targetFPS,
      downsampleFactor,
      cacheSize,
      workerCount,
      skipSimilarFrames,
      enableImageProcessing,
      recommendations,
    };
  }

  /**
   * Get performance grade (A-F)
   */
  getPerformanceGrade(): { grade: string; score: number } {
    const stats = this.getStats();
    let score = 100;

    // Deduct points for slow scans
    if (stats.avgScanTime > 100) {
      score -= Math.min(20, (stats.avgScanTime - 100) / 10);
    }

    // Deduct points for slow processing
    if (stats.avgProcessingTime > 200) {
      score -= Math.min(20, (stats.avgProcessingTime - 200) / 20);
    }

    // Deduct points for slow lookups
    if (stats.avgLookupTime > 50) {
      score -= Math.min(15, (stats.avgLookupTime - 50) / 5);
    }

    // Deduct points for low FPS efficiency
    if (stats.fpsEfficiency < 80) {
      score -= Math.min(25, (80 - stats.fpsEfficiency) / 2);
    }

    score = Math.max(0, Math.min(100, score));

    const grade = 
      score >= 90 ? 'A' :
      score >= 80 ? 'B' :
      score >= 70 ? 'C' :
      score >= 60 ? 'D' :
      'F';

    return { grade, score: Math.round(score) };
  }

  /**
   * Export metrics data
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get recent metrics (last N)
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
    this.scanCount = 0;
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
  }

  /**
   * Set target FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  /**
   * Get current uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

export default PerformanceMonitor;
