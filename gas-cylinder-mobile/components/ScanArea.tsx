import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, Platform, useWindowDimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedbackService } from '../services/feedbackService';

let TextRecognition: any = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

/** iOS: same ML Kit barcode engine family as Android expo-camera pipeline; still-image pass when live ZXing misses. */
let BarcodeScanning: { scan: (imageUrl: string) => Promise<{ value?: string }[]> } | null = null;
if (Platform.OS === 'ios') {
  try {
    BarcodeScanning = require('@react-native-ml-kit/barcode-scanning').default;
  } catch {
    BarcodeScanning = null;
  }
}

interface ScanAreaProps {
  onScanned: (barcode: string) => void;
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
  /**
   * Reserve space at the bottom of the camera viewport (e.g. absolute RETURN/SHIP controls).
   * Shortens the preview with marginBottom so the optical center matches where users aim on small iPhones.
   */
  reserveViewportBottom?: number;
}

type ScannerSdkMode = 'expo-native' | 'zbar-profile';
const SCANNER_SETTINGS_STORAGE_KEY = '@scanner_settings';


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
  reserveViewportBottom = 0,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // iOS compact phones (13 mini, 12 mini ≈812pt) need small-screen handling; use lower threshold on iOS
  const isSmallScreen = Platform.OS === 'ios' ? screenHeight < 850 : screenHeight < 700;
  const isVerySmallScreen = Platform.OS === 'ios' ? screenHeight < 700 : screenHeight < 600;
  /** Narrow width (mini, SE) — same layout pressure as short screens for aiming the barcode */
  const isCompactWidth = screenWidth <= 380;
  const compactPhone =
    isVerySmallScreen || (Platform.OS === 'ios' && isSmallScreen) || isCompactWidth;

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false); // Defer mount to prevent crash on open
  const [nativeCameraReady, setNativeCameraReady] = useState(false); // iOS: only enable barcode scan after native preview is ready
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [sdkMode, setSdkMode] = useState<ScannerSdkMode>('expo-native');
  /**
   * iOS: expo-camera maps `autofocus="on"` to focus-once-then-lock; that hurts handheld scanning.
   * Default to `off` ("focus when needed" / continuous). Tap briefly sets `on` then back to `off` to force a refocus.
   * @see https://docs.expo.dev/versions/latest/sdk/camera/#focusmode
   */
  const [iosAutofocusMode, setIosAutofocusMode] = useState<'on' | 'off'>('off');
  const iosRefocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Only mini / SE need default digital zoom; using height alone also matched 6.1in phones and hurt them vs Pro Max. */
  const [cameraZoom, setCameraZoom] = useState(() => {
    if (Platform.OS !== 'ios') return 0;
    if (isVerySmallScreen) return 0.18;
    if (isCompactWidth) return 0.14;
    return 0;
  });
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // Graceful shutdown for iOS (avoids AVCaptureSession crash)
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const scanCooldown = useRef<NodeJS.Timeout | null>(null);
  const pendingBarcodeRef = useRef<string | null>(null);
  const cameraRef = useRef<any>(null);
  const lastBarcodeScanTimeRef = useRef<number>(0);
  const lastOcrCustomerRef = useRef<string>('');
  /** Suppress duplicate reads of the same value right after a successful emit (does not block other barcodes). */
  const lastEmitSuppressRef = useRef<{ code: string; until: number } | null>(null);
  /** iOS ML Kit still-frame pass must not overlap itself or fight the live scanner. */
  const iosMlStillBusyRef = useRef(false);
  const handleBarcodeScannedRef = useRef<(event: any) => void>(() => {});
  const validateBarcodeRef = useRef<(barcode: string) => { isValid: boolean; errorMessage?: string }>(() => ({
    isValid: false,
  }));
  const idleCheckRef = useRef({ isOcrProcessing, isProcessing, permissionGranted: permission?.granted });
  const searchCustomerByNameRef = useRef(searchCustomerByName);
  const onCustomerFoundRef = useRef(onCustomerFound);
  idleCheckRef.current = { isOcrProcessing, isProcessing, permissionGranted: permission?.granted };
  searchCustomerByNameRef.current = searchCustomerByName;
  onCustomerFoundRef.current = onCustomerFound;

  // Initialize feedback service for audio/haptic feedback
  useEffect(() => {
    feedbackService.initialize();
  }, []);

  // iOS-only test mode: apply scanner profile globally across ScanArea usage.
  useEffect(() => {
    let cancelled = false;

    const loadSdkMode = async () => {
      if (Platform.OS !== 'ios') return;
      try {
        const raw = await AsyncStorage.getItem(SCANNER_SETTINGS_STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw);
        if (parsed?.sdk === 'zbar-profile' || parsed?.sdk === 'expo-native') {
          setSdkMode(parsed.sdk);
        }
      } catch {
        // Keep default mode on read/parse failures.
      }
    };

    loadSdkMode();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveHoldTimeoutMs = Platform.OS === 'ios' && sdkMode === 'zbar-profile' ? 300 : holdTimeoutMs;
  /** Same cooldown as `scanDelay` on both platforms (was longer on iOS zbar-profile, which hid duplicate feedback). */
  const effectiveScanDelay = scanDelay;

  // Defer CameraView mount so layout is ready (prevents crash on open). Shorter delay; overlay hides init glitch.
  const cameraMountDelay = Platform.OS === 'ios' ? (compactPhone ? 400 : 300) : 200;
  useEffect(() => {
    if (!permission?.granted) {
      setCameraReady(false);
      setNativeCameraReady(false);
      return;
    }
    const t = setTimeout(() => {
      setCameraReady(true);
      setNativeCameraReady(false);
      overlayOpacity.setValue(1);
    }, cameraMountDelay);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  // iOS: reset native ready when camera closes so we wait again on next open
  useEffect(() => {
    if (isClosing || !cameraReady) setNativeCameraReady(false);
  }, [isClosing, cameraReady]);

  // iOS: enable scanning after a short delay even if onCameraReady never fires (fixes iPhone 13 / some builds)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !cameraReady || isClosing) return;
    const fallback = setTimeout(() => setNativeCameraReady(true), 2200);
    return () => clearTimeout(fallback);
  }, [Platform.OS, cameraReady, isClosing]);

  // Graceful camera shutdown before unmount - prevents AVCaptureSession crash on iOS TestFlight
  const handleClose = () => {
    if (!onClose) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

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
      return { isValid: false, errorMessage: 'Scan not recognized. Please ensure the full barcode is in frame and try again.' };
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

  validateBarcodeRef.current = validateBarcode;

  const handleBarcodeScanned = (event: any) => {
    const barcode = event.data?.trim();
    if (!barcode) return;

    const now = Date.now();
    const suppress = lastEmitSuppressRef.current;
    if (suppress && now < suppress.until && suppress.code === barcode) {
      return;
    }

    // During the hold window, accept new events and keep the longest valid candidate (reduces partial 1D reads on iOS).
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

    if (pendingBarcodeRef.current === barcode) {
      return;
    }

    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (scanCooldown.current) clearTimeout(scanCooldown.current);

    const validation = validateBarcode(barcode);

    if (!validation.isValid) {
      const errorMsg = validation.errorMessage || 'Invalid barcode';
      setError(errorMsg);
      feedbackService.scanError(errorMsg).catch((e) => logger.log('Feedback error:', e));

      setTimeout(() => {
        setError('');
        setPendingBarcode(null);
        pendingBarcodeRef.current = null;
      }, 1500);
      return;
    }

    setIsProcessing(true);
    pendingBarcodeRef.current = barcode;
    setPendingBarcode(barcode);

    holdTimeout.current = setTimeout(() => {
      const finalBarcode = pendingBarcodeRef.current || barcode;
      const emittedAt = Date.now();
      lastEmitSuppressRef.current = { code: finalBarcode, until: emittedAt + effectiveScanDelay };
      setLastScanned(finalBarcode);
      setError('');
      feedbackService.scanSuccess(finalBarcode).catch((e) => logger.log('Feedback error:', e));
      onScanned(finalBarcode);
      lastBarcodeScanTimeRef.current = emittedAt;

      scanCooldown.current = setTimeout(() => {
        setIsProcessing(false);
        setPendingBarcode(null);
        pendingBarcodeRef.current = null;
      }, effectiveScanDelay);
    }, effectiveHoldTimeoutMs);
  };

  handleBarcodeScannedRef.current = handleBarcodeScanned;

  /** iOS: periodic still → ML Kit decode (Google), parallel to expo-camera live (ZXingObjC). No cloud cost. */
  const runIosMlKitStillPass = useCallback(async () => {
    if (!BarcodeScanning || Platform.OS !== 'ios') return;
    if (!cameraRef.current || isClosing || !nativeCameraReady || !permission?.granted) return;
    if (iosMlStillBusyRef.current) return;
    if (idleCheckRef.current.isProcessing || idleCheckRef.current.isOcrProcessing) return;
    if (Date.now() - lastBarcodeScanTimeRef.current < 2000) return;

    iosMlStillBusyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.52,
        shutterSound: false,
      });
      const uri = photo?.uri;
      if (!uri) return;

      const rows = await BarcodeScanning.scan(uri);
      if (!Array.isArray(rows) || rows.length === 0) return;

      const check = validateBarcodeRef.current;
      for (const row of rows) {
        const candidate = String(row?.value ?? '').trim();
        if (!candidate) continue;
        const validation = check(candidate);
        if (!validation.isValid) continue;
        handleBarcodeScannedRef.current({ data: candidate });
        break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.log('iOS ML Kit still barcode:', msg);
    } finally {
      iosMlStillBusyRef.current = false;
    }
  }, [isClosing, nativeCameraReady, permission?.granted]);

  useEffect(() => {
    if (!BarcodeScanning || Platform.OS !== 'ios') return;
    if (!cameraReady || !permission?.granted || isClosing || !nativeCameraReady) return;

    const IOS_ML_STILL_INTERVAL_MS = 3200;
    const id = setInterval(() => {
      void runIosMlKitStillPass();
    }, IOS_ML_STILL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cameraReady, permission?.granted, isClosing, nativeCameraReady, runIosMlKitStillPass]);

  useEffect(() => {
    return () => {
      if (holdTimeout.current) clearTimeout(holdTimeout.current);
      if (scanCooldown.current) clearTimeout(scanCooldown.current);
      if (iosRefocusTimerRef.current) clearTimeout(iosRefocusTimerRef.current);
    };
  }, []);

  const runOcrIfIdle = async () => {
    const searchFn = searchCustomerByNameRef.current;
    const onFoundFn = onCustomerFoundRef.current;
    if (!searchFn || !onFoundFn || !TextRecognition || !cameraRef.current) return;
    const { isOcrProcessing: ocr, isProcessing: proc, permissionGranted } = idleCheckRef.current;
    if (ocr || proc || !permissionGranted) return;
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

  // Run OCR periodically when idle (Android only; text reading disabled on iOS)
  useEffect(() => {
    if (Platform.OS === 'ios') return;
    if (!searchCustomerByName || !onCustomerFound || !TextRecognition) return;
    const interval = setInterval(runOcrIfIdle, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs hold latest callbacks
  }, []);

  // Calculate region of interest — Android only (iOS ROI can block 1D callbacks on some builds).
  /** Height used for guide math when bottom UI reserves space (modal overlays). */
  const layoutHeight = Math.max(260, screenHeight - reserveViewportBottom);
  const safeTop = insets.top / layoutHeight;
  /** iOS: barcode detection is center-weighted; older layout put the guide too high (~22%) vs the real sweet spot. */
  const frameWidth = Math.min(compactPhone ? 300 : 320, screenWidth * (isCompactWidth ? 0.94 : 0.9));
  const frameHeight = Math.min(
    compactPhone ? 140 : 150,
    Math.max(115, layoutHeight * (compactPhone ? 0.24 : 0.22))
  );
  const frameCenterPercentIos = compactPhone ? 43 : 44;
  const frameTopPercent = Platform.OS === 'ios'
    ? Math.max(
        safeTop * 100 + 10,
        frameCenterPercentIos - (frameHeight / layoutHeight) * 50
      )
    : 30;
  const roiYOffset = Platform.OS === 'ios' ? 0.02 : 0;
  const roiHeight = compactPhone ? 0.38 : isSmallScreen ? 0.35 : 0.32;
  // Android: use ROI to focus scan area (wider than the overlay so curved bottle labels still decode).
  // iOS: omit ROI - Apple detects 1D barcodes only near center, and ROI can prevent callbacks on some builds.
  const regionOfInterest = enableRegionOfInterest && Platform.OS !== 'ios' ? {
    x: 0.04,
    y: Math.max(0.12, (frameTopPercent / 100) + roiYOffset - 0.06),
    width: 0.92,
    height: Math.min(0.58, roiHeight + 0.18),
  } : undefined;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.scanAreaWrapper}>
        <View
          style={[
            styles.scanAreaBox,
            reserveViewportBottom > 0 && { marginBottom: reserveViewportBottom },
          ]}
        >
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
                  if (Platform.OS !== 'ios') return;
                  if (iosRefocusTimerRef.current) clearTimeout(iosRefocusTimerRef.current);
                  setIosAutofocusMode('on');
                  iosRefocusTimerRef.current = setTimeout(() => {
                    setIosAutofocusMode('off');
                    iosRefocusTimerRef.current = null;
                  }, 220);
                }}
              >
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  active={!isClosing}
                  zoom={cameraZoom}
                  enableTorch={flashEnabled}
                  autofocus={Platform.OS === 'ios' ? iosAutofocusMode : 'on'}
                  animateShutter={false}
                  mode="video"
                  onCameraReady={() => {
                  setNativeCameraReady(true);
                  Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
                }}
                  onBarcodeScanned={
                    isClosing
                      ? undefined
                      : (Platform.OS === 'ios' && !nativeCameraReady)
                        ? undefined
                        : handleBarcodeScanned
                  }
                  barcodeScannerEnabled={
                    !isClosing &&
                    (Platform.OS !== 'ios' || nativeCameraReady)
                  }
                  barcodeScannerSettings={{
                    // Lowercase required on iOS. Full set supported by expo-camera (SDK 54+); was missing 2D types used on some asset labels.
                    barcodeTypes: [
                      'code128', 'code39', 'codabar', 'code93', 'itf14',
                      'ean13', 'ean8', 'upc_a', 'upc_e',
                      'qr', 'pdf417', 'datamatrix', 'aztec',
                    ],
                    ...(regionOfInterest && { regionOfInterest })
                  }}
                />
                {/* Overlay hides camera init glitch; fades out when preview is ready */}
                <Animated.View
                  pointerEvents={nativeCameraReady ? 'none' : 'auto'}
                  style={[styles.cameraStartingOverlay, { opacity: overlayOpacity }]}
                >
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.statusText}>Starting camera...</Text>
                </Animated.View>
              </Pressable>
              
              {/* Flash, Zoom, Close - all in top-right row (below safe area on notched devices) */}
              <View style={[styles.cameraControlsTopRight, { top: Math.max(50, insets.top + 12) }]}>
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
                    onPress={handleClose}
                    disabled={isClosing}
                  >
                    <Text style={styles.cameraControlIcon}>{isClosing ? '…' : '✕'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Enhanced scanning overlay - responsive, aligned with barcode scan region */}
              {enableRegionOfInterest && (
                <>
                  {/* pointerEvents none: frame is visual only; otherwise iOS captures taps in the scan box and breaks tap-to-refocus */}
                  <View
                    pointerEvents="none"
                    style={[
                    styles.scanningFrame,
                    {
                      top: `${frameTopPercent}%`,
                      left: '50%',
                      width: frameWidth,
                      height: frameHeight,
                      transform: [{ translateX: -frameWidth / 2 }],
                    }
                  ]} />
                  
                  {/* Scanning animation */}
                  {isProcessing && !hideScanningLine && (
                    <View
                      pointerEvents="none"
                      style={[
                      styles.scanningLine,
                      {
                        top: `${frameTopPercent + (frameHeight / layoutHeight) * 50}%`,
                        left: '50%',
                        width: frameWidth,
                        transform: [{ translateX: -frameWidth / 2 }],
                      }
                    ]} />
                  )}
                </>
              )}

              {/* Status overlay (below safe area) */}
              {(error || isProcessing) && (
                <View
                  pointerEvents="box-none"
                  style={[styles.statusOverlay, { top: Math.max(20, insets.top + 8) }]}
                >
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
                <View pointerEvents="none" style={styles.barcodePreviewBox}>
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
    top: '15%', // Moved up to camera lens level
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