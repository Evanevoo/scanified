import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, useWindowDimensions, Platform, Animated } from 'react-native';
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
  /** When true, disables the periodic autofocus toggle on Android (avoids blur when pointing at barcode). Use for customer barcode scanning. */
  disablePeriodicFocus?: boolean;
  /** When set, only these barcode types are decoded (e.g. ['code39'] for customer barcode only). Reduces misreads from order numbers / other symbologies. */
  barcodeTypesOverride?: string[];
  /** When provided, only barcodes for which this returns true get success feedback and onScanned. Others are silently ignored (no beep, no error). Use so order number doesn't trigger a "reaction" when scanning for customer barcode. */
  acceptForFeedback?: (barcode: string) => boolean;
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
  disablePeriodicFocus = false,
  barcodeTypesOverride,
  acceptForFeedback,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false); // Defer mount to prevent Android crash
  const [previewReady, setPreviewReady] = useState(false); // Hide "Starting camera..." overlay when native preview is ready
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const pendingBarcodeRef = useRef<string | null>(null);
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
  const focusTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const focusIntervalRef = useRef<NodeJS.Timer | null>(null);
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

  // Defer CameraView mount so layout is ready (prevents Android crash on open). Short delay; overlay hides init glitch.
  useEffect(() => {
    if (!permission?.granted) {
      setCameraReady(false);
      setPreviewReady(false);
      return;
    }
    const delay = Platform.OS === 'android' ? 150 : 200;
    const t = setTimeout(() => {
      setCameraReady(true);
      setPreviewReady(false);
      overlayOpacity.setValue(1);
    }, delay);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  useEffect(() => {
    return () => {
      focusTimeoutsRef.current.forEach((id) => clearTimeout(id));
      focusTimeoutsRef.current = [];
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current as any);
    };
  }, []);

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
    if (scanned) return;

    const barcode = event.data?.trim();
    if (!barcode) return;

    // When we're inside the "hold" window, accept new scan events and keep the most complete candidate.
    // This prevents confirming the first partial read (common on Android scanners).
    if (isProcessing) {
      const validation = validateBarcode(barcode);
      if (!validation.isValid) return;

      const current = pendingBarcodeRef.current;
      if (!current || barcode.length > current.length) {
        pendingBarcodeRef.current = barcode;
        setPendingBarcode(barcode);
      }
      return;
    }

    // Prevent duplicate scans of the same barcode
    if (pendingBarcodeRef.current === barcode) {
      return;
    }

    // Clear any existing timeouts
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (scanCooldown.current) clearTimeout(scanCooldown.current);

    const validation = validateBarcode(barcode);
    
    if (!validation.isValid) {
      const errorMsg = validation.errorMessage || 'Invalid barcode';
      setError(errorMsg);
      feedbackService.scanError(errorMsg).catch((e) => logger.log('Feedback error:', e));

      // Clear error after delay; do not lock the scanner for invalid reads.
      setTimeout(() => {
        setError('');
        setPendingBarcode(null);
        pendingBarcodeRef.current = null;
      }, 1500);
      return;
    }

    // Optional: only accept this barcode for feedback/callback (e.g. ignore order number when scanning for customer).
    if (acceptForFeedback && !acceptForFeedback(barcode)) {
      return;
    }

    setIsProcessing(true);
    pendingBarcodeRef.current = barcode;
    setPendingBarcode(barcode);

    // Require the barcode to be stable for a short time to prevent misreads
    holdTimeout.current = setTimeout(() => {
      setScanned(true);
      const finalBarcode = pendingBarcodeRef.current || barcode;
      setLastScanned(finalBarcode);
      setError('');
      feedbackService.scanSuccess(barcode).catch((e) => logger.log('Feedback error:', e));
      onScanned(finalBarcode);
      lastBarcodeScanTimeRef.current = Date.now();

      // Set cooldown period to prevent rapid re-scanning
      scanCooldown.current = setTimeout(() => {
        setScanned(false);
        setIsProcessing(false);
        setPendingBarcode(null);
        pendingBarcodeRef.current = null;
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
      if (!cameraRef.current) return;
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
  // IMPORTANT:
  // The camera scanner ROI must line up with the visible scan frame.
  // If the ROI is too large, the scanner can “catch” a nearby barcode
  // (e.g. SALESORDER) while the user is targeting the customer barcode.
  const frameTopPercent = 30;
  const frameWidthPx = Math.min(320, screenWidth * 0.88);
  const frameHeightPx = Math.min(150, screenHeight * 0.2);
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const frameWidthRatio = screenWidth > 0 ? clamp01(frameWidthPx / screenWidth) : 0.8;
  const frameHeightRatio = screenHeight > 0 ? clamp01(frameHeightPx / screenHeight) : 0.2;
  const scanningRegionOfInterest = enableRegionOfInterest
    ? {
        x: clamp01(0.5 - frameWidthRatio / 2),
        y: clamp01(frameTopPercent / 100),
        width: frameWidthRatio,
        height: frameHeightRatio,
      }
    : undefined;

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
                  // Tap to focus: toggle autofocus to trigger focus cycle (same timing as periodic focus)
                  if (Platform.OS === 'android') {
                    setAutofocusMode('off');
                    setTimeout(() => setAutofocusMode('on'), 180);
                  }
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
                    // Longer off duration so Android has time to complete each focus cycle (better focus on Add Cylinders / scanner modal)
                    const FOCUS_OFF_MS = 180;
                    const triggerFocus = () => {
                      setAutofocusMode('off');
                      setTimeout(() => setAutofocusMode('on'), FOCUS_OFF_MS);
                    };
                    focusTimeoutsRef.current.forEach((id) => clearTimeout(id));
                    focusTimeoutsRef.current = [];
                    // Let the preview stabilize before we start focus cycles (reduces initial glitch).
                    const FOCUS_START_DELAY_MS = 600;
                    if (!disablePeriodicFocus) {
                      // Fewer, later focus triggers so the first ~2s aren't a constant glitch; then 1s interval.
                      focusTimeoutsRef.current.push(setTimeout(triggerFocus, FOCUS_START_DELAY_MS));
                      [1400, 2500].forEach((ms) => {
                        focusTimeoutsRef.current.push(setTimeout(triggerFocus, FOCUS_START_DELAY_MS + ms));
                      });
                      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current as ReturnType<typeof setInterval>);
                      focusIntervalRef.current = setInterval(triggerFocus, 1000);
                    } else {
                      focusTimeoutsRef.current.push(setTimeout(triggerFocus, FOCUS_START_DELAY_MS));
                    }
                    // Keep overlay a bit longer so init glitch is hidden, then fade smoothly.
                    const overlayDelayMs = 400;
                    focusTimeoutsRef.current.push(setTimeout(() => {
                      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setPreviewReady(true));
                    }, overlayDelayMs));
                  }}
                  animateShutter={false}
                  barcodeScannerSettings={{
                    barcodeTypes: barcodeTypesOverride ?? ['code128', 'code39', 'codabar', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'qr', 'aztec', 'datamatrix', 'pdf417'],
                    // Aligned with the visible scan frame.
                    ...(scanningRegionOfInterest ? { regionOfInterest: scanningRegionOfInterest } : {}),
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />
                {/* Overlay hides camera init glitch; fades out when preview is ready */}
                <Animated.View
                  pointerEvents={previewReady ? 'none' : 'auto'}
                  style={[styles.cameraStartingOverlay, { opacity: overlayOpacity }]}
                >
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.statusText}>Starting camera...</Text>
                </Animated.View>
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
                return (
                  <>
                    <View style={[
                      styles.scanningFrame,
                      {
                        top: `${frameTopPercent}%`,
                        left: '50%',
                        width: frameWidthPx,
                        height: frameHeightPx,
                        transform: [{ translateX: -frameWidthPx / 2 }],
                      }
                    ]} />
                    {isProcessing && !hideScanningLine && (
                      <View style={[
                        styles.scanningLine,
                        {
                          top: `${frameTopPercent + frameHeightRatio * 50}%`,
                          left: '50%',
                          width: frameWidthPx,
                          transform: [{ translateX: -frameWidthPx / 2 }],
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
  cameraStartingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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