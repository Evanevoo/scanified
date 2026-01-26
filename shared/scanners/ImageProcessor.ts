/**
 * ImageProcessor - Multi-frame analysis engine
 * 
 * Combines results from multiple camera frames to increase confidence
 * for damaged or partial barcodes. Tracks barcodes across frames for stability.
 */

import { ScanResult, TrackedBarcode } from './UnifiedScanner';

export interface Frame {
  data: any; // Frame data (ImageData, URI, or platform-specific format)
  timestamp: number;
  index: number;
  metadata?: {
    width?: number;
    height?: number;
    orientation?: number;
    lightLevel?: number;
  };
}

export interface AggregatedResult {
  barcode: string;
  confidence: number;
  frameCount: number;
  firstFrame: number;
  lastFrame: number;
  formats: string[];
  consensusReached: boolean;
}

/**
 * Multi-frame processor for aggregating scan results
 */
export class MultiFrameProcessor {
  private frameBuffer: Frame[] = [];
  private maxBufferSize: number;
  private minConsensusFrames: number;
  private trackedBarcodes: Map<string, TrackedBarcode> = new Map();

  constructor(options?: { 
    bufferSize?: number; 
    minConsensusFrames?: number;
  }) {
    this.maxBufferSize = options?.bufferSize || 5;
    this.minConsensusFrames = options?.minConsensusFrames || 2;
  }

  /**
   * Add a frame to the buffer
   */
  addFrame(frame: Frame): void {
    this.frameBuffer.push(frame);
    
    // Keep buffer size limited
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }
  }

  /**
   * Get current frame buffer
   */
  getFrameBuffer(): Frame[] {
    return [...this.frameBuffer];
  }

  /**
   * Clear frame buffer
   */
  clearBuffer(): void {
    this.frameBuffer = [];
  }

  /**
   * Aggregate barcode detections across multiple frames
   * 
   * Returns barcodes that appear in at least minConsensusFrames frames
   * with confidence scores based on frequency
   */
  aggregateResults(scanResults: ScanResult[]): AggregatedResult[] {
    if (scanResults.length === 0) return [];

    // Group results by barcode
    const barcodeMap = new Map<string, ScanResult[]>();
    
    scanResults.forEach(result => {
      const existing = barcodeMap.get(result.barcode) || [];
      existing.push(result);
      barcodeMap.set(result.barcode, existing);
    });

    // Build aggregated results
    const aggregated: AggregatedResult[] = [];

    barcodeMap.forEach((results, barcode) => {
      const frameCount = results.length;
      
      // Skip if doesn't meet consensus threshold
      if (frameCount < this.minConsensusFrames) {
        return;
      }

      const frames = results.map(r => r.frame);
      const formats = [...new Set(results.map(r => r.format))];
      
      // Calculate confidence based on frame count and consistency
      const baseConfidence = Math.min(100, (frameCount / this.maxBufferSize) * 100);
      const formatConsistency = formats.length === 1 ? 1 : 0.8; // Penalize mixed formats
      const confidence = Math.round(baseConfidence * formatConsistency);

      aggregated.push({
        barcode,
        confidence,
        frameCount,
        firstFrame: Math.min(...frames),
        lastFrame: Math.max(...frames),
        formats,
        consensusReached: frameCount >= this.minConsensusFrames,
      });
    });

    // Sort by confidence (highest first)
    return aggregated.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Track barcodes across frames for stability
   * 
   * Maintains a history of detected barcodes with position tracking
   */
  trackBarcodes(current: ScanResult[], previous: ScanResult[]): TrackedBarcode[] {
    const now = Date.now();
    const tracked: TrackedBarcode[] = [];

    // Update existing tracked barcodes
    current.forEach(scanResult => {
      const existing = this.trackedBarcodes.get(scanResult.barcode);
      
      if (existing) {
        // Update existing tracked barcode
        existing.lastSeen = now;
        existing.frameCount++;
        existing.confidence = Math.min(100, existing.confidence + 5); // Increase confidence
      } else {
        // Create new tracked barcode
        this.trackedBarcodes.set(scanResult.barcode, {
          barcode: scanResult.barcode,
          format: scanResult.format,
          firstSeen: now,
          lastSeen: now,
          frameCount: 1,
          confidence: scanResult.confidence,
          positions: [],
        });
      }
    });

    // Clean up stale barcodes (not seen in last 3 seconds)
    const staleThreshold = 3000;
    this.trackedBarcodes.forEach((tracked, barcode) => {
      if (now - tracked.lastSeen > staleThreshold) {
        this.trackedBarcodes.delete(barcode);
      }
    });

    // Convert to array
    this.trackedBarcodes.forEach(tracked => {
      tracked.push(tracked);
    });

    return tracked;
  }

  /**
   * Detect if a barcode is stationary (vs moving)
   * 
   * Useful for filtering out accidental scans during camera movement
   */
  isStationaryBarcode(barcode: string, threshold: number = 3): boolean {
    const tracked = this.trackedBarcodes.get(barcode);
    if (!tracked) return false;

    return tracked.frameCount >= threshold;
  }

  /**
   * Get confidence score for a barcode based on tracking history
   */
  getConfidenceScore(barcode: string): number {
    const tracked = this.trackedBarcodes.get(barcode);
    if (!tracked) return 0;

    // Confidence increases with frame count
    const frameScore = Math.min(100, (tracked.frameCount / this.maxBufferSize) * 100);
    
    // Recency bonus (barcodes seen recently are more confident)
    const recency = Date.now() - tracked.lastSeen;
    const recencyBonus = recency < 1000 ? 10 : (recency < 2000 ? 5 : 0);

    return Math.min(100, frameScore + recencyBonus);
  }

  /**
   * Get all currently tracked barcodes
   */
  getTrackedBarcodes(): TrackedBarcode[] {
    return Array.from(this.trackedBarcodes.values());
  }

  /**
   * Clear tracked barcodes
   */
  clearTracking(): void {
    this.trackedBarcodes.clear();
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.clearBuffer();
    this.clearTracking();
  }
}

