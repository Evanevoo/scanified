/**
 * LowLightOptimizer - Specialized processor for low-light scenarios
 * 
 * Optimizes barcode scanning in challenging lighting conditions:
 * - Ambient light detection
 * - Auto-adjust camera settings
 * - Frame accumulation
 * - Flash recommendations
 */

import { ImageData } from './ImageEnhancer';
import { Frame } from './ImageProcessor';

export interface CameraSettings {
  exposure?: number; // -2.0 to 2.0 (EV compensation)
  iso?: number; // 100 to 3200
  brightness?: number; // 0.0 to 1.0
  contrast?: number; // 0.0 to 2.0
  enableFlash?: boolean;
  frameAccumulation?: number; // Number of frames to accumulate
}

export interface LightConditions {
  level: number; // 0.0 (dark) to 1.0 (bright)
  category: 'dark' | 'low' | 'normal' | 'bright';
  recommendation: string;
  settings: CameraSettings;
}

/**
 * Low-light optimization engine
 */
export class LowLightOptimizer {
  private lightLevelHistory: number[] = [];
  private maxHistorySize: number = 10;

  /**
   * Detect ambient light level
   * 
   * Returns value between 0 (dark) and 1 (bright)
   */
  detectLightLevel(image?: ImageData): number {
    if (!image) {
      // Fallback: use time of day as rough estimate
      return this.estimateLightFromTime();
    }

    // Calculate average luminance
    let totalLuminance = 0;
    const pixelCount = image.width * image.height;

    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    const level = totalLuminance / pixelCount;
    
    // Add to history
    this.lightLevelHistory.push(level);
    if (this.lightLevelHistory.length > this.maxHistorySize) {
      this.lightLevelHistory.shift();
    }

    return level;
  }

  /**
   * Get smoothed light level (average of recent measurements)
   */
  getSmoothedLightLevel(): number {
    if (this.lightLevelHistory.length === 0) return 0.5; // Default to medium

    const sum = this.lightLevelHistory.reduce((a, b) => a + b, 0);
    return sum / this.lightLevelHistory.length;
  }

  /**
   * Estimate light level from time of day
   */
  private estimateLightFromTime(): number {
    const hour = new Date().getHours();
    
    // Simple heuristic based on time
    if (hour >= 6 && hour <= 8) return 0.4; // Dawn
    if (hour > 8 && hour < 17) return 0.8; // Daytime
    if (hour >= 17 && hour <= 19) return 0.4; // Dusk
    return 0.2; // Night
  }

  /**
   * Analyze light conditions and get recommendations
   */
  analyzeLightConditions(lightLevel?: number): LightConditions {
    const level = lightLevel ?? this.getSmoothedLightLevel();
    
    let category: LightConditions['category'];
    let recommendation: string;
    let settings: CameraSettings;

    if (level < 0.25) {
      category = 'dark';
      recommendation = 'Very low light detected. Enable flash for best results.';
      settings = {
        exposure: 2.0,
        iso: 3200,
        brightness: 1.0,
        contrast: 1.5,
        enableFlash: true,
        frameAccumulation: 5,
      };
    } else if (level < 0.45) {
      category = 'low';
      recommendation = 'Low light detected. Consider enabling flash or moving to better lighting.';
      settings = {
        exposure: 1.0,
        iso: 1600,
        brightness: 0.8,
        contrast: 1.3,
        enableFlash: true,
        frameAccumulation: 3,
      };
    } else if (level < 0.75) {
      category = 'normal';
      recommendation = 'Lighting conditions are adequate.';
      settings = {
        exposure: 0.0,
        iso: 800,
        brightness: 0.5,
        contrast: 1.0,
        enableFlash: false,
        frameAccumulation: 1,
      };
    } else {
      category = 'bright';
      recommendation = 'Good lighting conditions.';
      settings = {
        exposure: -0.5,
        iso: 100,
        brightness: 0.3,
        contrast: 1.0,
        enableFlash: false,
        frameAccumulation: 1,
      };
    }

    return { level, category, recommendation, settings };
  }

  /**
   * Optimize camera settings for current light level
   */
  optimizeCameraSettings(lightLevel: number): CameraSettings {
    const conditions = this.analyzeLightConditions(lightLevel);
    return conditions.settings;
  }

  /**
   * Accumulate multiple frames to reduce noise in low light
   * 
   * Combines pixel data from multiple frames using averaging
   */
  accumulateFrames(frames: Frame[]): ImageData | null {
    if (frames.length === 0) return null;
    
    // For now, this is a placeholder
    // In production, would extract ImageData from frames and combine
    // This requires platform-specific implementation
    
    const firstFrame = frames[0];
    if (!firstFrame.data) return null;

    // Simple average accumulation
    // In production, would use more sophisticated algorithms like:
    // - Weighted averaging (recent frames weighted more)
    // - Motion-compensated accumulation
    // - HDR-style multi-exposure fusion

    return {
      data: [],
      width: firstFrame.metadata?.width || 640,
      height: firstFrame.metadata?.height || 480,
      format: 'rgba',
    };
  }

  /**
   * Apply noise reduction specifically for low-light images
   */
  applyLowLightNoiseReduction(image: ImageData): ImageData {
    // Use stronger bilateral filter for low-light noise
    return this.bilateralFilter(image, 5, 50, 50);
  }

