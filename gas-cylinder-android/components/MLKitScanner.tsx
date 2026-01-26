/**
 * MLKitScanner - Barcode scanner with automatic OCR fallback
 * If no barcode detected after 3 seconds, tries to read text
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import TextRecognition from '@react-native-ml-kit/text-recognition';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FRAME_WIDTH = 300;
const FRAME_HEIGHT = 120;
const FRAME_TOP = SCREEN_HEIGHT * 0.28;

// Time before OCR fallback kicks in (ms)
const OCR_FALLBACK_DELAY = 3000;
// Cooldown between OCR attempts (ms)
const OCR_COOLDOWN = 2000;

interface MLKitScannerProps {
  onBarcodeScanned: (data: string, result?: { format: string; confidence: number }) => void;
  onTextFound?: (text: string, possibleNames: string[]) => void;
  onClose?: () => void;
  enabled?: boolean;
  batchMode?: boolean;
  title?: string;
  subtitle?: string;
}

const MLKitScanner: React.FC<MLKitScannerProps> = ({
  onBarcodeScanned,
  onTextFound,
  onClose,
  enabled = true,
  batchMode = false,
  title = 'Scan Barcode',
  subtitle = 'Align barcode within frame',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanCount, setScanCount] = useState(0);
  const [lastBarcode, setLastBarcode] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'scanning' | 'reading'>('idle');
  const [foundText, setFoundText] = useState('');
  
  const cameraRef = useRef<any>(null);
  const lastScannedRef = useRef('');
  const lastTimeRef = useRef(0);
  const ocrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOcrTimeRef = useRef(0);
  const isProcessingOcrRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (ocrTimerRef.current) {
        clearTimeout(ocrTimerRef.current);
      }
    };
  }, []);

  // Start OCR timer when camera is ready
  useEffect(() => {
    if (isReady && enabled && !batchMode) {
      startOcrTimer();
    }
    return () => {
      if (ocrTimerRef.current) {
        clearTimeout(ocrTimerRef.current);
      }
    };
  }, [isReady, enabled, batchMode]);

  const startOcrTimer = useCallback(() => {
    if (ocrTimerRef.current) {
      clearTimeout(ocrTimerRef.current);
    }
    
    ocrTimerRef.current = setTimeout(() => {
      tryOcr();
    }, OCR_FALLBACK_DELAY);
  }, []);

  const resetOcrTimer = useCallback(() => {
    if (ocrTimerRef.current) {
      clearTimeout(ocrTimerRef.current);
    }
    if (enabled && !batchMode) {
      startOcrTimer();
    }
  }, [enabled, batchMode, startOcrTimer]);

  // Try OCR text recognition
  const tryOcr = useCallback(async () => {
    if (!cameraRef.current || isProcessingOcrRef.current || !enabled) return;
    
    const now = Date.now();
    if (now - lastOcrTimeRef.current < OCR_COOLDOWN) {
      // Too soon, try again later
      startOcrTimer();
      return;
    }

    try {
      isProcessingOcrRef.current = true;
      setOcrStatus('reading');
      console.log('📷 Taking photo for OCR...');

      // Take photo silently
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.uri) {
        console.log('❌ No photo captured');
        isProcessingOcrRef.current = false;
        setOcrStatus('scanning');
        startOcrTimer();
        return;
      }

      console.log('🔍 Running text recognition...');
      const result = await TextRecognition.recognize(photo.uri);
      lastOcrTimeRef.current = Date.now();

      if (result?.text) {
        console.log('📝 OCR found text:', result.text.substring(0, 100));
        
        // Extract potential customer names (lines that look like names/companies)
        const lines = result.text.split('\n').filter(line => {
          const cleaned = line.trim();
          // Filter for lines that look like names (2+ words, mostly letters)
          return cleaned.length >= 3 && 
                 cleaned.length <= 50 &&
                 /^[A-Za-z\s&'.-]+$/.test(cleaned) &&
                 cleaned.split(/\s+/).length >= 1;
        });

        const possibleNames = lines.map(l => l.trim().toUpperCase());
        
        if (possibleNames.length > 0) {
          console.log('👤 Possible names found:', possibleNames);
          setFoundText(possibleNames[0]);
          
          if (onTextFound) {
            onTextFound(result.text, possibleNames);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ OCR error:', error);
    } finally {
      isProcessingOcrRef.current = false;
      setOcrStatus('scanning');
      // Continue trying OCR periodically
      startOcrTimer();
    }
  }, [enabled, onTextFound, startOcrTimer]);

  const handleBarcode = useCallback((event: any) => {
    if (!enabled || !event.data) return;
    
    let barcode = event.data.trim().replace(/^\*+|\*+$/g, '');
    if (!barcode) return;
    
    // VALIDATION FOR 1D BARCODES ON PAPER (2025-01-24)
    // Reject if it looks like random text/numbers (OCR errors)
    // 1D barcodes typically have minimum length and contain alphanumeric characters
    // Reject very short codes (< 3 chars) or very long codes (> 50 chars) that might be OCR errors
    if (barcode.length < 3 || barcode.length > 50) {
      console.log('📷 Rejected: Invalid barcode length:', barcode.length);
      return;
    }
    
    // Reject if it's just numbers and too short (likely OCR error from random text)
    // But allow longer numeric codes (like 9-digit cylinder IDs)
    if (/^\d+$/.test(barcode) && barcode.length < 6) {
      console.log('📷 Rejected: Too short numeric code (likely OCR error):', barcode);
      return;
    }
    // END VALIDATION
    
    const now = Date.now();
    const cooldown = batchMode ? 500 : 2000;
    
    if (barcode === lastScannedRef.current && (now - lastTimeRef.current) < cooldown) {
      return;
    }
    
    // Reset OCR timer since barcode was found
    resetOcrTimer();
    setOcrStatus('idle');
    setFoundText('');
    
    lastScannedRef.current = barcode;
    lastTimeRef.current = now;
    setLastBarcode(barcode);
    setScanCount(c => c + 1);
    
    console.log('✅ SCANNED:', barcode, 'Type:', event.type);
    
    onBarcodeScanned(barcode, {
      format: event.type || 'unknown',
      confidence: 100,
    });
  }, [enabled, batchMode, onBarcodeScanned, resetOcrTimer]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#40B5AD" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#EF4444" />
        <Text style={styles.permTitle}>Camera Permission Needed</Text>
        <Text style={styles.permText}>Allow camera access to scan barcodes</Text>
        <TouchableOpacity 
          style={styles.permButton} 
          onPress={() => permission.canAskAgain ? requestPermission() : Linking.openSettings()}
        >
          <Text style={styles.permButtonText}>
            {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={enabled ? handleBarcode : undefined}
        barcodeScannerSettings={{
          // OPTIMIZED FOR 1D BARCODES ON PAPER (2025-01-24)
          // Removed 2D types (qr, datamatrix, pdf417, aztec) to reduce false positives from text patterns
          // Focus on 1D barcode types commonly found on paper receipts/documents
          barcodeTypes: [
            'code128',    // 1D: Most common for receipts, cylinder IDs
            'code39',     // 1D: Sales receipts (e.g. %80000809-1657573726A)
            'code93',     // 1D: Alternative format
            'codabar',    // 1D: Variable length (e.g. 9-digit cylinders)
            'ean13',      // 1D: 13-digit retail codes
            'ean8',       // 1D: 8-digit retail codes
            'upc_a',      // 1D: 12-digit UPC-A
            'upc_e',      // 1D: 6-8 digit UPC-E
            'itf14',      // 1D: 14-digit shipping codes
            // REMOVED 2D TYPES TO REDUCE FALSE POSITIVES:
            // 'qr', 'datamatrix', 'pdf417', 'aztec'
          ],
        }}
        onCameraReady={() => {
          console.log('📷 Camera ready');
          setIsReady(true);
          setOcrStatus('scanning');
        }}
      />

      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.topArea}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>

        <View style={[styles.frameWrapper, { top: FRAME_TOP }]}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.scanLine} />
          </View>
        </View>

        <View style={[styles.statusArea, { top: FRAME_TOP + FRAME_HEIGHT + 20 }]}>
          <Text style={styles.statusLabel}>
            {!isReady ? '⏳ Starting...' : 
             ocrStatus === 'reading' ? '📝 Reading text...' :
             batchMode ? '🔄 CONTINUOUS' : '✓ READY'}
          </Text>
          
          {foundText && !lastBarcode && (
            <View style={styles.ocrBox}>
              <Ionicons name="text" size={16} color="#FFF" />
              <Text style={styles.ocrText}>Found: {foundText}</Text>
            </View>
          )}
          
          {scanCount > 0 && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                {lastBarcode.length > 20 ? lastBarcode.slice(0, 20) + '...' : lastBarcode}
              </Text>
              <Text style={styles.countText}>Scanned: {scanCount}</Text>
            </View>
          )}
        </View>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFF" />
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
  center: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 16,
  },
  permTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  permText: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  permButton: {
    backgroundColor: '#40B5AD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 16,
    padding: 12,
  },
  cancelText: {
    color: '#888',
    fontSize: 14,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  topArea: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  subtitleText: {
    color: '#DDD',
    fontSize: 14,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  frameWrapper: {
    position: 'absolute',
    left: (SCREEN_WIDTH - FRAME_WIDTH) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 3,
    borderColor: '#40B5AD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: -3,
    left: -3,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: -3,
    right: -3,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    width: '80%',
    height: 2,
    backgroundColor: '#40B5AD',
  },
  statusArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusLabel: {
    color: '#40B5AD',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ocrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
  },
  ocrText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: 'rgba(64, 181, 173, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  resultText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  countText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

export default MLKitScanner;