/**
 * Frame comparison utilities
 */
export class FrameComparator {
  /**
   * Calculate similarity between two frames
   * Returns value between 0 (completely different) and 1 (identical)
   * 
   * Note: Actual implementation would depend on platform-specific image data
   * This is a placeholder for the interface
   */
  static calculateSimilarity(frame1: Frame, frame2: Frame): number {
    // Simple timestamp-based similarity for now
    // In production, this would compare actual pixel data or features
    const timeDiff = Math.abs(frame1.timestamp - frame2.timestamp);
    
    if (timeDiff < 100) return 0.95; // Very similar if captured within 100ms
    if (timeDiff < 500) return 0.80; // Somewhat similar
    if (timeDiff < 1000) return 0.50; // Different enough
    
    return 0.20; // Very different
  }

  /**
   * Check if two frames are similar enough to skip processing
   */
  static areSimilar(frame1: Frame, frame2: Frame, threshold: number = 0.95): boolean {
    return this.calculateSimilarity(frame1, frame2) >= threshold;
  }

  /**
   * Detect if camera is moving based on frame sequence
   */
  static isCameraMoving(frames: Frame[], threshold: number = 0.7): boolean {
    if (frames.length < 2) return false;

    let similaritySum = 0;
    let comparisons = 0;

    for (let i = 1; i < frames.length; i++) {
      similaritySum += this.calculateSimilarity(frames[i - 1], frames[i]);
      comparisons++;
    }

    const avgSimilarity = similaritySum / comparisons;
    return avgSimilarity < threshold; // Camera moving if frames are different
  }
}

/**
 * Frame quality analyzer
 */
export class FrameQualityAnalyzer {
  /**
   * Analyze frame quality for barcode scanning
   */
  static analyzeQuality(frame: Frame): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check light level
    if (frame.metadata?.lightLevel !== undefined) {
      if (frame.metadata.lightLevel < 0.3) {
        issues.push('Low light conditions');
        recommendations.push('Enable flash or move to better lighting');
        score -= 20;
      }
    }

    // Check resolution
    if (frame.metadata?.width && frame.metadata.height) {
      const pixels = frame.metadata.width * frame.metadata.height;
      if (pixels < 640 * 480) {
        issues.push('Low resolution');
        recommendations.push('Use higher quality camera settings');
        score -= 15;
      }
    }

    // Check orientation
    if (frame.metadata?.orientation && frame.metadata.orientation !== 0) {
      issues.push('Camera not level');
      recommendations.push('Hold camera level for better accuracy');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Determine if frame is suitable for processing
   */
  static isSuitableForProcessing(frame: Frame, minScore: number = 50): boolean {
    const quality = this.analyzeQuality(frame);
    return quality.score >= minScore;
  }
}

export default MultiFrameProcessor;
