/**
 * UnifiedScanner - Platform-agnostic scanner interface
 * 
 * Provides a unified API for barcode scanning across iOS and Android platforms.
 * Automatically selects the best scanner implementation based on platform.
 */

import { Platform } from 'react-native';

// ===== Types & Interfaces =====

export type BarcodeFormat = 
  | 'qr' 
  | 'code39' 
  | 'code128' 
  | 'ean13' 
  | 'ean8' 
  | 'upc_a' 
  | 'upc_e' 
  | 'code93'
  | 'codabar'
  | 'itf14'
  | 'datamatrix'
  | 'pdf417'
  | 'aztec';

export type ScanMode = 'single' | 'batch' | 'concurrent';

export interface ScannerConfig {
  mode: ScanMode;
  formats: BarcodeFormat[];
  imageProcessing: {
    multiFrame: boolean;
    lowLight: boolean;
    damageRecovery: boolean;
    enhancement: boolean;
  };
  performance: {
    fps: number;
    cacheSize: number;
    workerThreads: number;
    skipSimilarFrames: boolean;
  };
  batch?: {
    duplicateCooldown: number; // milliseconds
    autoCompleteThreshold?: number; // number of scans
    targetRate?: number; // scans per second
  };
}

export interface ScanResult {
  barcode: string;
  format: BarcodeFormat | string;
  confidence: number;
  frame: number;
  timestamp: number;
  enhanced: boolean;
  source: 'native' | 'ocr' | 'enhanced';
}

export interface BatchSummary {
  totalScans: number;
  uniqueBarcodes: number;
  duplicates: number;
  errors: number;
  duration: number;
  scansPerSecond: number;
  startTime: number;
  endTime: number;
}

export interface TrackedBarcode {
  barcode: string;
  format: BarcodeFormat | string;
  firstSeen: number;
  lastSeen: number;
  frameCount: number;
  confidence: number;
  positions: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface DetectedBarcode extends ScanResult {
  bounds?: { x: number; y: number; width: number; height: number };
  priority: number; // 1-10, higher is more important
}

// ===== Configuration Presets =====

export const SCANNER_PRESETS: Record<'fast' | 'accurate' | 'balanced', Partial<ScannerConfig>> = {
  fast: {
    mode: 'single',
    formats: ['code39', 'code128', 'qr', 'ean13'],
    imageProcessing: {
      multiFrame: false,
      lowLight: false,
      damageRecovery: false,
      enhancement: false,
    },
    performance: {
      fps: 30,
      cacheSize: 50,
      workerThreads: 1,
      skipSimilarFrames: true,
    },
  },
  accurate: {
    mode: 'single',
    formats: ['code39', 'code128', 'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'codabar', 'itf14', 'datamatrix', 'pdf417', 'aztec'],
    imageProcessing: {
      multiFrame: true,
      lowLight: true,
      damageRecovery: true,
      enhancement: true,
    },
    performance: {
      fps: 15,
      cacheSize: 100,
      workerThreads: 2,
      skipSimilarFrames: false,
    },
  },
  balanced: {
    mode: 'single',
    formats: ['code39', 'code128', 'qr', 'ean13', 'ean8', 'upc_a', 'upc_e'],
    imageProcessing: {
      multiFrame: true,
      lowLight: true,
      damageRecovery: false,
      enhancement: true,
    },
    performance: {
      fps: 20,
      cacheSize: 100,
      workerThreads: 2,
      skipSimilarFrames: true,
    },
  },
};

// ===== Unified Scanner Class =====

export class UnifiedScanner {
  private config: ScannerConfig;
  private frameCount: number = 0;
  private scanHistory: ScanResult[] = [];
  private batchSession: {
    active: boolean;
    startTime: number;
    scans: ScanResult[];
  } | null = null;
  
  constructor(config?: Partial<ScannerConfig>) {
    this.config = this.mergeConfig(config);
  }

  /**
   * Merge user config with default balanced preset
   */
  private mergeConfig(userConfig?: Partial<ScannerConfig>): ScannerConfig {
    const baseConfig = SCANNER_PRESETS.balanced as ScannerConfig;
    if (!userConfig) return baseConfig;

    return {
      ...baseConfig,
      ...userConfig,
      imageProcessing: {
        ...baseConfig.imageProcessing,
        ...userConfig.imageProcessing,
      },
      performance: {
        ...baseConfig.performance,
        ...userConfig.performance,
      },
      batch: {
        duplicateCooldown: 500,
        ...userConfig.batch,
      },
    };
  }

  /**
   * Get current scanner configuration
   */
  getConfig(): ScannerConfig {
    return { ...this.config };
  }

  /**
   * Update scanner configuration
   */
  updateConfig(updates: Partial<ScannerConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...updates });
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: 'fast' | 'accurate' | 'balanced'): void {
    this.config = SCANNER_PRESETS[preset] as ScannerConfig;
  }

