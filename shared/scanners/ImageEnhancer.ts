/**
 * ImageEnhancer - Image enhancement pipeline for challenging conditions
 * 
 * Provides algorithms for improving barcode readability:
 * - Automatic contrast adjustment
 * - Adaptive brightness
 * - Sharpening for blurry captures
 * - Noise reduction
 */

export interface ImageData {
  data: Uint8ClampedArray | number[]; // Pixel data (RGBA)
  width: number;
  height: number;
  format?: 'rgba' | 'rgb' | 'grayscale';
}

export interface EnhancementOptions {
  autoContrast?: boolean;
  brightness?: number; // -100 to 100
  sharpen?: boolean;
  denoise?: boolean;
  gamma?: number; // 0.1 to 3.0
}

/**
 * Image enhancement pipeline
 */
export class ImageEnhancer {
  /**
   * Apply all enhancements in sequence
   */
  static enhance(image: ImageData, options: EnhancementOptions = {}): ImageData {
    let enhanced = { ...image, data: [...image.data] };

    // Apply enhancements in optimal order
    if (options.denoise) {
      enhanced = this.denoise(enhanced);
    }

    if (options.autoContrast) {
      enhanced = this.autoContrast(enhanced);
    }

    if (options.brightness !== undefined && options.brightness !== 0) {
      enhanced = this.adjustBrightness(enhanced, options.brightness);
    }

    if (options.gamma !== undefined && options.gamma !== 1.0) {
      enhanced = this.gammaCorrection(enhanced, options.gamma);
    }

    if (options.sharpen) {
      enhanced = this.sharpen(enhanced);
    }

    return enhanced;
  }

  /**
   * Automatic contrast adjustment using histogram equalization
   */
  static autoContrast(image: ImageData): ImageData {
    const enhanced = { ...image, data: [...image.data] };
    const histogram = new Array(256).fill(0);
    const pixelCount = image.width * image.height;

    // Build histogram (using luminance)
    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histogram[luminance]++;
    }

    // Calculate cumulative distribution function (CDF)
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Find min and max non-zero CDF values
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    // Apply histogram equalization
    for (let i = 0; i < enhanced.data.length; i += 4) {
      const r = enhanced.data[i];
      const g = enhanced.data[i + 1];
      const b = enhanced.data[i + 2];
      
      // Equalize each channel
      enhanced.data[i] = this.equalizeValue(r, cdf, cdfMin, pixelCount);
      enhanced.data[i + 1] = this.equalizeValue(g, cdf, cdfMin, pixelCount);
      enhanced.data[i + 2] = this.equalizeValue(b, cdf, cdfMin, pixelCount);
    }

