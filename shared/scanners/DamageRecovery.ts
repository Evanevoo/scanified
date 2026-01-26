/**
 * DamageRecovery - Error correction for damaged barcodes
 * 
 * Attempts to reconstruct and validate barcodes that are:
 * - Partially readable
 * - Have damaged sections
 * - Missing characters
 * - Have format errors
 */

import { BarcodeFormat } from './UnifiedScanner';

export interface RecoveryResult {
  original: string;
  reconstructed: string;
  confidence: number;
  method: 'pattern' | 'checksum' | 'fuzzy' | 'database' | 'none';
  success: boolean;
}

export interface BarcodePattern {
  format: BarcodeFormat | string;
  pattern: RegExp;
  length?: number;
  checksumValidator?: (barcode: string) => boolean;
}

/**
 * Barcode damage recovery engine
 */
export class DamageRecovery {
  private knownBarcodes: Set<string> = new Set();
  
  // Common barcode patterns
  private patterns: BarcodePattern[] = [
    {
      format: 'ean13',
      pattern: /^\d{13}$/,
      length: 13,
      checksumValidator: (code) => this.validateEAN13(code),
    },
    {
      format: 'ean8',
      pattern: /^\d{8}$/,
      length: 8,
      checksumValidator: (code) => this.validateEAN8(code),
    },
    {
      format: 'upc_a',
      pattern: /^\d{12}$/,
      length: 12,
      checksumValidator: (code) => this.validateUPCA(code),
    },
    {
      format: 'code39',
      pattern: /^[0-9A-Z\-. $/+%]+$/,
    },
    {
      format: 'code128',
      pattern: /^[\x00-\x7F]+$/,
    },
    // Custom format: Sales receipt (8 hex + dash + 10 digits + optional letter)
    {
      format: 'custom-receipt',
      pattern: /^[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/,
      length: 20, // Without optional letter
    },
  ];

  /**
   * Attempt to recover a damaged barcode
   */
  attemptRecovery(barcode: string, format?: BarcodeFormat | string): RecoveryResult {
    const original = barcode;

    // Try different recovery methods in order of reliability

    // 1. Pattern matching and validation
    const patternResult = this.recoverWithPattern(barcode, format);
    if (patternResult.success) {
      return patternResult;
    }

    // 2. Checksum validation and correction
    if (format && this.hasChecksumValidator(format)) {
      const checksumResult = this.recoverWithChecksum(barcode, format);
      if (checksumResult.success) {
        return checksumResult;
      }
    }

    // 3. Fuzzy matching against known barcodes
    const fuzzyResult = this.recoverWithFuzzyMatch(barcode);
    if (fuzzyResult.success) {
      return fuzzyResult;
    }

    // 4. Database lookup for partial matches
    const databaseResult = this.recoverWithDatabase(barcode);
    if (databaseResult.success) {
      return databaseResult;
    }

    // Recovery failed
    return {
      original,
      reconstructed: barcode,
      confidence: 0,
      method: 'none',
      success: false,
    };
  }

  /**
   * Recover using pattern matching
   */
  private recoverWithPattern(barcode: string, format?: BarcodeFormat | string): RecoveryResult {
    const pattern = this.getPattern(format || this.detectFormat(barcode));
    if (!pattern) {
      return {
        original: barcode,
        reconstructed: barcode,
        confidence: 0,
        method: 'pattern',
        success: false,
      };
    }

    // Try to clean and normalize the barcode
    let cleaned = barcode.trim().toUpperCase();
    
    // Remove common OCR errors
    cleaned = this.fixCommonOCRErrors(cleaned);

    // Validate against pattern
    if (pattern.pattern.test(cleaned)) {
      // Validate checksum if available
      if (pattern.checksumValidator && pattern.checksumValidator(cleaned)) {
        return {
          original: barcode,
          reconstructed: cleaned,
          confidence: 95,
          method: 'pattern',
          success: true,
        };
      }

      // Pattern matches but no checksum validation
      return {
        original: barcode,
        reconstructed: cleaned,
        confidence: 75,
        method: 'pattern',
        success: true,
      };
    }

    return {
      original: barcode,
      reconstructed: cleaned,
      confidence: 0,
      method: 'pattern',
      success: false,
    };
  }

  /**
   * Fix common OCR errors
   */
  private fixCommonOCRErrors(barcode: string): string {
    let fixed = barcode;

    // Common character substitutions in OCR
    const substitutions: [RegExp, string][] = [
      [/O/g, '0'], // O -> 0
      [/I/g, '1'], // I -> 1
      [/l/g, '1'], // l -> 1
      [/Z/g, '2'], // Z -> 2
      [/S/g, '5'], // S -> 5
      [/G/g, '6'], // G -> 6
      [/B/g, '8'], // B -> 8
    ];

    // Only apply to numeric sections
    for (const [pattern, replacement] of substitutions) {
      fixed = fixed.replace(pattern, replacement);
    }

    return fixed;
  }

  /**
   * Recover using checksum validation
   */
  private recoverWithChecksum(barcode: string, format: BarcodeFormat | string): RecoveryResult {
    const pattern = this.getPattern(format);
    if (!pattern || !pattern.checksumValidator) {
      return {
        original: barcode,
        reconstructed: barcode,
        confidence: 0,
        method: 'checksum',
        success: false,
      };
    }

    // If barcode is missing the last digit (checksum), try to calculate it
    if (pattern.length && barcode.length === pattern.length - 1) {
      const reconstructed = this.calculateChecksum(barcode, format);
      
      if (reconstructed && pattern.checksumValidator(reconstructed)) {
        return {
          original: barcode,
          reconstructed,
          confidence: 85,
          method: 'checksum',
          success: true,
        };
      }
    }

    // Try fixing single-character errors
    if (pattern.length && barcode.length === pattern.length) {
      for (let i = 0; i < barcode.length; i++) {
        for (let digit = 0; digit <= 9; digit++) {
          const candidate = barcode.substring(0, i) + digit + barcode.substring(i + 1);
          
          if (pattern.checksumValidator(candidate)) {
            return {
              original: barcode,
              reconstructed: candidate,
              confidence: 70,
              method: 'checksum',
              success: true,
            };
          }
        }
      }
    }

    return {
      original: barcode,
      reconstructed: barcode,
      confidence: 0,
      method: 'checksum',
      success: false,
    };
  }

  /**
   * Recover using fuzzy matching against known barcodes
   */
  private recoverWithFuzzyMatch(barcode: string): RecoveryResult {
    if (this.knownBarcodes.size === 0) {
      return {
        original: barcode,
        reconstructed: barcode,
        confidence: 0,
        method: 'fuzzy',
        success: false,
      };
    }

    let bestMatch: string | null = null;
    let bestDistance = Infinity;
    const threshold = 3; // Maximum Levenshtein distance

    for (const known of this.knownBarcodes) {
      const distance = this.levenshteinDistance(barcode, known);
      
      if (distance < bestDistance && distance <= threshold) {
        bestMatch = known;
        bestDistance = distance;
      }
    }

    if (bestMatch) {
      const confidence = Math.round((1 - bestDistance / Math.max(barcode.length, bestMatch.length)) * 100);
      
      return {
        original: barcode,
        reconstructed: bestMatch,
        confidence,
        method: 'fuzzy',
        success: true,
      };
    }

    return {
      original: barcode,
      reconstructed: barcode,
      confidence: 0,
      method: 'fuzzy',
      success: false,
    };
  }

  /**
   * Recover using database lookup
   */
  private recoverWithDatabase(barcode: string): RecoveryResult {
    // This would query a database of known barcodes
    // For now, just check against known barcodes set
    
    if (this.knownBarcodes.has(barcode)) {
      return {
        original: barcode,
        reconstructed: barcode,
        confidence: 100,
        method: 'database',
        success: true,
      };
    }

    // Try partial matching
    const partial = barcode.substring(0, Math.floor(barcode.length * 0.7));
    
    for (const known of this.knownBarcodes) {
      if (known.startsWith(partial)) {
        return {
          original: barcode,
          reconstructed: known,
          confidence: 60,
          method: 'database',
          success: true,
        };
      }
    }

    return {
      original: barcode,
      reconstructed: barcode,
      confidence: 0,
      method: 'database',
      success: false,
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Add known barcodes for fuzzy matching
   */
  addKnownBarcodes(barcodes: string[]): void {
    barcodes.forEach(barcode => this.knownBarcodes.add(barcode));
  }

  /**
   * Clear known barcodes
   */
  clearKnownBarcodes(): void {
    this.knownBarcodes.clear();
  }

  /**
   * Get pattern for barcode format
   */
  private getPattern(format: BarcodeFormat | string): BarcodePattern | undefined {
    return this.patterns.find(p => p.format === format);
  }

  /**
   * Detect barcode format from string
   */
  private detectFormat(barcode: string): BarcodeFormat | string {
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(barcode)) {
        return pattern.format;
      }
    }
    return 'unknown';
  }

  /**
   * Check if format has checksum validator
   */
  private hasChecksumValidator(format: BarcodeFormat | string): boolean {
    const pattern = this.getPattern(format);
    return !!pattern?.checksumValidator;
  }

  /**
   * Calculate checksum for barcode
   */
  private calculateChecksum(barcode: string, format: BarcodeFormat | string): string | null {
    switch (format) {
      case 'ean13':
        return this.calculateEAN13Checksum(barcode);
      case 'ean8':
        return this.calculateEAN8Checksum(barcode);
      case 'upc_a':
        return this.calculateUPCAChecksum(barcode);
      default:
        return null;
    }
  }

  /**
   * Validate EAN-13 checksum
   */
  private validateEAN13(code: string): boolean {
    if (code.length !== 13 || !/^\d{13}$/.test(code)) return false;
    
    const checksum = this.calculateEAN13Checksum(code.substring(0, 12));
    return checksum === code;
  }

  /**
   * Calculate EAN-13 checksum
   */
  private calculateEAN13Checksum(code: string): string {
    if (code.length !== 12) return '';
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }

  /**
   * Validate EAN-8 checksum
   */
  private validateEAN8(code: string): boolean {
    if (code.length !== 8 || !/^\d{8}$/.test(code)) return false;
    
    const checksum = this.calculateEAN8Checksum(code.substring(0, 7));
    return checksum === code;
  }

  /**
   * Calculate EAN-8 checksum
   */
  private calculateEAN8Checksum(code: string): string {
    if (code.length !== 7) return '';
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(code[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }

  /**
   * Validate UPC-A checksum
   */
  private validateUPCA(code: string): boolean {
    if (code.length !== 12 || !/^\d{12}$/.test(code)) return false;
    
    const checksum = this.calculateUPCAChecksum(code.substring(0, 11));
    return checksum === code;
  }

  /**
   * Calculate UPC-A checksum
   */
  private calculateUPCAChecksum(code: string): string {
    if (code.length !== 11) return '';
    
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(code[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }

  /**
   * Validate barcode with pattern
   */
  validateWithPattern(barcode: string, pattern: RegExp): boolean {
    return pattern.test(barcode);
  }

  /**
   * Verify check digit for format
   */
  verifyCheckDigit(barcode: string, format: BarcodeFormat | string): boolean {
    const pattern = this.getPattern(format);
    if (!pattern || !pattern.checksumValidator) {
      return false;
    }
    
    return pattern.checksumValidator(barcode);
  }
}

export default DamageRecovery;
