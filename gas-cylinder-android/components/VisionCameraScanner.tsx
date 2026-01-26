import React, { useEffect, useRef, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import logger from '../utils/logger';

// Error Boundary Component
class VisionCameraErrorBoundary extends Component<
  { children: ReactNode; onClose?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onClose?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('❌ Vision Camera Error Boundary caught error:', error, errorInfo);
    // Automatically call onClose to fall back to Expo Camera
    if (this.props.onClose) {
      // Use setTimeout to avoid calling setState during render
      setTimeout(() => {
        this.props.onClose?.();
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>
            ⚠️ Vision Camera Error
          </Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Failed to initialize Vision Camera'}
          </Text>
          <Text style={styles.errorText}>
            Falling back to Expo Camera...
          </Text>
          {this.props.onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={this.props.onClose}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

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
  logger.log('✅ Vision Camera module loaded successfully');
} catch (error) {
  logger.error('⚠️ Vision Camera module not available:', error);
  visionCameraAvailable = false;
}

// Try to load OCR plugin
try {
  const ocrModule = require('@bear-block/vision-camera-ocr');
  performOcr = ocrModule.performOcr;
  ocrAvailable = true;
  logger.log('✅ OCR plugin loaded successfully');
} catch (error) {
  logger.log('⚠️ OCR plugin not available (optional):', error);
  ocrAvailable = false;
}

interface VisionCameraScannerProps {
  onBarcodeScanned: (data: string) => void;
  enabled?: boolean;
  onClose?: () => void;
  target?: 'customer' | 'order';
}

const VisionCameraScanner: React.FC<VisionCameraScannerProps> = ({
  onBarcodeScanned,
  enabled = true,
  onClose,
  target = 'customer',
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

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

  // Hooks must be called unconditionally at top level
  // If they fail, the error will be caught by the error boundary wrapper
  const device = useCameraDevice('back');
  
  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'code-128',
      'code-39',
      'code-93',
      'codabar',
      'itf',
      'data-matrix',
      'pdf-417',
      'aztec',
    ],
    onCodeScanned: (codes) => {
      if (!enabled || codes.length === 0) return;

      const code = codes[0];
      const data = code.value || '';

      if (!data) return;

      // Prevent duplicate scans
      const now = Date.now();
      if (data === lastScannedRef.current && (now - lastScanTimeRef.current) < 2000) {
        logger.log('📷 Vision Camera: Ignoring duplicate scan');
        return;
      }

      lastScannedRef.current = data;
      lastScanTimeRef.current = now;

      logger.log('📷 Vision Camera barcode detected:', data, 'Type:', code.type);

      if (enabled && data) {
        onBarcodeScanned(data);
      }
    },
  });

  const lastOcrBarcodeRef = useRef<string>('');
  const lastOcrTimeRef = useRef<number>(0);

  // Callback wrapper for OCR-detected barcodes
  const handleOcrBarcode = useCallback((barcode: string) => {
    logger.log('📋 OCR: Calling onBarcodeScanned with:', barcode);
    onBarcodeScanned(barcode);
  }, [onBarcodeScanned]);

  // Frame processor for text recognition (OCR) - runs in parallel with barcode scanning
  // This will detect the full barcode text from sales receipts: 800005BE-1578330321A
  const frameProcessor = useFrameProcessor && ocrAvailable && performOcr && useFrameProcessor((frame: any) => {
    'worklet';
    
    if (!enabled) return;
    
    try {
      // Perform OCR on the frame
      const ocrResult = performOcr(frame);
      
      if (ocrResult && ocrResult.text) {
        const recognizedText = ocrResult.text;
        
        // Extract barcode from recognized text using regex in worklet
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
          // Prevent duplicate OCR scans (using refs in worklet)
          const now = Date.now();
          if (barcode === lastOcrBarcodeRef.current && (now - lastOcrTimeRef.current) < 2000) {
            return; // Ignore duplicate
          }
          
          lastOcrBarcodeRef.current = barcode;
          lastOcrTimeRef.current = now;
          
          // Call the React callback using runOnJS
          runOnJS(handleOcrBarcode)(barcode);
        }
      }
    } catch (error) {
      // Silently handle errors in worklet
    }
  }, [enabled, handleOcrBarcode]);

  // Request camera permission
  useEffect(() => {
    (async () => {
      try {
        if (Camera && Camera.requestCameraPermission) {
          const status = await Camera.requestCameraPermission();
          setHasPermission(status === 'granted');
        } else {
          logger.error('❌ Camera.requestCameraPermission not available');
          setHasPermission(false);
          setError('Camera permission API not available');
        }
      } catch (err: any) {
        logger.error('❌ Failed to request camera permission:', err);
        setHasPermission(false);
        setError(err?.message || 'Failed to request camera permission');
      }
    })();
  }, []);

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

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={enabled}
        codeScanner={codeScanner}
        frameProcessor={frameProcessor}
        frameProcessorFps={ocrAvailable ? 5 : undefined}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={styles.scanFrame} />
        <Text style={styles.instructionText}>
          Point camera at {target === 'customer' ? 'customer' : 'order'} barcode{ocrAvailable ? '\n(OCR enabled - reading text)' : ''}
        </Text>
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕ Close</Text>
        </TouchableOpacity>
      )}
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
  scanFrame: {
    width: 300,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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

// Export wrapped component with error boundary
const VisionCameraScannerWithErrorBoundary: React.FC<VisionCameraScannerProps> = (props) => {
  return (
    <VisionCameraErrorBoundary onClose={props.onClose}>
      <VisionCameraScanner {...props} />
    </VisionCameraErrorBoundary>
  );
};

export default VisionCameraScannerWithErrorBoundary;
