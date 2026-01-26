/**
 * FrameOptimizer - Optimize frame processing for maximum throughput
 * 
 * Provides:
 * - Adaptive FPS based on device capability
 * - Frame similarity detection (skip duplicates)
 * - Resolution downsampling
 * - ROI (Region of Interest) cropping
 */

import { Frame } from './ImageProcessor';

export interface DeviceMetrics {
  cpuCores: number;
  memoryAvailable: number; // MB
  batteryLevel: number; // 0-100
  isLowPowerMode: boolean;
  deviceTier: 'low' | 'mid' | 'high';
}

export interface OptimizationSettings {
  targetFPS: number;
  resolution: { width: number; height: number };
  enableROI: boolean;
  roiRegion?: { x: number; y: number; width: number; height: number };
  skipSimilarFrames: boolean;
  similarityThreshold: number; // 0-1
  downsampleFactor: number; // 1 = no downsampling, 2 = half resolution, etc.
}

/**
 * Frame optimization engine
 */
export class FrameOptimizer {
  private settings: OptimizationSettings;
  private lastProcessedFrame: Frame | null = null;
  private frameSkipCount: number = 0;
  private totalFrameCount: number = 0;
  private deviceMetrics: DeviceMetrics | null = null;

  constructor(settings?: Partial<OptimizationSettings>) {
    const defaultSettings: OptimizationSettings = {
      targetFPS: 15,
      resolution: { width: 1280, height: 720 },
      enableROI: true,
      roiRegion: undefined, // Will be calculated
      skipSimilarFrames: true,
      similarityThreshold: 0.95,
      downsampleFactor: 1,
    };

    this.settings = { ...defaultSettings, ...settings };
  }

  /**
   * Adjust frame rate based on device capability
   */
  adjustFrameRate(deviceMetrics: DeviceMetrics): number {
    this.deviceMetrics = deviceMetrics;

    let fps = 15; // Default

    switch (deviceMetrics.deviceTier) {
      case 'high':
        fps = 30;
        break;
      case 'mid':
        fps = 15;
        break;
      case 'low':
        fps = 5;
        break;
    }

    // Reduce FPS in low power mode
    if (deviceMetrics.isLowPowerMode) {
      fps = Math.max(5, Math.floor(fps / 2));
    }

    // Reduce FPS on low battery
    if (deviceMetrics.batteryLevel < 20) {
      fps = Math.max(5, Math.floor(fps * 0.7));
    }

    this.settings.targetFPS = fps;
    return fps;
  }

  /**
   * Check if frame should be skipped (too similar to previous)
   */
  shouldSkipFrame(frame: Frame): boolean {
    if (!this.settings.skipSimilarFrames) {
      return false;
    }

    if (!this.lastProcessedFrame) {
      return false;
    }

    const similarity = this.calculateFrameSimilarity(frame, this.lastProcessedFrame);
    const shouldSkip = similarity >= this.settings.similarityThreshold;

    if (shouldSkip) {
      this.frameSkipCount++;
    }

    return shouldSkip;
  }

  /**
   * Calculate similarity between two frames
   * Returns value between 0 (completely different) and 1 (identical)
   */
  private calculateFrameSimilarity(frame1: Frame, frame2: Frame): number {
    // Simple timestamp-based similarity check
    // In production, would compare actual pixel data
    const timeDiff = Math.abs(frame1.timestamp - frame2.timestamp);
    
    // Frames within 50ms are likely very similar
    if (timeDiff < 50) return 0.98;
    if (timeDiff < 100) return 0.90;
    if (timeDiff < 200) return 0.75;
    if (timeDiff < 500) return 0.50;
    
    // Check metadata similarity
    if (frame1.metadata && frame2.metadata) {
      if (
        frame1.metadata.orientation === frame2.metadata.orientation &&
        Math.abs((frame1.metadata.lightLevel || 0) - (frame2.metadata.lightLevel || 0)) < 0.1
      ) {
        return 0.85;
      }
    }
    
    return 0.30; // Likely different
  }

  /**
   * Optimize frame resolution (downsample if needed)
   */
  optimizeResolution(frame: Frame): Frame {
    if (this.settings.downsampleFactor <= 1) {
      return frame; // No downsampling needed
    }

    const targetWidth = Math.floor((frame.metadata?.width || 1280) / this.settings.downsampleFactor);
    const targetHeight = Math.floor((frame.metadata?.height || 720) / this.settings.downsampleFactor);

    // Create optimized frame
    const optimized: Frame = {
      ...frame,
      metadata: {
        ...frame.metadata,
        width: targetWidth,
        height: targetHeight,
      },
    };

    return optimized;
  }

