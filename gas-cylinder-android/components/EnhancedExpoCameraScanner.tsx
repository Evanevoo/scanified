/**
 * EnhancedExpoCameraScanner - Enhanced Android scanner with advanced features
 * 
 * Uses expo-camera for Expo Go compatibility, falls back from Vision Camera
 * Extends ExpoCameraScanner with:
 * - Multi-barcode detection
 * - Batch scanning support
 * - Region of Interest (ROI) optimization
 * - Enhanced feedback
 * - ScanEZ branding
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Pressable, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import logger from '../utils/logger';
import { UnifiedScanner, ScanResult, ScanMode, DetectedBarcode } from '../../shared/scanners/UnifiedScanner';

// Google ML Kit – optional; requires native build (not available in Expo Go)
let BarcodeScanning: { scan: (imageURL: string) => Promise<Array<{ value: string; format?: string }>> } | null = null;
try {
  BarcodeScanning = require('@react-native-ml-kit/barcode-scanning').default;
  logger.log('✅ ML Kit loaded for Android scanning');
} catch {
  logger.log('⚠️ ML Kit not available - using Expo Camera only');
}

const { width, height } = Dimensions.get('window');

// Calculate region of interest for the scan frame
const SCAN_FRAME_WIDTH = 320;
const SCAN_FRAME_HEIGHT = 150;
const SCAN_FRAME_TOP = 100;

interface EnhancedExpoCameraScannerProps {
  onBarcodeScanned: (data: string, result?: ScanResult) => void;
  onMultipleBarcodesDetected?: (barcodes: DetectedBarcode[]) => void;
  enabled?: boolean;
  onClose?: () => void;
  target?: 'customer' | 'order';
  scanMode?: ScanMode;
  scanner?: UnifiedScanner;
  batchMode?: boolean;
}

const EnhancedExpoCameraScanner: React.FC<EnhancedExpoCameraScannerProps> = ({
  onBarcodeScanned,
  onMultipleBarcodesDetected,
  enabled = true,
  onClose,
  target = 'customer',
  scanMode = 'single',
  scanner,
  batchMode = false,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [autofocusOn, setAutofocusOn] = useState(true);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const frameCountRef = useRef(0);
  const mlKitProcessingRef = useRef(false);

  // Unified scanner instance (create if not provided)
  const scannerInstance = useRef<UnifiedScanner>(
    scanner || new UnifiedScanner({ mode: scanMode })
  );

  // Use ML Kit on Android when available (more reliable than Expo Camera's onBarcodeScanned)
  const useMLKitActive = !!BarcodeScanning;

  // Periodic refocus disabled for Android - causes autofocus prop errors
  // Android Expo Camera handles autofocus automatically
  // useEffect(() => {
  //   if (enabled && cameraReady && !scanned) {
  //     const refocusInterval = setInterval(() => {
  //       setFocusTrigger(prev => prev + 1);
  //       logger.log('📷 ScanEZ: Periodic refocus triggered');
  //     }, 2000);
  //
  //     return () => clearInterval(refocusInterval);
  //   }
  // }, [enabled, cameraReady, scanned]);

  // Request permission if not granted
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      logger.log('📷 ScanEZ: Camera permission denied, cannot ask again');
    } else if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Reset scanned state when enabled changes
  useEffect(() => {
    if (enabled) {
      setScanned(false);
    }
  }, [enabled]);

  // Set camera ready immediately when permission is granted
  useEffect(() => {
    if (permission?.granted) {
      setCameraReady(true);
      logger.log('📷 ScanEZ: Camera ready - Scanner ACTIVE');
    } else {
      setCameraReady(false);
      logger.log('📷 ScanEZ: Waiting for camera permission');
    }
  }, [permission?.granted]);

  // Log scanner state changes
  useEffect(() => {
    logger.log('📷 ScanEZ: Scanner state -', {
      enabled,
      cameraReady,
      scanned,
      batchMode,
      useMLKit: useMLKitActive,
      canScan: enabled && cameraReady && (!scanned || batchMode)
    });
  }, [enabled, cameraReady, scanned, batchMode]);

  // ML Kit: periodically capture and scan (fallback for Android when Expo Camera onBarcodeScanned doesn't fire)
  useEffect(() => {
    if (!useMLKitActive || !enabled || !cameraReady || (scanned && !batchMode)) {
      return;
    }

    logger.log('📷 ScanEZ: Starting ML Kit scanning loop');

    const interval = setInterval(async () => {
      if (mlKitProcessingRef.current || !cameraRef.current || !enabled || (scanned && !batchMode)) {
        return;
      }

      mlKitProcessingRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ 
          quality: 0.5, 
          skipProcessing: true 
        });
        
        if (!photo?.uri || !enabled || (scanned && !batchMode)) {
          mlKitProcessingRef.current = false;
          return;
        }

        const barcodes = await BarcodeScanning.scan(photo.uri);
        
        if (barcodes && barcodes.length > 0) {
          logger.log('📷 ScanEZ: ⚡ ML Kit detected', barcodes.length, 'barcode(s)');
          
          if (scanMode === 'concurrent' && barcodes.length > 1) {
            // Multi-barcode detection
            const detectedBarcodes: DetectedBarcode[] = barcodes.map((barcode, index) => ({
              barcode: barcode.value,
              format: barcode.format || 'unknown',
              confidence: 100,
              frame: frameCountRef.current,
              timestamp: Date.now(),
              enhanced: true,
              source: 'native' as const,
              priority: index === 0 ? 10 : 5,
            }));

            if (onMultipleBarcodesDetected) {
              onMultipleBarcodesDetected(detectedBarcodes);
            }

            handleBarcodeScanned(barcodes[0].value, barcodes[0].format);
          } else {
            handleBarcodeScanned(barcodes[0].value, barcodes[0].format);
          }
        }
      } catch (e) {
        logger.error('📷 ScanEZ: ML Kit scan error:', e);
      } finally {
        mlKitProcessingRef.current = false;
      }
    }, 480);

    return () => clearInterval(interval);
  }, [useMLKitActive, enabled, cameraReady, scanned, scanMode, batchMode]);

  const handleBarcodeScanned = (event: any) => {
    logger.log('📷 ScanEZ: ⚡ BARCODE DETECTED! Raw event:', event);
    
    const data = typeof event === 'string' ? event : (event?.data ?? event?.raw ?? '');
    let type = typeof event === 'object' ? (event?.type || event?.format) : undefined;

    // Normalize format names - Expo Camera may report formats differently
    if (type) {
      type = type.toLowerCase()
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
      
      type = formatMap[type] || type;
    }

    logger.log('📷 ScanEZ: handleBarcodeScanned called', { 
      enabled, 
      scanned, 
      dataLength: data?.length, 
      originalType: typeof event === 'object' ? event?.type : undefined,
      normalizedType: type,
      batchMode,
      rawData: data?.substring(0, 20) // Log first 20 chars for debugging
    });

    if (!enabled || (!batchMode && scanned) || !data || typeof data !== 'string') {
      logger.log('📷 ScanEZ: Scan rejected - enabled:', enabled, 'scanned:', scanned, 'hasData:', !!data);
      return;
    }

    // Clean the data
    let cleanedData = String(data).trim();
    cleanedData = cleanedData.replace(/^\*+|\*+$/g, '');
    
    if (!cleanedData) {
      logger.log('📷 ScanEZ: Empty data after cleaning');
      return;
    }

    // Auto-detect CODE128 for 9-digit numeric barcodes (cylinder barcodes)
    if (cleanedData.length === 9 && /^\d{9}$/.test(cleanedData)) {
      logger.log('📷 ScanEZ: ✅ 9-digit cylinder barcode detected!', cleanedData);
      // Force CODE128 format for 9-digit numeric barcodes if not detected
      if (!type || type === 'unknown') {
        type = 'code128';
        logger.log('📷 ScanEZ: Auto-assigning CODE128 format to 9-digit barcode');
      }
    }

    // Process through unified scanner
    const scanResult = scannerInstance.current.processScan(cleanedData, type);
    
    if (!scanResult) {
      // Duplicate detected in batch mode
      logger.log('📷 ScanEZ: Duplicate scan ignored in batch mode');
      return;
    }

    // Prevent rapid duplicate scans
    const now = Date.now();
    const cooldown = batchMode ? 200 : 500;
    
    if (cleanedData === lastScannedRef.current && (now - lastScanTimeRef.current) < cooldown) {
      logger.log('📷 ScanEZ: Ignoring duplicate scan (cooldown)');
      return;
    }

    lastScannedRef.current = cleanedData;
    lastScanTimeRef.current = now;
    
    if (!batchMode) {
      setScanned(true);
    }

    frameCountRef.current++;

    logger.log('📷 ScanEZ: ✅ Barcode accepted:', cleanedData, 'Type:', type || 'unknown', 'Format:', scanResult.format);

    // Call the callback with scan result
    onBarcodeScanned(cleanedData, scanResult);

    // Reset scanned state (faster in batch mode)
    if (!batchMode) {
      setTimeout(() => {
        setScanned(false);
        lastScannedRef.current = '';
      }, 800);
    } else {
      // In batch mode, clear after short delay to allow rapid scanning
      setTimeout(() => {
        lastScannedRef.current = '';
      }, cooldown);
    }
  };

  // Show permission request UI
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorText}>
          Please enable camera access in Settings
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.closeCameraButton} onPress={onClose}>
            <Text style={styles.closeCameraText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!cameraReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initializing ScanEZ camera...</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeCameraButton} onPress={onClose}>
            <Text style={styles.closeCameraText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullscreenWrapper}>
      <Pressable
        style={styles.fullscreenCamera}
        onPress={() => {
          // Tap to focus - Android Expo Camera handles this automatically
          // Just log for debugging, don't toggle autofocus as it causes errors
          logger.log('📷 ScanEZ: Tap to focus');
        }}
      >
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          zoom={cameraZoom}
          barcodeScannerSettings={{
            barcodeTypes: [
              'code128',
              'code39',
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code93',
              'codabar',
              'itf14',
              'qr',
              'aztec',
              'datamatrix',
              'pdf417',
            ],
          }}
          onBarcodeScanned={enabled && !scanned ? handleBarcodeScanned : undefined}
          onCameraReady={() => {
            setCameraReady(true);
            logger.log('📷 ScanEZ: Camera fully ready and SCANNING ENABLED');
          }}
        />
      </Pressable>
      
      {/* Top Status Bar - ALWAYS VISIBLE */}
      <View style={styles.topStatusBar} pointerEvents="none">
        <Text style={styles.topStatusText}>
          {enabled && cameraReady ? (useMLKitActive ? '🟢 SCANEZ READY (ML Kit)' : '🟢 SCANEZ READY (Expo Camera)') : '🔴 SCANNER NOT READY'}
        </Text>
      </View>

      {/* Camera Overlay */}
      <View style={styles.cameraOverlay} pointerEvents="none">
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
        {batchMode && (
          <Text style={styles.batchModeText}>Batch Mode: Rapid Scanning</Text>
        )}
        
        {/* Debug Indicator - Shows scanner is active */}
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>
            {enabled && cameraReady ? '🟢 SCANNING' : '🔴 NOT READY'}
          </Text>
          <Text style={styles.debugSubtext}>
            Scanned: {scanned ? 'Yes' : 'No'} | Ready: {cameraReady ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity
          style={styles.closeCameraButton}
          onPress={() => {
            onClose();
            setScanned(false);
          }}
        >
          <Text style={styles.closeCameraText}>✕ Close</Text>
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

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            setCameraZoom(Math.max(0, cameraZoom - 0.1));
          }}
        >
          <Ionicons name="remove-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.zoomText}>{Math.round((1 + cameraZoom) * 100)}%</Text>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            setCameraZoom(Math.min(2, cameraZoom + 0.1));
          }}
        >
          <Ionicons name="add-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topStatusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2000,
  },
  topStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fullscreenWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCamera: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 180,
  },
  scanFrameContainer: {
    width: 320,
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  borderLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  borderRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
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
    borderBottomLeftRadius: 8,
    minWidth: 40,
    flex: 1,
  },
  borderBottomRight: {
    height: 2,
    backgroundColor: '#fff',
    borderBottomRightRadius: 8,
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
  batchModeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  debugText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugSubtext: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  closeCameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  flashButton: {
    position: 'absolute',
    top: 50,
    right: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
  },
  zoomButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
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
  settingsButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginHorizontal: 20,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EnhancedExpoCameraScanner;
