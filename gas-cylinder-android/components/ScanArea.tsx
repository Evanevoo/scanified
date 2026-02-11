import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, useWindowDimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { feedbackService } from '../services/feedbackService';

let TextRecognition: any = null;
// OCR disabled on Android (not needed; barcode scanning only)
if (Platform.OS !== 'android') {
  try {
    TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  } catch {
    TextRecognition = null;
  }
}

interface ScanAreaProps {
  onScanned: (barcode: string) => void;
  /** When provided, runs OCR when idle and only reports customers that exist in the system */
  searchCustomerByName?: (names: string[]) => Promise<{ name: string; id: string } | null>;
  onCustomerFound?: (customer: { name: string; id: string }) => void;
  label?: string;
  style?: any;
  barcodePreview?: string;
  validationPattern?: RegExp;
  enableRegionOfInterest?: boolean;
  /** Cooldown (ms) before next scan allowed. Default 400 for faster batch scanning. */
  scanDelay?: number;
  /** Hold time (ms) before confirming barcode to reduce misreads. Default 175 for faster scanning. */
  holdTimeoutMs?: number;
  onClose?: () => void;
  hideScanningLine?: boolean;
  /** When true, hides the "Last scanned" success indicator (for screens that show their own scanned item UI) */
  hideLastScannedIndicator?: boolean;
}