    return enhanced;
  }

  /**
   * Helper for histogram equalization
   */
  private static equalizeValue(value: number, cdf: number[], cdfMin: number, pixelCount: number): number {
    return Math.round(((cdf[Math.round(value)] - cdfMin) / (pixelCount - cdfMin)) * 255);
  }

  /**
   * Adjust brightness (-100 to 100)
   */
  static adjustBrightness(image: ImageData, adjustment: number): ImageData {
    const enhanced = { ...image, data: [...image.data] };
    const factor = adjustment / 100;

    for (let i = 0; i < enhanced.data.length; i += 4) {
      enhanced.data[i] = this.clamp(enhanced.data[i] + factor * 255, 0, 255);
      enhanced.data[i + 1] = this.clamp(enhanced.data[i + 1] + factor * 255, 0, 255);
      enhanced.data[i + 2] = this.clamp(enhanced.data[i + 2] + factor * 255, 0, 255);
    }

    return enhanced;
  }

  /**
   * Gamma correction for brightness adjustment
   */
  static gammaCorrection(image: ImageData, gamma: number): ImageData {
    const enhanced = { ...image, data: [...image.data] };
    
    // Pre-compute gamma lookup table for performance
    const gammaLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      gammaLUT[i] = Math.round(255 * Math.pow(i / 255, 1 / gamma));
    }

    for (let i = 0; i < enhanced.data.length; i += 4) {
      enhanced.data[i] = gammaLUT[Math.round(enhanced.data[i])];
      enhanced.data[i + 1] = gammaLUT[Math.round(enhanced.data[i + 1])];
      enhanced.data[i + 2] = gammaLUT[Math.round(enhanced.data[i + 2])];
    }

    return enhanced;
  }

  /**
   * Sharpen image using unsharp mask
   */
  static sharpen(image: ImageData): ImageData {
    // Simplified sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    return this.applyConvolution(image, kernel, 3);
  }

  /**
   * Reduce noise using Gaussian blur
   */
  static denoise(image: ImageData): ImageData {
    // Gaussian blur kernel (3x3)
    const kernel = [
      1 / 16, 2 / 16, 1 / 16,
      2 / 16, 4 / 16, 2 / 16,
      1 / 16, 2 / 16, 1 / 16
    ];

    return this.applyConvolution(image, kernel, 3);
  }

  /**
   * Apply convolution filter (kernel)
   */
  static applyConvolution(image: ImageData, kernel: number[], kernelSize: number): ImageData {
    const enhanced = { ...image, data: new Array(image.data.length) };
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        let r = 0, g = 0, b = 0;

        // Apply kernel
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const pixelY = y + ky - half;
            const pixelX = x + kx - half;

            // Handle boundaries by clamping
            const boundedY = this.clamp(pixelY, 0, image.height - 1);
            const boundedX = this.clamp(pixelX, 0, image.width - 1);

            const pixelIndex = (boundedY * image.width + boundedX) * 4;
            const kernelValue = kernel[ky * kernelSize + kx];

            r += image.data[pixelIndex] * kernelValue;
            g += image.data[pixelIndex + 1] * kernelValue;
            b += image.data[pixelIndex + 2] * kernelValue;
          }
        }

        const targetIndex = (y * image.width + x) * 4;
        enhanced.data[targetIndex] = this.clamp(r, 0, 255);
        enhanced.data[targetIndex + 1] = this.clamp(g, 0, 255);
        enhanced.data[targetIndex + 2] = this.clamp(b, 0, 255);
        enhanced.data[targetIndex + 3] = image.data[targetIndex + 3]; // Preserve alpha
      }
    }

    return enhanced;
  }

  /**
   * Convert to grayscale for better barcode detection
   */
  static toGrayscale(image: ImageData): ImageData {
    const grayscale = { ...image, data: [...image.data], format: 'grayscale' as const };

    for (let i = 0; i < grayscale.data.length; i += 4) {
      const r = grayscale.data[i];
      const g = grayscale.data[i + 1];
      const b = grayscale.data[i + 2];
      
      // Weighted luminance calculation
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      grayscale.data[i] = gray;
      grayscale.data[i + 1] = gray;
      grayscale.data[i + 2] = gray;
    }

    return grayscale;
  }

  /**
   * Apply adaptive threshold for barcode detection
   */
  static adaptiveThreshold(image: ImageData, blockSize: number = 11, c: number = 2): ImageData {
    const grayscale = this.toGrayscale(image);
    const thresholded = { ...grayscale, data: [...grayscale.data] };
    const half = Math.floor(blockSize / 2);

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        let sum = 0;
        let count = 0;

        // Calculate local mean
        for (let by = -half; by <= half; by++) {
          for (let bx = -half; bx <= half; bx++) {
            const pixelY = this.clamp(y + by, 0, image.height - 1);
            const pixelX = this.clamp(x + bx, 0, image.width - 1);
            const pixelIndex = (pixelY * image.width + pixelX) * 4;
            sum += grayscale.data[pixelIndex];
            count++;
          }
        }

        const mean = sum / count;
        const pixelIndex = (y * image.width + x) * 4;
        const pixelValue = grayscale.data[pixelIndex];
        
        // Apply threshold
        const threshold = mean - c;
        const binaryValue = pixelValue > threshold ? 255 : 0;
        
        thresholded.data[pixelIndex] = binaryValue;
        thresholded.data[pixelIndex + 1] = binaryValue;
        thresholded.data[pixelIndex + 2] = binaryValue;
      }
    }

    return thresholded;
  }

  /**
   * Clamp value between min and max
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Auto-detect optimal enhancement settings based on image analysis
   */
  static detectOptimalSettings(image: ImageData): EnhancementOptions {
    const stats = this.analyzeImage(image);
    const settings: EnhancementOptions = {};

    // Low contrast? Enable auto-contrast
    if (stats.contrast < 50) {
      settings.autoContrast = true;
    }

    // Dark image? Increase brightness
    if (stats.brightness < 80) {
      settings.brightness = 40;
      settings.gamma = 1.2;
    }

    // Noisy image? Enable denoising
    if (stats.noise > 20) {
      settings.denoise = true;
    }

    // Blurry? Enable sharpening
    if (stats.sharpness < 40) {
      settings.sharpen = true;
    }

    return settings;
  }

  /**
   * Analyze image statistics
   */
  static analyzeImage(image: ImageData): {
    brightness: number;
    contrast: number;
    noise: number;
    sharpness: number;
  } {
    let sumLuminance = 0;
    let minLuminance = 255;
    let maxLuminance = 0;
    const pixelCount = image.width * image.height;

    // Calculate basic statistics
    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      sumLuminance += luminance;
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
    }

    const avgBrightness = sumLuminance / pixelCount;
    const contrast = maxLuminance - minLuminance;

    // Simplified noise and sharpness estimation
    // In production, would use more sophisticated algorithms
    const noise = this.estimateNoise(image);
    const sharpness = this.estimateSharpness(image);

    return {
      brightness: avgBrightness,
      contrast,
      noise,
      sharpness,
    };
  }

  /**
   * Estimate image noise level (0-100)
   */
  private static estimateNoise(image: ImageData): number {
    // Simplified noise estimation
    // Higher variance in local patches indicates more noise
    let variance = 0;
    const sampleSize = Math.min(1000, Math.floor(image.width * image.height / 100));

    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * (image.data.length / 4)) * 4;
      const centerValue = image.data[idx];
      
      // Check neighboring pixels
      const neighbors = [
        image.data[idx + 4] || centerValue,
        image.data[idx - 4] || centerValue,
      ];
      
      neighbors.forEach(neighbor => {
        variance += Math.abs(neighbor - centerValue);
      });
    }

    return Math.min(100, (variance / sampleSize) * 2);
  }

  /**
   * Estimate image sharpness (0-100)
   */
  private static estimateSharpness(image: ImageData): number {
    // Simplified sharpness estimation using edge detection
    // Higher edge magnitude indicates sharper image
    let edgeMagnitude = 0;
    const sampleSize = Math.min(1000, Math.floor(image.width * image.height / 100));

    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * (image.data.length / 4)) * 4;
      const centerValue = image.data[idx];
      
      const rightValue = image.data[idx + 4] || centerValue;
      const bottomValue = image.data[idx + image.width * 4] || centerValue;
      
      const gradientX = Math.abs(rightValue - centerValue);
      const gradientY = Math.abs(bottomValue - centerValue);
      
      edgeMagnitude += Math.sqrt(gradientX * gradientX + gradientY * gradientY);
    }

    return Math.min(100, (edgeMagnitude / sampleSize) * 5);
  }
}

export default ImageEnhancer;
