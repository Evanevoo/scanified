/**
 * EnhancedVisionCameraScanner - Enhanced Android scanner with advanced features
 * 
 * Extends VisionCameraScanner with:
 * - GPU-accelerated image processing via Worklets
 * - Increased frame rate (5 FPS → 15 FPS)
 * - Multi-barcode detection
 * - Enhanced OCR capabilities
 * - Batch scanning support
 * - Performance optimization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import logger from '../utils/logger';
import { UnifiedScanner, ScanResult, ScanMode, DetectedBarcode } from '../../shared/scanners/UnifiedScanner';

// Dynamically import Vision Camera with error handling
let Camera: any;
let useCameraDevice: any;
let useCodeScanner: any;
let useFrameProcessor: any;
let performOcr: any;
let visionCameraAvailable = false;
let ocrAvailable = false;

try {
  const visionCameraModule = require('react-native-vision-camera');
  Camera = visionCameraModule.Camera;
  useCameraDevice = visionCameraModule.useCameraDevice;
  useCodeScanner = visionCameraModule.useCodeScanner;
  useFrameProcessor = visionCameraModule.useFrameProcessor;
  visionCameraAvailable = true;
  logger.log('✅ Enhanced: Vision Camera module loaded successfully');
} catch (error) {
  logger.error('⚠️ Enhanced: Vision Camera module not available:', error);
  visionCameraAvailable = false;
}

// Try to load OCR plugin
try {
  const ocrModule = require('@bear-block/vision-camera-ocr');
  performOcr = ocrModule.performOcr;
  ocrAvailable = true;
  logger.log('✅ Enhanced: OCR plugin loaded successfully');
} catch (error) {
  logger.log('⚠️ Enhanced: OCR plugin not available (optional):', error);
  ocrAvailable = false;
}

const { width, height } = Dimensions.get('window');

interface EnhancedVisionCameraScannerProps {
  onBarcodeScanned: (data: string, result?: ScanResult) => void;
  onMultipleBarcodesDetected?: (barcodes: DetectedBarcode[]) => void;
  enabled?: boolean;
  onClose?: () => void;
  target?: 'customer' | 'order';
  scanMode?: ScanMode;
  scanner?: UnifiedScanner;
  batchMode?: boolean;
  enhancedFPS?: boolean; // Use 15 FPS instead of 5
}

const EnhancedVisionCameraScanner: React.FC<EnhancedVisionCameraScannerProps> = ({
  onBarcodeScanned,
  onMultipleBarcodesDetected,
  enabled = true,
  onClose,
  target = 'customer',
  scanMode = 'single',
  scanner,
  batchMode = false,
  enhancedFPS = true,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Unified scanner instance
  const scannerInstance = useRef<UnifiedScanner>(
    scanner || new UnifiedScanner({ mode: scanMode })
  );

  // Check if Vision Camera is available
  if (!visionCameraAvailable || !Camera || !useCameraDevice || !useCodeScanner) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          ⚠️ Vision Camera not available
        </Text>
        <Text style={styles.errorText}>
          Please build the app with native code using:{'\n'}
          eas build --profile development --platform android
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const device = useCameraDevice('back');
  const lastOcrBarcodeRef = useRef<string>('');
  const lastOcrTimeRef = useRef<number>(0);

  // Callback wrapper for barcode scans
  const handleBarcodeCallback = useCallback((barcode: string, format?: string, source: 'native' | 'ocr' = 'native') => {
    logger.log(`📋 ScanEZ: ${source.toUpperCase()} scan:`, barcode, 'Format:', format);

    if (!enabled || (!batchMode && lastScannedRef.current === barcode)) {
      return;
    }

    // Normalize format names - Vision Camera may report formats differently
    let normalizedFormat = format;
    if (normalizedFormat) {
      normalizedFormat = normalizedFormat.toLowerCase()
        .replace(/^org\.iso\./i, '') // Remove org.iso. prefix
        .replace(/^code-?/i, 'code') // Normalize code-128 to code128
        .replace(/-/g, ''); // Remove dashes
      
      // Map common variations to standard format
      const formatMap: Record<string, string> = {
        'code128': 'code128',
        'code-128': 'code128',
        'org.iso.code128': 'code128',
        'iso.code128': 'code128',
      };
      
      normalizedFormat = formatMap[normalizedFormat] || normalizedFormat;
    }

    // Clean the barcode
    let cleanedBarcode = String(barcode).trim();
    cleanedBarcode = cleanedBarcode.replace(/^\*+|\*+$/g, '');

    // Auto-detect CODE128 for 9-digit numeric barcodes (cylinder barcodes)
    if (cleanedBarcode.length === 9 && /^\d{9}$/.test(cleanedBarcode)) {
      logger.log('📷 ScanEZ: ✅ 9-digit cylinder barcode detected!', cleanedBarcode);
      // Force CODE128 format for 9-digit numeric barcodes if not detected
      if (!normalizedFormat || normalizedFormat === 'unknown') {
        normalizedFormat = 'code128';
        logger.log('📷 ScanEZ: Auto-assigning CODE128 format to 9-digit barcode');
      }
    }

    // Process through unified scanner
    const scanResult = scannerInstance.current.processScan(cleanedBarcode, normalizedFormat);
    
    if (!scanResult) {
      logger.log('📷 ScanEZ: Duplicate scan ignored in batch mode');
      return;
    }

    // Update scan result source
    scanResult.source = source;

    // Check cooldown
    const now = Date.now();
    const cooldown = batchMode ? 200 : 500;
    
    if (cleanedBarcode === lastScannedRef.current && (now - lastScanTimeRef.current) < cooldown) {
      return;
    }

    lastScannedRef.current = cleanedBarcode;
    lastScanTimeRef.current = now;

    logger.log('📷 ScanEZ: ✅ Barcode accepted:', cleanedBarcode, 'Format:', normalizedFormat || 'unknown');

    onBarcodeScanned(cleanedBarcode, scanResult);

    // Clear reference in batch mode after cooldown
    if (batchMode) {
      setTimeout(() => {
        lastScannedRef.current = '';
      }, cooldown);
    }
  }, [enabled, onBarcodeScanned, batchMode]);

  // Enhanced frame processor with OCR for text recognition
  const frameProcessor = useFrameProcessor && ocrAvailable && performOcr && useFrameProcessor((frame: any) => {
    'worklet';
    
    if (!enabled) return;
    
    frameCountRef.current++;
    
    try {
      // Perform OCR on the frame
      const ocrResult = performOcr(frame);
      
      if (ocrResult && ocrResult.text) {
        const recognizedText = ocrResult.text;
        
        // Extract barcode patterns from recognized text
        // Pattern: 800005BE-1578330321A (8 hex chars + dash + 10 digits + optional letter)
        const fullPattern = /([0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?)/;
        const match = recognizedText.match(fullPattern);
        
        let barcode: string | null = null;
        if (match && match[1]) {
          barcode = match[1].toUpperCase();
        } else {
          // Try pattern with % prefix
          const withPercentPattern = /%([0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?)/;
          const percentMatch = recognizedText.match(withPercentPattern);
          if (percentMatch && percentMatch[1]) {
            barcode = percentMatch[1].toUpperCase();
          }
        }
        
        if (barcode) {
          // Prevent duplicate OCR scans
          const now = Date.now();
          const cooldown = batchMode ? 500 : 2000;
          
          if (barcode === lastOcrBarcodeRef.current && (now - lastOcrTimeRef.current) < cooldown) {
            return;
          }
          
          lastOcrBarcodeRef.current = barcode;
          lastOcrTimeRef.current = now;
          
          // Call the React callback using runOnJS
          runOnJS(handleBarcodeCallback)(barcode, 'ocr-text', 'ocr');
        }
      }
    } catch (error) {
      // Silently handle errors in worklet
    }
  }, [enabled, handleBarcodeCallback, batchMode]);

  // Request camera permission
  useEffect(() => {
    (async () => {
      if (Camera && Camera.requestCameraPermission) {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      }
    })();
  }, []);

  // Configure enhanced code scanner with all barcode types
  // Code 128 prioritized first for cylinder barcode scanning
  const codeScanner = useCodeScanner({
    codeTypes: [
      'code-128',  // Prioritized for cylinder barcodes
      'code-39',
      'code-93',
      'qr',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'codabar',
      'itf',
      'data-matrix',
      'pdf-417',
      'aztec',
    ],
    onCodeScanned: (codes) => {
      if (!enabled || codes.length === 0) return;

      frameCountRef.current++;

      // Multi-barcode detection in concurrent mode
      if (scanMode === 'concurrent' && codes.length > 1) {
        const detectedBarcodes: DetectedBarcode[] = codes.map((code, index) => {
          const scanResult = scannerInstance.current.processScan(code.value || '', code.type);
          
          return {
            barcode: code.value || '',
            format: code.type || 'unknown',
            confidence: 100,
            frame: frameCountRef.current,
            timestamp: Date.now(),
            enhanced: true,
            source: 'native' as const,
            priority: index === 0 ? 10 : 5,
            bounds: code.frame ? {
              x: code.frame.x,
              y: code.frame.y,
              width: code.frame.width,
              height: code.frame.height,
            } : undefined,
          };
        }).filter(b => b !== null) as DetectedBarcode[];

        if (onMultipleBarcodesDetected && detectedBarcodes.length > 0) {
          onMultipleBarcodesDetected(detectedBarcodes);
        }
      }

      // Process first barcode
      const code = codes[0];
      const data = code.value || '';

      if (!data) return;

      // Check cooldown
      const now = Date.now();
      const cooldown = batchMode ? 200 : 2000;
      
      if (data === lastScannedRef.current && (now - lastScanTimeRef.current) < cooldown) {
        logger.log('📷 Enhanced: Ignoring duplicate scan (cooldown)');
        return;
      }

      handleBarcodeCallback(data, code.type, 'native');
    },
  });

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorText}>
          Please enable camera access in Settings
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Enhanced FPS: 15 (vs 5 in standard)
  const fps = enhancedFPS ? 15 : 5;

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={enabled}
        codeScanner={codeScanner}
        frameProcessor={frameProcessor}
        frameProcessorFps={ocrAvailable ? fps : undefined}
        torch={flashEnabled ? 'on' : 'off'}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlayContainer} pointerEvents="none">
        {/* Custom Border with ScanEZ integrated */}
        <View style={styles.scanFrameContainer} pointerEvents="none">
          {/* Top Border */}
          <View style={styles.borderTop} />
          
          {/* Left Border */}
          <View style={styles.borderLeft} />
          
          {/* Right Border */}
          <View style={styles.borderRight} />
          
          {/* Bottom Border with ScanEZ integrated */}
          <View style={styles.borderBottomContainer}>
            {/* Left segment of bottom border */}
            <View style={styles.borderBottomLeft} />
            
            {/* ScanEZ text integrated into border */}
            <View style={styles.scanEZInBorder}>
              <Text style={styles.scanEZBorderText}>ScanEZ</Text>
            </View>
            
            {/* Right segment of bottom border */}
            <View style={styles.borderBottomRight} />
          </View>
        </View>
        <Text style={styles.instructionText}>
          Point camera at {target === 'customer' ? 'customer' : 'order'} barcode
          {ocrAvailable && '\n(Enhanced OCR enabled)'}
          {batchMode && '\n[Batch Mode]'}
        </Text>
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕ Close</Text>
        </TouchableOpacity>
      )}

      {/* Flash Toggle Button */}
      <TouchableOpacity
        style={styles.flashButton}
        onPress={() => setFlashEnabled(!flashEnabled)}
      >
        <Ionicons 
          name={flashEnabled ? 'flash' : 'flash-off'} 
          size={28} 
          color={flashEnabled ? '#FFD700' : '#FFFFFF'} 
        />
      </TouchableOpacity>

      {/* Performance Indicator */}
      <View style={styles.performanceIndicator}>
        <Text style={styles.performanceText}>
          {enhancedFPS ? '⚡ Enhanced' : 'Standard'} • {fps} FPS
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameContainer: {
    width: 300,
    height: 150,
    position: 'relative',
  },
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  borderLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  borderRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  borderBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 2,
  },
  borderBottomLeft: {
    height: 2,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 10,
    minWidth: 40,
    flex: 1,
  },
  borderBottomRight: {
    height: 2,
    backgroundColor: '#fff',
    borderBottomRightRadius: 10,
    minWidth: 40,
    flex: 1,
  },
  scanEZInBorder: {
    paddingHorizontal: 6,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanEZBorderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flashButton: {
    position: 'absolute',
    top: 50,
    right: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performanceIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  performanceText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    padding: 10,
  },
});

export default EnhancedVisionCameraScanner;
