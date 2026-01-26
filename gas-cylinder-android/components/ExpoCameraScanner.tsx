import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Pressable, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import logger from '../utils/logger';
import { soundService } from '../services/soundService';

// Google ML Kit – optional; requires native build (not available in Expo Go)
let BarcodeScanning: { scan: (imageURL: string) => Promise<Array<{ value: string }>> } | null = null;
try {
  BarcodeScanning = require('@react-native-ml-kit/barcode-scanning').default;
} catch {
  // Expo Go or not linked
}

const { width, height } = Dimensions.get('window');

// Calculate region of interest to match visual scan frame
const SCAN_FRAME_WIDTH = 320;
const SCAN_FRAME_HEIGHT = 150;
const SCAN_FRAME_TOP = 150; // Match paddingTop in cameraOverlay
const REGION_OF_INTEREST = {
  x: (width - SCAN_FRAME_WIDTH) / 2 / width, // Center horizontally
  y: SCAN_FRAME_TOP / height, // Match visual frame position
  width: SCAN_FRAME_WIDTH / width,
  height: SCAN_FRAME_HEIGHT / height,
};

const MLKIT_INTERVAL_MS = 480;

interface ExpoCameraScannerProps {
  onBarcodeScanned: (data: string) => void;
  enabled?: boolean;
  onClose?: () => void;
  target?: 'customer' | 'order';
  useMLKit?: boolean; // When true and ML Kit is available, uses Google ML Kit; otherwise expo-camera (VisionKit on iOS)
}

