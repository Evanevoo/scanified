/**
 * ConcurrentScanner - Multi-barcode detection in single frame
 * 
 * Detects and processes multiple barcodes simultaneously:
 * - Up to 10 barcodes per frame
 * - Priority sorting
 * - Visual highlighting
 * - Batch capture
 */

import { ScanResult, DetectedBarcode } from './UnifiedScanner';
import { Frame } from './ImageProcessor';

export interface ConcurrentConfig {
  maxBarcodesPerFrame: number;
  priorityStrategy: 'center' | 'size' | 'confidence' | 'custom';
  minConfidence: number;
  spatialDeduplication: boolean; // Remove barcodes at same position
}

export interface SpatialPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  barcode: string;
  position: SpatialPosition;
  color: string;
  priority: number;
  label?: string;
}

/**
 * Concurrent barcode scanner
 */
export class ConcurrentScanner {
  private config: ConcurrentConfig;
  private lastDetected: DetectedBarcode[] = [];
  private frameCenter: { x: number; y: number };

  constructor(config?: Partial<ConcurrentConfig>) {
    this.config = {
      maxBarcodesPerFrame: 10,
      priorityStrategy: 'center',
      minConfidence: 50,
      spatialDeduplication: true,
      ...config,
    };

    // Default frame center (will be updated dynamically)
    this.frameCenter = { x: 0.5, y: 0.5 };
  }

  /**
   * Detect multiple barcodes in a single frame
   */
  detectMultiple(
    scanResults: ScanResult[], 
    frame?: Frame,
    frameSize?: { width: number; height: number }
  ): DetectedBarcode[] {
    if (scanResults.length === 0) {
      return [];
    }

    // Update frame center if provided
    if (frameSize) {
      this.frameCenter = {
        x: frameSize.width / 2,
        y: frameSize.height / 2,
      };
    }

    // Convert ScanResults to DetectedBarcodes
    let detected: DetectedBarcode[] = scanResults.map((scan, index) => ({
      ...scan,
      priority: this.calculatePriority(scan, index, scanResults.length),
    }));

    // Filter by minimum confidence
    detected = detected.filter(d => d.confidence >= this.config.minConfidence);

    // Apply spatial deduplication if enabled
    if (this.config.spatialDeduplication) {
      detected = this.deduplicateSpatially(detected);
    }

    // Sort by priority
    detected = this.prioritizeBarcodes(detected);

    // Limit to max barcodes per frame
    detected = detected.slice(0, this.config.maxBarcodesPerFrame);

    this.lastDetected = detected;
    return detected;
  }

  /**
   * Calculate priority for barcode based on strategy
   */
  private calculatePriority(
    scan: ScanResult, 
    index: number, 
    total: number
  ): number {
    switch (this.config.priorityStrategy) {
      case 'center':
        return this.calculateCenterPriority(scan);
      
      case 'size':
        return this.calculateSizePriority(scan);
      
      case 'confidence':
        return scan.confidence;
      
      case 'custom':
        // First barcode gets highest priority, others decreasing
        return 10 - (index * (9 / Math.max(1, total - 1)));
      
      default:
        return 5;
    }
  }

  /**
   * Calculate priority based on proximity to frame center
   */
  private calculateCenterPriority(scan: ScanResult): number {
    const detected = scan as DetectedBarcode;
    
    if (!detected.bounds) {
      return 5; // Medium priority if no position info
    }

    const barcodeCenter = {
      x: detected.bounds.x + detected.bounds.width / 2,
      y: detected.bounds.y + detected.bounds.height / 2,
    };

    // Calculate distance from frame center (normalized 0-1)
    const dx = (barcodeCenter.x - this.frameCenter.x) / this.frameCenter.x;
    const dy = (barcodeCenter.y - this.frameCenter.y) / this.frameCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Closer to center = higher priority (10 at center, 1 at edges)
    return Math.max(1, Math.min(10, 10 - distance * 9));
  }

  /**
   * Calculate priority based on barcode size
   */
  private calculateSizePriority(scan: ScanResult): number {
    const detected = scan as DetectedBarcode;
    
    if (!detected.bounds) {
      return 5;
    }

    const area = detected.bounds.width * detected.bounds.height;
    const frameArea = this.frameCenter.x * 2 * this.frameCenter.y * 2; // Approximate
    const sizeRatio = area / frameArea;

    // Larger barcodes get higher priority
    return Math.max(1, Math.min(10, sizeRatio * 100));
  }