// Extract potential customer names from OCR text (exclude barcodes, numbers, short words)
const extractPossibleNames = (text: string): string[] => {
  const barcodePattern = /[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?|%\S+/;
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  const names: string[] = [];
  for (const line of lines) {
    if (barcodePattern.test(line) || /^\d+$/.test(line.replace(/\s/g, ''))) continue;
    const words = line.split(/\s+/).filter((w) => w.length >= 2 && !/^\d+$/.test(w));
    if (words.length >= 1 && words.join('').length >= 4) {
      const candidate = words.join(' ').trim();
      if (candidate.length >= 3 && candidate.length <= 80) names.push(candidate);
    }
  }
  return [...new Set(names)].slice(0, 5);
};

const ScanArea: React.FC<ScanAreaProps> = ({ 
  onScanned, 
  searchCustomerByName,
  onCustomerFound,
  label = 'SCAN HERE', 
  style, 
  barcodePreview,
  validationPattern = /^\d{9}$/,
  enableRegionOfInterest = true, // Show scan border by default (old camera view style)
  scanDelay = 400,
  holdTimeoutMs = 175,
  onClose,
  hideScanningLine = false,
  hideLastScannedIndicator = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false); // Defer mount to prevent Android crash
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [autofocusMode, setAutofocusMode] = useState<'on' | 'off'>('on');
  const [cameraZoom, setCameraZoom] = useState(0); // 0-1 (percentage of max zoom)
  const [flashEnabled, setFlashEnabled] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const scanCooldown = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<any>(null);
  const lastBarcodeScanTimeRef = useRef<number>(0);
  const lastOcrCustomerRef = useRef<string>('');
  const idleCheckRef = useRef({ isOcrProcessing, isProcessing, scanned, permissionGranted: permission?.granted });
  const searchCustomerByNameRef = useRef(searchCustomerByName);
  const onCustomerFoundRef = useRef(onCustomerFound);
  idleCheckRef.current = { isOcrProcessing, isProcessing, scanned, permissionGranted: permission?.granted };
  searchCustomerByNameRef.current = searchCustomerByName;
  onCustomerFoundRef.current = onCustomerFound;

  // Initialize feedback service for audio/haptic feedback
  useEffect(() => {
    feedbackService.initialize();
  }, []);

  // Defer CameraView mount so layout is ready (prevents Android crash on open)
  useEffect(() => {
    if (!permission?.granted) {
      setCameraReady(false);
      return;
    }
    const t = setTimeout(() => setCameraReady(true), 400);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  const validateBarcode = (barcode: string): { isValid: boolean; errorMessage?: string } => {
    if (!barcode || barcode.trim().length === 0) {
      return { isValid: false, errorMessage: 'Empty barcode detected' };
    }

    const trimmedBarcode = barcode.trim();

    // Additional validation for common barcode issues
    if (trimmedBarcode.includes(' ')) {
      return { isValid: false, errorMessage: 'Barcode contains spaces' };
    }

    if (trimmedBarcode.length < 4) {
      return { isValid: false, errorMessage: 'Barcode too short' };
    }

    if (trimmedBarcode.length > 50) {
      return { isValid: false, errorMessage: 'Barcode too long' };
    }

    // Check if this is a sales receipt barcode (starts with %)
    if (trimmedBarcode.startsWith('%')) {
      // Sales receipt format: % + 8 alphanumeric + hyphen + 10 digits + optional letter
      // Examples: %800006B3-1611180703A, %800005ca-1579809606A
      const salesReceiptPattern = /^%[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/;
      if (salesReceiptPattern.test(trimmedBarcode)) {
        return { isValid: true };
      }
      // Also accept without the % prefix if it matches the pattern
      const withoutPrefix = trimmedBarcode.replace(/^%/, '');
      const patternWithoutPrefix = /^[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/;
      if (patternWithoutPrefix.test(withoutPrefix)) {
        return { isValid: true };
      }
    }

    // Check against validation pattern (for packing slips - 9 digits)
    if (!validationPattern.test(trimmedBarcode)) {
      return { isValid: false, errorMessage: 'Invalid barcode format' };
    }

    return { isValid: true };
  };

  const handleBarcodeScanned = (event: any) => {
    if (isProcessing || scanned) return;

    const barcode = event.data?.trim();
    if (!barcode) return;

    // Prevent duplicate scans of the same barcode
    if (pendingBarcode === barcode) {
      return;
    }

    // Clear any existing timeouts
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (scanCooldown.current) clearTimeout(scanCooldown.current);

    setIsProcessing(true);
    setPendingBarcode(barcode);

    // Validate barcode
    const validation = validateBarcode(barcode);
    
    if (!validation.isValid) {
      const errorMsg = validation.errorMessage || 'Invalid barcode';
      setError(errorMsg);
      setScanned(true);
      feedbackService.scanError(errorMsg).catch((e) => logger.log('Feedback error:', e));

      // Clear error after delay
      setTimeout(() => {
        setScanned(false);
        setError('');
        setIsProcessing(false);
        setPendingBarcode(null);
      }, 2000);
      return;
    }

    // Require the barcode to be stable for a short time to prevent misreads
    holdTimeout.current = setTimeout(() => {
      setScanned(true);
      setLastScanned(barcode);
      setError('');
      feedbackService.scanSuccess(barcode).catch((e) => logger.log('Feedback error:', e));
      onScanned(barcode);
      lastBarcodeScanTimeRef.current = Date.now();

      // Set cooldown period to prevent rapid re-scanning
      scanCooldown.current = setTimeout(() => {
        setScanned(false);
        setIsProcessing(false);
        setPendingBarcode(null);
      }, scanDelay);
    }, holdTimeoutMs);
  };

  useEffect(() => {
    return () => {
      if (holdTimeout.current) clearTimeout(holdTimeout.current);
      if (scanCooldown.current) clearTimeout(scanCooldown.current);
    };
  }, []);

  // Automatic OCR when idle - only reports customers that exist in the system
  const runOcrIfIdle = async () => {
    const searchFn = searchCustomerByNameRef.current;
    const onFoundFn = onCustomerFoundRef.current;
    if (!searchFn || !onFoundFn || !TextRecognition || !cameraRef.current) return;
    const { isOcrProcessing: ocr, isProcessing: proc, scanned: scan, permissionGranted } = idleCheckRef.current;
    if (ocr || proc || scan || !permissionGranted) return;
    // Don't run OCR for 2s after a barcode scan
    if (Date.now() - lastBarcodeScanTimeRef.current < 2000) return;

    setIsOcrProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      if (!photo?.uri) return;

      const result = await TextRecognition.recognize(photo.uri);
      const rawText = result?.text?.trim() || '';
      if (!rawText) return;

      const possibleNames = extractPossibleNames(rawText);
      if (possibleNames.length === 0) return;

      const foundCustomer = await searchFn(possibleNames);
      if (foundCustomer && foundCustomer.name !== lastOcrCustomerRef.current) {
        lastOcrCustomerRef.current = foundCustomer.name;
        logger.log('📋 OCR: Customer found in system:', foundCustomer.name);
        onFoundFn(foundCustomer);
        feedbackService.scanSuccess().catch((e) => logger.log('Feedback error:', e));
      }
    } catch (err: any) {
      logger.log('OCR (idle):', err?.message || 'skipped');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Run OCR periodically when idle - use refs so interval isn't reset on parent re-renders
  useEffect(() => {
    if (!searchCustomerByName || !onCustomerFound || !TextRecognition) return;
    const interval = setInterval(runOcrIfIdle, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs hold latest callbacks
  }, []);

  // Calculate region of interest for better scanning
  const regionOfInterest = enableRegionOfInterest ? {
    x: 0.1, // 10% from left
    y: 0.35, // 35% from top
    width: 0.8, // 80% width
    height: 0.3, // 30% height
  } : undefined;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.scanAreaWrapper}>
        <View style={styles.scanAreaBox}> 
          {!permission ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.statusText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerContent}>
              <Text style={styles.statusText}>Camera permission required</Text>
              <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : !cameraReady ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.statusText}>Starting camera...</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.camera}
                onPress={() => {
                  // Tap to refocus on Android - toggle autofocus prop to trigger startFocusMetering
                  setAutofocusMode('off');
                  setTimeout(() => setAutofocusMode('on'), 100);
                }}
              >
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  zoom={cameraZoom}
                  enableTorch={flashEnabled}
                  autofocus={autofocusMode}
                  onCameraReady={() => {
                    // Re-trigger focus when camera is ready (helps Android devices that miss initial focus)
                    setAutofocusMode('off');
                    setTimeout(() => setAutofocusMode('on'), 80);
                  }}
                  animateShutter={false}
                  barcodeScannerSettings={{
                    barcodeTypes: ['code128', 'code39', 'codabar', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'qr', 'aztec', 'datamatrix', 'pdf417'],
                    // Aligned with visual scanning frame (30% from top)
                    ...(enableRegionOfInterest ? {
                      regionOfInterest: {
                        x: 0.1,
                        y: 0.30,
                        width: 0.8,
                        height: 0.32,
                      },
                    } : {}),
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />
              </Pressable>
              
              {/* Flash, Zoom, Close - all in top-right row */}
              <View style={styles.cameraControlsTopRight}>
                <TouchableOpacity
                  style={[styles.cameraControlButton, flashEnabled && styles.cameraControlButtonActive]}
                  onPress={() => setFlashEnabled((v) => !v)}
                >
                  <Text style={styles.cameraControlIcon}>{flashEnabled ? '🔦' : '💡'}</Text>
                </TouchableOpacity>
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => setCameraZoom((z) => Math.max(0, z - 0.25))}
                  >
                    <Text style={styles.zoomButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.zoomLabel}>{Math.round(cameraZoom * 100)}%</Text>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => setCameraZoom((z) => Math.min(1, z + 0.25))}
                  >
                    <Text style={styles.zoomButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                {onClose && (
                  <TouchableOpacity
                    style={styles.cameraControlButton}
                    onPress={onClose}
                  >
                    <Text style={styles.cameraControlIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Enhanced scanning overlay - responsive, aligned with barcode scan region */}
              {enableRegionOfInterest && (() => {
                const frameWidth = Math.min(320, screenWidth * 0.88);
                const frameHeight = Math.min(150, screenHeight * 0.2);
                const frameTopPercent = 30;
                return (
                  <>
                    <View style={[
                      styles.scanningFrame,
                      {
                        top: `${frameTopPercent}%`,
                        left: '50%',
                        width: frameWidth,
                        height: frameHeight,
                        transform: [{ translateX: -frameWidth / 2 }],
                      }
                    ]} />
                    {isProcessing && !hideScanningLine && (
                      <View style={[
                        styles.scanningLine,
                        {
                          top: `${frameTopPercent + (frameHeight / screenHeight) * 50}%`,
                          left: '50%',
                          width: frameWidth,
                          transform: [{ translateX: -frameWidth / 2 }],
                        }
                      ]} />
                    )}
                  </>
                );
              })()}

              {/* Status overlay */}
              {(error || isProcessing) && (
                <View style={styles.statusOverlay}>
                  <View style={[
                    styles.statusBadge, 
                    error ? styles.errorBadge : styles.processingBadge
                  ]}>
                    {isProcessing && !error && (
                      <ActivityIndicator size="small" color="#fff" style={styles.statusIcon} />
                    )}
                    <Text style={styles.statusBadgeText}>
                      {error || 'Processing...'}
                    </Text>
                  </View>
                </View>
              )}

              {barcodePreview && (
                <View style={styles.barcodePreviewBox}>
                  <Text style={styles.barcodePreviewText}>{barcodePreview}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      
      {!hideLastScannedIndicator && lastScanned && !error && (
        <View style={styles.successIndicator}>
          <Text style={styles.lastScanned}>✓ Last scanned: {lastScanned}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanAreaWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    position: 'relative',
  },
  scanAreaBox: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanningFrame: {
    position: 'absolute',
    top: '20%', // Moved up from 35% to camera level
    left: '50%',
    transform: [{ translateX: -160 }], // Center 320px width
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanningLine: {
    position: 'absolute',
    top: '27.5%', // Center of 320x150 frame at 20% top
    left: '50%',
    transform: [{ translateX: -160 }], // Center 320px width
    width: 320,
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.8,
  },
  statusOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '90%',
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  processingBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  statusIcon: {
    marginRight: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  barcodePreviewBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
  },
  barcodePreviewText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    alignItems: 'flex-start',
    gap: 8,
  },
  cameraControlsTopRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraControlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  cameraControlButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  cameraControlIcon: {
    fontSize: 20,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoomButton: {
    padding: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  zoomButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  zoomLabel: {
    color: '#fff',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  successIndicator: {
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  lastScanned: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ScanArea; 