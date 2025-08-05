import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAssetConfig } from '../context/AssetContext';

export default function LocateCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
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
    setLoading(true);
    setError('');
    setAsset(null);
    let query = supabase.from('assets').select('*');
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
      <Text style={styles.title}>Locate {assetConfig.assetDisplayName}</Text>
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
          <Text style={styles.detailsLabel}>Location: <Text style={styles.detailsValue}>{asset.assigned_customer || 'Warehouse'}</Text></Text>
          <Text style={styles.detailsLabel}>Assigned To: <Text style={styles.detailsValue}>{asset.assigned_customer || 'N/A'}</Text></Text>
        </View>
      )}
      {/* Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          {!permission ? (
            <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', marginBottom: 16 }}>We need your permission to show the camera</Text>
              <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code39',
                    'code93',
                    'code128',
                    'itf14',
                  ],
                }}
              />
              {/* Overlay border rectangle */}
              <View style={{
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
              }} />
              {/* Optional: darken area outside border */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '25%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '75%', left: 0, width: '100%', height: '25%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '25%', left: 0, width: '10%', height: '50%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '25%', right: 0, width: '10%', height: '50%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
            </View>
          )}
          <TouchableOpacity onPress={() => setScannerVisible(false)} style={{ marginTop: 24, backgroundColor: '#2563eb', padding: 16, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
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
}); 