  /**
   * Remove duplicate barcodes at same spatial position
   */
  private deduplicateSpatially(barcodes: DetectedBarcode[]): DetectedBarcode[] {
    const deduplicated: DetectedBarcode[] = [];
    const threshold = 0.5; // 50% overlap threshold

    for (const barcode of barcodes) {
      let isDuplicate = false;

      for (const existing of deduplicated) {
        if (
          barcode.barcode === existing.barcode &&
          this.hasSignificantOverlap(barcode.bounds, existing.bounds, threshold)
        ) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicated.push(barcode);
      }
    }

    return deduplicated;
  }

  /**
   * Check if two bounding boxes have significant overlap
   */
  private hasSignificantOverlap(
    bounds1?: SpatialPosition,
    bounds2?: SpatialPosition,
    threshold: number = 0.5
  ): boolean {
    if (!bounds1 || !bounds2) return false;

    const x1 = Math.max(bounds1.x, bounds2.x);
    const y1 = Math.max(bounds1.y, bounds2.y);
    const x2 = Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width);
    const y2 = Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height);

    if (x2 < x1 || y2 < y1) {
      return false; // No overlap
    }

    const overlapArea = (x2 - x1) * (y2 - y1);
    const area1 = bounds1.width * bounds1.height;
    const area2 = bounds2.width * bounds2.height;
    const minArea = Math.min(area1, area2);

    return (overlapArea / minArea) >= threshold;
  }

  /**
   * Sort barcodes by priority (highest first)
   */
  prioritizeBarcodes(barcodes: DetectedBarcode[]): DetectedBarcode[] {
    return [...barcodes].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate visual highlights for detected barcodes
   */
  highlightBarcodes(barcodes?: DetectedBarcode[]): Highlight[] {
    const toHighlight = barcodes || this.lastDetected;
    
    return toHighlight.map((barcode, index) => {
      const color = this.getHighlightColor(barcode.priority, index);
      const label = this.getHighlightLabel(barcode);

      return {
        barcode: barcode.barcode,
        position: barcode.bounds || { x: 0, y: 0, width: 100, height: 100 },
        color,
        priority: barcode.priority,
        label,
      };
    });
  }

  /**
   * Get highlight color based on priority
   */
  private getHighlightColor(priority: number, index: number): string {
    // Primary barcode (highest priority) = green
    // Others = blue/yellow based on priority
    if (index === 0) {
      return '#4CAF50'; // Green
    }

    if (priority >= 7) {
      return '#2196F3'; // Blue
    }

    if (priority >= 4) {
      return '#FFC107'; // Yellow/Amber
    }

    return '#FF9800'; // Orange
  }

  /**
   * Get highlight label
   */
  private getHighlightLabel(barcode: DetectedBarcode): string {
    return `${barcode.format.toUpperCase()} • ${Math.round(barcode.confidence)}%`;
  }

  /**
   * Get primary barcode (highest priority)
   */
  getPrimaryBarcode(): DetectedBarcode | null {
    if (this.lastDetected.length === 0) return null;
    return this.lastDetected[0];
  }

  /**
   * Get barcodes in region of interest
   */
  getBarcodesInRegion(region: SpatialPosition): DetectedBarcode[] {
    return this.lastDetected.filter(barcode => {
      if (!barcode.bounds) return false;

      // Check if barcode center is within region
      const centerX = barcode.bounds.x + barcode.bounds.width / 2;
      const centerY = barcode.bounds.y + barcode.bounds.height / 2;

      return (
        centerX >= region.x &&
        centerX <= region.x + region.width &&
        centerY >= region.y &&
        centerY <= region.y + region.height
      );
    });
  }

  /**
   * Capture all visible barcodes at once
   */
  captureAll(): DetectedBarcode[] {
    return [...this.lastDetected];
  }

  /**
   * Filter barcodes by format
   */
  filterByFormat(format: string, barcodes?: DetectedBarcode[]): DetectedBarcode[] {
    const toFilter = barcodes || this.lastDetected;
    return toFilter.filter(b => b.format === format);
  }

  /**
   * Get barcode count by format
   */
  getFormatCounts(barcodes?: DetectedBarcode[]): Record<string, number> {
    const toCount = barcodes || this.lastDetected;
    const counts: Record<string, number> = {};

    toCount.forEach(barcode => {
      counts[barcode.format] = (counts[barcode.format] || 0) + 1;
    });

    return counts;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ConcurrentConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConcurrentConfig {
    return { ...this.config };
  }

  /**
   * Get last detected barcodes
   */
  getLastDetected(): DetectedBarcode[] {
    return [...this.lastDetected];
  }

  /**
   * Clear last detected
   */
  clear(): void {
    this.lastDetected = [];
  }

  /**
   * Reset scanner
   */
  reset(): void {
    this.clear();
    this.frameCenter = { x: 0.5, y: 0.5 };
  }
}

export default ConcurrentScanner;