  /**
   * Crop frame to Region of Interest
   */
  cropToROI(frame: Frame, roi?: { x: number; y: number; width: number; height: number }): Frame {
    if (!this.settings.enableROI) {
      return frame;
    }

    const region = roi || this.settings.roiRegion || this.calculateDefaultROI(frame);

    // Create cropped frame
    const cropped: Frame = {
      ...frame,
      metadata: {
        ...frame.metadata,
        width: region.width,
        height: region.height,
      },
    };

    return cropped;
  }

  /**
   * Calculate default ROI (center 40% of frame)
   */
  private calculateDefaultROI(frame: Frame): { x: number; y: number; width: number; height: number } {
    const frameWidth = frame.metadata?.width || 1280;
    const frameHeight = frame.metadata?.height || 720;

    const roiWidth = Math.floor(frameWidth * 0.4);
    const roiHeight = Math.floor(frameHeight * 0.4);
    const roiX = Math.floor((frameWidth - roiWidth) / 2);
    const roiY = Math.floor((frameHeight - roiHeight) / 2);

    return {
      x: roiX,
      y: roiY,
      width: roiWidth,
      height: roiHeight,
    };
  }

  /**
   * Process frame with all optimizations
   */
  processFrame(frame: Frame): Frame | null {
    this.totalFrameCount++;

    // Skip similar frames
    if (this.shouldSkipFrame(frame)) {
      return null;
    }

    // Optimize resolution
    let optimized = this.optimizeResolution(frame);

    // Apply ROI cropping
    optimized = this.cropToROI(optimized);

    // Update last processed frame
    this.lastProcessedFrame = optimized;

    return optimized;
  }

  /**
   * Auto-tune settings based on performance
   */
  autoTune(averageFPS: number, targetFPS: number): void {
    if (averageFPS < targetFPS * 0.8) {
      // Performance is poor, reduce quality
      
      // Increase downsampling
      if (this.settings.downsampleFactor < 4) {
        this.settings.downsampleFactor = Math.min(4, this.settings.downsampleFactor + 0.5);
      }

      // Reduce target FPS
      if (this.settings.targetFPS > 5) {
        this.settings.targetFPS = Math.max(5, Math.floor(this.settings.targetFPS * 0.8));
      }

      // Enable frame skipping
      this.settings.skipSimilarFrames = true;
      this.settings.similarityThreshold = Math.min(0.98, this.settings.similarityThreshold + 0.05);

    } else if (averageFPS > targetFPS * 1.2) {
      // Performance is good, increase quality

      // Decrease downsampling
      if (this.settings.downsampleFactor > 1) {
        this.settings.downsampleFactor = Math.max(1, this.settings.downsampleFactor - 0.5);
      }

      // Increase target FPS (if device allows)
      if (this.deviceMetrics && this.deviceMetrics.deviceTier !== 'low') {
        this.settings.targetFPS = Math.min(30, this.settings.targetFPS + 5);
      }

      // Relax frame skipping threshold
      if (this.settings.similarityThreshold > 0.90) {
        this.settings.similarityThreshold = Math.max(0.90, this.settings.similarityThreshold - 0.05);
      }
    }
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    totalFrames: number;
    framesSkipped: number;
    skipRate: number;
    currentFPS: number;
    downsampleFactor: number;
  } {
    return {
      totalFrames: this.totalFrameCount,
      framesSkipped: this.frameSkipCount,
      skipRate: this.totalFrameCount > 0 ? this.frameSkipCount / this.totalFrameCount : 0,
      currentFPS: this.settings.targetFPS,
      downsampleFactor: this.settings.downsampleFactor,
    };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Get current settings
   */
  getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.lastProcessedFrame = null;
    this.frameSkipCount = 0;
    this.totalFrameCount = 0;
  }

  /**
   * Estimate device tier from metrics
   */
  static estimateDeviceTier(cpuCores: number, memoryMB: number): DeviceMetrics['deviceTier'] {
    if (cpuCores >= 6 && memoryMB >= 4096) {
      return 'high';
    } else if (cpuCores >= 4 && memoryMB >= 2048) {
      return 'mid';
    }
    return 'low';
  }

  /**
   * Get recommended settings for device
   */
  static getRecommendedSettings(deviceMetrics: DeviceMetrics): Partial<OptimizationSettings> {
    switch (deviceMetrics.deviceTier) {
      case 'high':
        return {
          targetFPS: 30,
          downsampleFactor: 1,
          skipSimilarFrames: true,
          similarityThreshold: 0.95,
        };
      
      case 'mid':
        return {
          targetFPS: 15,
          downsampleFactor: 1.5,
          skipSimilarFrames: true,
          similarityThreshold: 0.93,
        };
      
      case 'low':
        return {
          targetFPS: 5,
          downsampleFactor: 2,
          skipSimilarFrames: true,
          similarityThreshold: 0.90,
        };
    }
  }
}

export default FrameOptimizer;
