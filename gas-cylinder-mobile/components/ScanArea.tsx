import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Vibration, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface ScanAreaProps {
  onScanned: (barcode: string) => void;
  label?: string;
  style?: any;
  barcodePreview?: string;
  validationPattern?: RegExp;
  enableRegionOfInterest?: boolean;
  scanDelay?: number;
  onClose?: () => void;
  hideScanningLine?: boolean; // New prop to hide scanning line
}

const { width, height } = Dimensions.get('window');

const ScanArea: React.FC<ScanAreaProps> = ({ 
  onScanned, 
  label = 'SCAN HERE', 
  style, 
  barcodePreview,
  validationPattern = /^\d{9}$/,
  enableRegionOfInterest = true,
  scanDelay = 500,
  onClose,
  hideScanningLine = false, // Default to false to maintain existing behavior
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const scanCooldown = useRef<NodeJS.Timeout | null>(null);

  const playBeep = async () => {
    try {
      // Enhanced feedback with different vibration patterns
      if (error) {
        // Error pattern: short-long-short
        Vibration.vibrate([50, 100, 150, 100, 50]);
      } else {
        // Success pattern: single strong vibration
        Vibration.vibrate(100);
      }
    } catch (e) {
      logger.log('Vibration failed:', e);
    }
  };

  const validateBarcode = (barcode: string): { isValid: boolean; errorMessage?: string } => {
    if (!barcode || barcode.trim().length === 0) {
      return { isValid: false, errorMessage: 'Empty barcode detected' };
    }

    const trimmedBarcode = barcode.trim();

    // Check against validation pattern
    if (!validationPattern.test(trimmedBarcode)) {
      return { isValid: false, errorMessage: 'Invalid barcode format' };
    }

    // Additional validation for common barcode issues
    if (trimmedBarcode.includes(' ')) {
      return { isValid: false, errorMessage: 'Barcode contains spaces' };
    }

    if (trimmedBarcode.length < 4) {
      return { isValid: false, errorMessage: 'Barcode too short' };
    }

    if (trimmedBarcode.length > 20) {
      return { isValid: false, errorMessage: 'Barcode too long' };
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
      setError(validation.errorMessage || 'Invalid barcode');
      setScanned(true);
      playBeep();
      
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
      playBeep();
      onScanned(barcode);
      
      // Set cooldown period to prevent rapid re-scanning
      scanCooldown.current = setTimeout(() => {
        setScanned(false);
        setIsProcessing(false);
        setPendingBarcode(null);
      }, scanDelay);
    }, 300); // Reduced from 800ms for faster scanning
  };

  useEffect(() => {
    return () => {
      if (holdTimeout.current) clearTimeout(holdTimeout.current);
      if (scanCooldown.current) clearTimeout(scanCooldown.current);
    };
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
      {/* Close button */}
      {onClose && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 40,
            left: 20,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
            padding: 8,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onClose}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.header}>{label}</Text>
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
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerEnabled={true}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 
                    'code128', 'pdf417', 'aztec', 'datamatrix', 'itf14', 'interleaved2of5'
                  ],
                  ...(regionOfInterest && { regionOfInterest })
                }}
              />
              
              {/* Enhanced scanning overlay */}
              {enableRegionOfInterest && (
                <>
                  <View style={styles.scanningFrame} />
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  
                  {/* Scanning animation */}
                  {isProcessing && !hideScanningLine && (
                    <View style={styles.scanningLine} />
                  )}
                </>
              )}

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
      
      {lastScanned && !error && (
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanAreaWrapper: {
    width: width * 0.9,
    height: height * 0.6,
    borderRadius: 20,
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
    top: '35%',
    left: '10%',
    width: '80%',
    height: '30%',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: '35%',
    left: '10%',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: '35%',
    right: '10%',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: '35%',
    left: '10%',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: '35%',
    right: '10%',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanningLine: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    width: '80%',
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