  /**
   * Bilateral filter for edge-preserving noise reduction
   * 
   * Better than Gaussian blur for preserving barcode edges
   */
  private bilateralFilter(
    image: ImageData, 
    diameter: number, 
    sigmaColor: number, 
    sigmaSpace: number
  ): ImageData {
    const filtered = { ...image, data: new Array(image.data.length) };
    const radius = Math.floor(diameter / 2);

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const centerIdx = (y * image.width + x) * 4;
        const centerR = image.data[centerIdx];
        const centerG = image.data[centerIdx + 1];
        const centerB = image.data[centerIdx + 2];

        let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const pixelY = y + dy;
            const pixelX = x + dx;

            if (pixelY < 0 || pixelY >= image.height || pixelX < 0 || pixelX >= image.width) {
              continue;
            }

            const pixelIdx = (pixelY * image.width + pixelX) * 4;
            const pixelR = image.data[pixelIdx];
            const pixelG = image.data[pixelIdx + 1];
            const pixelB = image.data[pixelIdx + 2];

            // Spatial weight
            const spatialDist = dx * dx + dy * dy;
            const spatialWeight = Math.exp(-spatialDist / (2 * sigmaSpace * sigmaSpace));

            // Color weight
            const colorDist = 
              (pixelR - centerR) ** 2 + 
              (pixelG - centerG) ** 2 + 
              (pixelB - centerB) ** 2;
            const colorWeight = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));

            const weight = spatialWeight * colorWeight;

            sumR += pixelR * weight;
            sumG += pixelG * weight;
            sumB += pixelB * weight;
            sumWeight += weight;
          }
        }

        if (sumWeight > 0) {
          filtered.data[centerIdx] = sumR / sumWeight;
          filtered.data[centerIdx + 1] = sumG / sumWeight;
          filtered.data[centerIdx + 2] = sumB / sumWeight;
          filtered.data[centerIdx + 3] = image.data[centerIdx + 3]; // Preserve alpha
        } else {
          filtered.data[centerIdx] = centerR;
          filtered.data[centerIdx + 1] = centerG;
          filtered.data[centerIdx + 2] = centerB;
          filtered.data[centerIdx + 3] = image.data[centerIdx + 3];
        }
      }
    }

    return filtered;
  }

  /**
   * Enhance image specifically for low-light conditions
   */
  enhanceForLowLight(image: ImageData): ImageData {
    let enhanced = { ...image, data: [...image.data] };

    // 1. Apply noise reduction
    enhanced = this.applyLowLightNoiseReduction(enhanced);

    // 2. Boost brightness and contrast
    enhanced = this.boostBrightnessAndContrast(enhanced, 1.5, 1.3);

    // 3. Apply adaptive histogram equalization to local regions
    enhanced = this.adaptiveHistogramEqualization(enhanced);

    return enhanced;
  }

  /**
   * Boost brightness and contrast
   */
  private boostBrightnessAndContrast(
    image: ImageData, 
    brightness: number, 
    contrast: number
  ): ImageData {
    const enhanced = { ...image, data: [...image.data] };
    const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));

    for (let i = 0; i < enhanced.data.length; i += 4) {
      // Apply contrast
      let r = factor * (enhanced.data[i] - 128) + 128;
      let g = factor * (enhanced.data[i + 1] - 128) + 128;
      let b = factor * (enhanced.data[i + 2] - 128) + 128;

      // Apply brightness
      r = r * brightness;
      g = g * brightness;
      b = b * brightness;

      // Clamp values
      enhanced.data[i] = Math.min(255, Math.max(0, r));
      enhanced.data[i + 1] = Math.min(255, Math.max(0, g));
      enhanced.data[i + 2] = Math.min(255, Math.max(0, b));
    }

    return enhanced;
  }

  /**
   * Adaptive histogram equalization (CLAHE - simplified)
   */
  private adaptiveHistogramEqualization(image: ImageData): ImageData {
    // Simplified CLAHE implementation
    // In production, would implement full Contrast Limited Adaptive Histogram Equalization
    
    const enhanced = { ...image, data: [...image.data] };
    const tileSize = 16; // Process in 16x16 tiles
    const clipLimit = 4.0;

    for (let tileY = 0; tileY < image.height; tileY += tileSize) {
      for (let tileX = 0; tileX < image.width; tileX += tileSize) {
        this.equalizeRegion(
          enhanced, 
          tileX, 
          tileY, 
          Math.min(tileSize, image.width - tileX),
          Math.min(tileSize, image.height - tileY),
          clipLimit
        );
      }
    }

    return enhanced;
  }

  /**
   * Equalize a region of the image
   */
  private equalizeRegion(
    image: ImageData, 
    startX: number, 
    startY: number, 
    width: number, 
    height: number,
    clipLimit: number
  ): void {
    const histogram = new Array(256).fill(0);
    const pixelCount = width * height;

    // Build histogram for region
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        const idx = (y * image.width + x) * 4;
        const luminance = Math.round(
          0.299 * image.data[idx] +
          0.587 * image.data[idx + 1] +
          0.114 * image.data[idx + 2]
        );
        histogram[luminance]++;
      }
    }

    // Apply clip limit
    const excessTotal = histogram.reduce((sum, count) => {
      const excess = Math.max(0, count - clipLimit);
      return sum + excess;
    }, 0);
    
    const redistributePerBin = excessTotal / 256;
    
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > clipLimit) {
        histogram[i] = clipLimit;
      }
      histogram[i] += redistributePerBin;
    }

    // Calculate CDF
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Normalize CDF
    const cdfMin = cdf.find(v => v > 0) || 0;
    const scale = 255 / (pixelCount - cdfMin);

    // Apply equalization to region
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        const idx = (y * image.width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          const value = Math.round(image.data[idx + c]);
          const newValue = Math.round((cdf[value] - cdfMin) * scale);
          image.data[idx + c] = Math.min(255, Math.max(0, newValue));
        }
      }
    }
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.lightLevelHistory = [];
  }
}

export default LowLightOptimizer;