const ExpoCameraScanner: React.FC<ExpoCameraScannerProps> = ({
  onBarcodeScanned,
  enabled = true,
  onClose,
  target = 'customer',
  // Default false: ML Kit uses takePictureAsync in a loop every ~480ms, which triggers the
  // system camera shutter/capture sound repeatedly and often fails to detect barcodes.
  // expo-camera's built-in onBarcodeScanned (VisionKit on iOS) does live scanning without
  // taking photos, so no shutter sound and more reliable. Pass useMLKit={true} only if
  // you need ML Kit's formats and can accept the capture sound loop.
  useMLKit = false,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [autofocusOn, setAutofocusOn] = useState(true); // Toggle to trigger refocus on tap (no remount)
  const [cameraZoom, setCameraZoom] = useState(0); // Zoom level (0 = no zoom, max depends on device)
  const [focusTrigger, setFocusTrigger] = useState(0); // Used for periodic refocus in production builds
  const mlKitProcessingRef = useRef(false);
  const useMLKitActive = useMLKit && !!BarcodeScanning;

  // Periodic refocus disabled for Android - autofocus prop causes errors on Android Expo Camera
  // Android handles autofocus automatically
  // useEffect(() => {
  //   if (enabled && cameraReady && !scanned) {
  //     // Trigger refocus every 2 seconds to help with production builds
  //     const refocusInterval = setInterval(() => {
  //       setFocusTrigger(prev => prev + 1);
  //       logger.log('📷 Periodic refocus triggered');
  //     }, 2000);

  //     return () => clearInterval(refocusInterval);
  //   }
  // }, [enabled, cameraReady, scanned]);

  // Request permission if not granted
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      logger.log('📷 Camera permission denied, cannot ask again');
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

  // ML Kit: periodically capture and run BarcodeScanning.scan (image-based; no live callback)
  useEffect(() => {
    if (!useMLKitActive || !enabled || !cameraReady || scanned) return;
    const t = setInterval(async () => {
      if (mlKitProcessingRef.current || !cameraRef.current || !enabled || scanned) return;
      mlKitProcessingRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
        if (!photo?.uri || !enabled || scanned) return;
        const barcodes = await BarcodeScanning!.scan(photo.uri);
        if (barcodes?.length > 0 && barcodes[0]?.value) {
          handleBarcodeScanned(barcodes[0].value);
        }
      } catch (e) {
        // Native module not linked (Expo Go) or scan error – ignore
      } finally {
        mlKitProcessingRef.current = false;
      }
    }, MLKIT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [useMLKitActive, enabled, cameraReady, scanned]);

  // Set camera ready immediately when permission is granted (no delay for faster scanning)
  useEffect(() => {
    logger.log('📷 ExpoCameraScanner: Permission state changed', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      cameraReady,
      enabled,
      scanned,
      useMLKitActive
    });
    
    if (permission?.granted) {
      setCameraReady(true);
      logger.log('📷 Camera ready');
    } else {
      setCameraReady(false);
    }
  }, [permission?.granted]);

  // Log scanner state changes
  useEffect(() => {
    logger.log('📷 ExpoCameraScanner: Scanner state -', {
      enabled,
      cameraReady,
      scanned,
      useMLKitActive,
      callbackWillFire: !useMLKitActive && enabled && !scanned
    });
  }, [enabled, cameraReady, scanned, useMLKitActive]);

  const handleBarcodeScanned = async (event: { data?: string; raw?: string; type?: string; bounds?: any } | string) => {
    logger.log('📷 ⚡ BARCODE DETECTED! Raw event:', event);
    console.log('📷 [ExpoCameraScanner] BARCODE DETECTED!', event);
    
    const data = typeof event === 'string' ? event : (event?.data ?? event?.raw ?? '');
    const type = typeof event === 'object' ? event?.type : undefined;
    const bounds = typeof event === 'object' ? event?.bounds : undefined;

    logger.log('📷 ExpoCameraScanner: handleBarcodeScanned called', { enabled, scanned, dataLength: data?.length, type, bounds });
    console.log('📷 [ExpoCameraScanner] handleBarcodeScanned called', { enabled, scanned, dataLength: data?.length, type, bounds });

    if (!enabled || scanned || !data || typeof data !== 'string') {
      logger.log('📷 ExpoCameraScanner: Skipping scan', { enabled, scanned, hasData: !!data });
      console.log('📷 [ExpoCameraScanner] Skipping scan', { enabled, scanned, hasData: !!data });
      return;
    }

    // Filter by bounds to ensure barcode is within visual scan frame
    if (bounds && !isBarcodeInScanArea(bounds)) {
      logger.log('📷 Barcode outside scan area, ignoring');
      console.log('📷 [ExpoCameraScanner] Barcode outside scan area, ignoring');
      return;
    }

    // Clean the data - remove leading/trailing asterisks only (keep % for customer format)
    let cleanedData = String(data).trim();
    
    // Remove only leading/trailing asterisks (Code 39 start/stop characters).
    // Do NOT strip leading % — it is part of the sales receipt format (e.g. %80000809-1657573726A).
    cleanedData = cleanedData.replace(/^\*+|\*+$/g, '');
    
    if (!cleanedData) {
      logger.log('📷 ExpoCameraScanner: Empty data after cleaning');
      return;
    }

    // Prevent duplicate scans - use minimal delay for faster iOS scanning
    const now = Date.now();
    if (cleanedData === lastScannedRef.current && (now - lastScanTimeRef.current) < 500) {
      logger.log('📷 Expo Camera: Ignoring duplicate scan');
      return;
    }

    lastScannedRef.current = cleanedData;
    lastScanTimeRef.current = now;
    setScanned(true);

    logger.log('📷 Expo Camera barcode detected:', cleanedData, 'Type:', type || target);

    // Play scan sound - with extensive logging
    console.log('🔊 [ExpoCameraScanner] Attempting to play scan sound...');
    try {
      const soundResult = await soundService.playSound('scan');
      console.log('🔊 [ExpoCameraScanner] playSound returned:', soundResult);
    } catch (err: any) {
      console.error('🔊 [ExpoCameraScanner] Error playing scan sound:', err);
      logger.warn('⚠️ Could not play scan sound:', err);
    }

    // Call the callback
    onBarcodeScanned(cleanedData);

    // Reset scanned state after minimal delay for faster continuous scanning on iOS
    setTimeout(() => {
      setScanned(false);
      lastScannedRef.current = ''; // Clear to allow same barcode again
    }, 800);
  };

  // Check if barcode is within the visual scan frame
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) {
      logger.log('📍 No bounds provided, allowing scan');
      return true; // Allow scan if no bounds available
    }
    
    // Get screen dimensions
    const screenWidth = width;
    const screenHeight = height;
    
    // Match the visual scan frame dimensions
    const scanFrameWidth = SCAN_FRAME_WIDTH;
    const scanFrameHeight = SCAN_FRAME_HEIGHT;
    const scanFrameTop = SCAN_FRAME_TOP;
    
    // Calculate scan frame position (centered horizontally)
    const scanAreaLeft = (screenWidth - scanFrameWidth) / 2;
    const scanAreaTop = scanFrameTop;
    const scanAreaRight = scanAreaLeft + scanFrameWidth;
    const scanAreaBottom = scanAreaTop + scanFrameHeight;
    
    // Bounds are typically in normalized coordinates (0-1) or pixels
    const barcodeX = bounds.origin?.x || bounds.x || 0;
    const barcodeY = bounds.origin?.y || bounds.y || 0;
    const barcodeWidth = bounds.size?.width || bounds.width || 0;
    const barcodeHeight = bounds.size?.height || bounds.height || 0;
    
    // Calculate barcode center
    const barcodeCenterX = barcodeX + (barcodeWidth / 2);
    const barcodeCenterY = barcodeY + (barcodeHeight / 2);
    
    // Convert to screen coordinates if normalized (0-1)
    let screenBarcodeX: number;
    let screenBarcodeY: number;
    
    if (barcodeCenterX <= 1 && barcodeCenterY <= 1) {
      // Normalized coordinates - convert to pixels
      screenBarcodeX = barcodeCenterX * screenWidth;
      screenBarcodeY = barcodeCenterY * screenHeight;
    } else {
      // Already in pixel coordinates
      screenBarcodeX = barcodeCenterX;
      screenBarcodeY = barcodeCenterY;
    }
    
    // Add tolerance (10% of frame size) for easier scanning
    const toleranceX = scanFrameWidth * 0.1;
    const toleranceY = scanFrameHeight * 0.1;
    
    const isInArea = (
      screenBarcodeX >= (scanAreaLeft - toleranceX) &&
      screenBarcodeX <= (scanAreaRight + toleranceX) &&
      screenBarcodeY >= (scanAreaTop - toleranceY) &&
      screenBarcodeY <= (scanAreaBottom + toleranceY)
    );
    
    logger.log('📍 Barcode position check:', {
      barcodeCenter: { x: screenBarcodeX, y: screenBarcodeY },
      scanArea: { left: scanAreaLeft, top: scanAreaTop, right: scanAreaRight, bottom: scanAreaBottom },
      isInArea
    });
    
    return isInArea;
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
        <Text style={styles.loadingText}>Initializing camera...</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeCameraButton} onPress={onClose}>
            <Text style={styles.closeCameraText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // No regionOfInterest - use full frame for smoother cylinder barcode scanning
  // (tight ROI made small/damaged labels hard to scan from certain angles)

  return (
    <View style={styles.fullscreenWrapper}>
      <Pressable
        style={styles.fullscreenCamera}
        onPress={() => {
          // Tap to focus - Android Expo Camera handles this automatically
          // Just log for debugging, don't toggle autofocus as it causes errors
          logger.log('📷 Tap to focus');
        }}
      >
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          zoom={cameraZoom}
          barcodeScannerSettings={{
            // All formats supported by expo-camera (iOS AVFoundation/Vision, Android ML Kit).
            // If a barcode still won't scan, confirm its type is in this list.
            barcodeTypes: [
              'code128',    // 1D: cylinder IDs, alternate receipts, 9-digit cylinders (PRIORITY)
              'code39',     // 1D: packing slips, sales receipts (e.g. %80000809-1657573726A), 9-digit cylinders
              'ean13',      // 1D: 13-digit (common retail)
              'ean8',       // 1D: 8-digit
              'upc_a',      // 1D: 12-digit (UPC-A)
              'upc_e',      // 1D: 6–8 digit (UPC-E)
              'code93',     // 1D
              'codabar',    // 1D: variable length (e.g. 9-digit); iOS 15.4+
              'itf14',      // 1D: 14-digit (shipping/cartons)
              'qr',         // 2D
              'aztec',      // 2D
              'datamatrix', // 2D
              'pdf417',     // 2D
            ],
            regionOfInterest: REGION_OF_INTEREST, // Restrict scanning to visual frame area
          }}
          onBarcodeScanned={enabled && cameraReady && !scanned ? (event: any) => {
            // Handle both object format { data, bounds } and string format
            handleBarcodeScanned(event);
          } : undefined}
          onCameraReady={() => {
            setCameraReady(true);
            logger.log('📷 ExpoCameraScanner: Camera fully ready and scanning enabled');
            logger.log('📷 Callback active:', enabled && cameraReady && !scanned);
            logger.log('📷 Using ML Kit:', useMLKitActive);
          }}
        />
      </Pressable>
      
      {/* Camera Overlay */}
      <View style={styles.cameraOverlay} pointerEvents="none">
        <View style={styles.scanFrame} pointerEvents="none" />
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
            logger.log('📷 Zoom out:', Math.max(0, cameraZoom - 0.1));
          }}
        >
          <Ionicons name="remove-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.zoomText}>{Math.round((1 + cameraZoom) * 100)}%</Text>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            // Max zoom: 2x (device dependent, but 2x is safe for most devices)
            setCameraZoom(Math.min(2, cameraZoom + 0.1));
            logger.log('📷 Zoom in:', Math.min(2, cameraZoom + 0.1));
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
    paddingTop: SCAN_FRAME_TOP, // Match regionOfInterest y position
  },
  scanFrame: {
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
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

export default ExpoCameraScanner;