  /**
   * Get the recommended scanner component for current platform
   */
  static getRecommendedScanner(): 'expo' | 'vision' {
    return Platform.OS === 'ios' ? 'expo' : 'vision';
  }

  /**
   * Process a raw scan result from native scanner
   */
  processScan(barcode: string, format?: BarcodeFormat | string): ScanResult | null {
    // Clean barcode data
    const cleanedBarcode = this.cleanBarcode(barcode);
    if (!cleanedBarcode) return null;

    // Check for duplicates in batch mode
    if (this.config.mode === 'batch' && this.isDuplicateInBatch(cleanedBarcode)) {
      return null;
    }

    const result: ScanResult = {
      barcode: cleanedBarcode,
      format: format || 'unknown',
      confidence: 100,
      frame: this.frameCount++,
      timestamp: Date.now(),
      enhanced: false,
      source: 'native',
    };

    // Add to scan history
    this.scanHistory.push(result);
    if (this.scanHistory.length > this.config.performance.cacheSize) {
      this.scanHistory.shift();
    }

    // Add to batch session if active
    if (this.batchSession?.active) {
      this.batchSession.scans.push(result);
    }

    return result;
  }

  /**
   * Clean barcode data (remove start/stop characters, trim)
   */
  private cleanBarcode(barcode: string): string {
    let cleaned = String(barcode).trim();
    
    // Remove Code 39 start/stop characters (asterisks)
    // Preserve % prefix (used in sales receipt format)
    cleaned = cleaned.replace(/^\*+|\*+$/g, '');
    
    return cleaned;
  }

  /**
   * Check if barcode is a duplicate in current batch session
   */
  private isDuplicateInBatch(barcode: string): boolean {
    if (!this.batchSession?.active) return false;

    const cooldown = this.config.batch?.duplicateCooldown || 500;
    const now = Date.now();

    // Check if barcode exists in recent batch scans within cooldown period
    return this.batchSession.scans.some(
      (scan) => scan.barcode === barcode && (now - scan.timestamp) < cooldown
    );
  }

  /**
   * Start a batch scanning session
   */
  startBatch(): void {
    this.batchSession = {
      active: true,
      startTime: Date.now(),
      scans: [],
    };
  }

  /**
   * Complete batch scanning session and return summary
   */
  completeBatch(): BatchSummary {
    if (!this.batchSession) {
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

    const endTime = Date.now();
    const duration = endTime - this.batchSession.startTime;
    const scans = this.batchSession.scans;
    const uniqueBarcodes = new Set(scans.map((s) => s.barcode)).size;

    const summary: BatchSummary = {
      totalScans: scans.length,
      uniqueBarcodes,
      duplicates: scans.length - uniqueBarcodes,
      errors: 0,
      duration,
      scansPerSecond: duration > 0 ? (scans.length / (duration / 1000)) : 0,
      startTime: this.batchSession.startTime,
      endTime,
    };

    this.batchSession = null;
    return summary;
  }

  /**
   * Get current batch status
   */
  getBatchStatus(): { active: boolean; scanCount: number; duration: number } {
    if (!this.batchSession?.active) {
      return { active: false, scanCount: 0, duration: 0 };
    }

    return {
      active: true,
      scanCount: this.batchSession.scans.length,
      duration: Date.now() - this.batchSession.startTime,
    };
  }

  /**
   * Get scan history
   */
  getHistory(): ScanResult[] {
    return [...this.scanHistory];
  }

  /**
   * Clear scan history
   */
  clearHistory(): void {
    this.scanHistory = [];
  }

  /**
   * Reset scanner state
   */
  reset(): void {
    this.frameCount = 0;
    this.scanHistory = [];
    this.batchSession = null;
  }
}

// ===== Default Export =====

export default UnifiedScanner;
