import logger from './utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function SimpleCameraTest() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false); // Defer mount to prevent Android crash
  const [scannedData, setScannedData] = useState('');
  const [cameraZoom, setCameraZoom] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan barcodes');
        return;
      }
    }
    setShowCamera(true);
  };

  // Defer CameraView mount (prevents Android crash)
  useEffect(() => {
    if (!showCamera || !permission?.granted) {
      setCameraReady(false);
      return;
    }
    const t = setTimeout(() => setCameraReady(true), 400);
    return () => clearTimeout(t);
  }, [showCamera, permission?.granted]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple Camera Test</Text>
      
      {!showCamera ? (
        <TouchableOpacity style={styles.button} onPress={openCamera}>
          <Text style={styles.buttonText}>Open Camera</Text>
        </TouchableOpacity>
      ) : !cameraReady ? (
        <View style={[styles.cameraContainer, styles.centerContent]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            zoom={cameraZoom}
            enableTorch={flashEnabled}
            autofocus="on"
            onBarcodeScanned={({ data }) => {
              logger.log('🎯 SIMPLE TEST - Barcode detected:', data);
              setScannedData(data);
              Alert.alert('Barcode Detected!', `Data: ${data}`);
              setShowCamera(false);
            }}
            barcodeScannerSettings={{}}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.controlButton, flashEnabled && styles.controlButtonActive]}
              onPress={() => setFlashEnabled((v) => !v)}
            >
              <Text style={styles.controlIcon}>{flashEnabled ? '🔦' : '💡'}</Text>
            </TouchableOpacity>
            <View style={styles.zoomRow}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setCameraZoom((z) => Math.max(0, z - 0.25))}
              >
                <Text style={styles.zoomBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.zoomLabel}>{Math.round(cameraZoom * 100)}%</Text>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setCameraZoom((z) => Math.min(1, z + 0.25))}
              >
                <Text style={styles.zoomBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.controlButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.controlIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overlay}>
            <Text style={styles.instruction}>Align barcode within frame</Text>
          </View>
        </View>
      )}
      
      {scannedData ? (
        <Text style={styles.result}>Last scanned: {scannedData}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 12,
    alignSelf: 'flex-start',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  controlIcon: { fontSize: 20 },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  zoomBtn: { padding: 8 },
  zoomBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  zoomLabel: { color: '#fff', fontSize: 12, minWidth: 36, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  result: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});