import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function LocateCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanDelay = 1500;

  const handleBarCodeScanned = (event: any) => {
    const border = { top: 0.30, left: 0.05, width: 0.9, height: 0.18 };
    if (event?.boundingBox) {
      const { origin, size } = event.boundingBox;
      const centerX = origin.x + size.width / 2;
      const centerY = origin.y + size.height / 2;
      if (
        centerX < border.left ||
        centerX > border.left + border.width ||
        centerY < border.top ||
        centerY > border.top + border.height
      ) {
        return;
      }
    }
    setScanned(true);
    setTimeout(() => setScanned(false), scanDelay);
    setBarcode(event.data);
    setScannerVisible(false);
    fetchAsset(event.data, 'barcode');
  };

  const fetchAsset = async (value: string, mode: 'barcode' | 'serial') => {
    if (!profile?.organization_id && !authLoading) {
      setError('Organization not found');
      return;
    }

    setLoading(true);
    setError('');
    setAsset(null);
    
    // Simple query - bottles table already has customer_name field
    let query = supabase
      .from('bottles')
      .select('*')
      .eq('organization_id', profile.organization_id);
      
    if (mode === 'barcode') query = query.eq('barcode_number', value);
    else query = query.eq('serial_number', value);
    
    const { data, error } = await query.single();
    setLoading(false);
    if (error || !data) {
      setError(`${assetConfig.assetDisplayName} not found.`);
      return;
    }
    setAsset(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Enter or scan a barcode or serial number to search for {assetConfig.assetDisplayName?.toLowerCase() || 'asset'} details
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Barcode Number"
          value={barcode}
          onChangeText={setBarcode}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanBtnText}>📷</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ textAlign: 'center', marginVertical: 8 }}>or</Text>
      <TextInput
        style={styles.input}
        placeholder="Serial Number"
        value={serial}
        onChangeText={setSerial}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={() => {
          if (barcode) fetchAsset(barcode, 'barcode');
          else if (serial) fetchAsset(serial, 'serial');
          else setError('Enter barcode or serial number.');
        }}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Search</Text>}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {asset && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>{assetConfig.assetDisplayName} Details</Text>
          <Text style={styles.detailsLabel}>Barcode: <Text style={styles.detailsValue}>{asset.barcode_number}</Text></Text>
          <Text style={styles.detailsLabel}>Serial: <Text style={styles.detailsValue}>{asset.serial_number}</Text></Text>
          <Text style={styles.detailsLabel}>Type: <Text style={styles.detailsValue}>{asset.group_name}</Text></Text>
          <Text style={styles.detailsLabel}>Status: <Text style={styles.detailsValue}>{asset.status || 'Unknown'}</Text></Text>
          <Text style={styles.detailsLabel}>Location: <Text style={styles.detailsValue}>{asset.customer_name || 'Warehouse'}</Text></Text>
          <Text style={styles.detailsLabel}>Assigned To: <Text style={styles.detailsValue}>{asset.customer_name || 'N/A'}</Text></Text>
        </View>
      )}
      {/* Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.scannerCloseButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.scannerCloseIcon}>✕</Text>
          </TouchableOpacity>

          {!permission ? (
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Camera access is required to scan barcodes</Text>
              <TouchableOpacity onPress={async () => {
                const result = await requestPermission();
                if (!result.granted && result.canAskAgain === false) {
                  Alert.alert(
                    'Camera Permission',
                    'Please enable camera access in your device settings to use the scanner.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                  );
                }
              }} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                enableTorch={flashEnabled}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{}}
              />
              {/* Overlay border rectangle */}
              <View style={styles.scanOverlay} />
              
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
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanBtn: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  submitBtn: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#ff5a1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginTop: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#40B5AD',
    marginBottom: 8,
  },
  detailsLabel: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  detailsValue: {
    fontWeight: 'normal',
    color: '#444',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#40B5AD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: '30%',
    left: '5%',
    width: '90%',
    height: '18%',
    borderWidth: 3,
    borderColor: '#40B5AD',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 10,
  },
  flashButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCloseButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCloseIcon: {
    color: '#374151',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 