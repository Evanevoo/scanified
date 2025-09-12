import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  const scanDelay = 1500;

  const handleBarCodeScanned = (event: any) => {
    const border = { top: 0.41, left: 0.05, width: 0.9, height: 0.18 };
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
    if (!profile?.organization_id) {
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
      {/* Header with Return Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Locate {assetConfig.assetDisplayName}</Text>
        <View style={styles.headerSpacer} />
      </View>
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Locate</Text>}
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
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.modalBackIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scan Barcode</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

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
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 'code128', 'pdf417', 'aztec', 'datamatrix', 'itf14',
                  ],
                  regionOfInterest: {
                    x: 0.075, // 7.5% from left
                    y: 0.4,   // 40% from top
                    width: 0.85, // 85% width
                    height: 0.2, // 20% height
                  },
                }}
              />
              {/* Overlay border rectangle */}
              <View style={styles.scanOverlay} />
              {/* Darken area outside border */}
              <View style={styles.overlayTop} />
              <View style={styles.overlayBottom} />
              <View style={styles.overlayLeft} />
              <View style={styles.overlayRight} />
            </View>
          )}
          
          {/* Close Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close Scanner</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    flex: 1,
  },
  scanBtn: {
    backgroundColor: '#2563eb',
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
    backgroundColor: '#2563eb',
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
    color: '#2563eb',
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
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
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
    backgroundColor: '#2563eb',
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
    top: '41%',
    left: '5%',
    width: '90%',
    height: '18%',
    borderWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 10,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '25%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayBottom: {
    position: 'absolute',
    top: '75%',
    left: 0,
    width: '100%',
    height: '25%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayLeft: {
    position: 'absolute',
    top: '25%',
    left: 0,
    width: '10%',
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayRight: {
    position: 'absolute',
    top: '25%',
    right: 0,
    width: '10%',
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 