import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const CameraTest = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    Alert.alert('Barcode Scanned!', `Data: ${data}`, [
      { text: 'OK', onPress: () => setScanned(false) }
    ]);
  };

  if (!permission) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        zoom={cameraZoom}
        enableTorch={flashEnabled}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerEnabled={true}
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
      </View>
      <View style={styles.overlay}>
        <Text style={styles.instruction}>Point camera at barcode</Text>
      </View>
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
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraTest;
