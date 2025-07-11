import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Vibration, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface ScanAreaProps {
  onScanned: (barcode: string) => void;
  label?: string;
  style?: any;
  barcodePreview?: string;
}

const ScanArea: React.FC<ScanAreaProps> = ({ onScanned, label = 'SCAN HERE', style, barcodePreview }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);

  const playBeep = async () => {
    try {
      // Just use vibration for now - more reliable than audio files
      Vibration.vibrate(80);
    } catch (e) {
      // If vibration fails, just continue silently
      console.log('Vibration failed:', e);
    }
  };

  const handleBarcodeScanned = (event: any) => {
    const barcode = event.data.trim();
    if (!barcode) return;

    // If the same barcode is detected, do nothing (wait for hold)
    if (pendingBarcode === barcode) {
      return;
    }

    setPendingBarcode(barcode);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);

    // Require the barcode to be stable for 800ms before accepting
    holdTimeout.current = setTimeout(() => {
      setScanned(true);
      setLastScanned(barcode);
      playBeep();
      onScanned(barcode);
      setTimeout(() => setScanned(false), 1500); // Increase cooldown
      setPendingBarcode(null);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (holdTimeout.current) clearTimeout(holdTimeout.current);
    };
  }, []);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.header}>{label}</Text>
      <View style={styles.scanAreaWrapper}>
        <View style={styles.scanAreaBox}> 
          {!permission ? (
            <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', marginBottom: 16 }}>We need your permission to show the camera</Text>
              <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 'code128', 'pdf417', 'aztec', 'datamatrix', 'itf14',
                  ],
                }}
              />
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {barcodePreview ? (
                <View style={styles.barcodePreviewBox}>
                  <Text style={styles.barcodePreviewText}>{barcodePreview}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
      {lastScanned ? (
        <Text style={styles.lastScanned}>Last scanned: {lastScanned}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const bracketSize = 32;
const bracketThickness = 5;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
    letterSpacing: 1,
  },
  scanAreaWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAreaBox: { 
    flex: 1,
    width: '100%', 
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    width: bracketSize,
    height: bracketSize,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: bracketThickness,
    borderLeftWidth: bracketThickness,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: bracketThickness,
    borderRightWidth: bracketThickness,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: bracketThickness,
    borderLeftWidth: bracketThickness,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: bracketThickness,
    borderRightWidth: bracketThickness,
    borderBottomRightRadius: 16,
  },
  barcodePreviewBox: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 8,
  },
  barcodePreviewText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 2,
  },
  lastScanned: {
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  error: {
    color: '#ff5a1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
});

export default ScanArea; 