import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScanCylindersScreen() {
  const [search, setSearch] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [customerBarcodeError, setCustomerBarcodeError] = useState('');
  const navigation = useNavigation();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'customer' | 'order' | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanDelay = 1500; // ms
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .select('name, barcode, CustomerListID');
      if (error) {
        setError('Failed to load customers');
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (scannerVisible) {
      setScanned(false);
    }
  }, [scannerVisible]);

  const filteredCustomers = customers.filter(c =>
    (c.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (c.barcode?.startsWith('%') && c.barcode?.toLowerCase().includes(search.toLowerCase()))
  );

  const orderNumberValid = /^[A-Za-z0-9]+$/.test(orderNumber);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan or Search for Customer</Text>
      <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Search customer name or scan barcode"
          value={search}
          onChangeText={text => {
            setSearch(text);
            setCustomerBarcodeError('');
          }}
        />
        {/* Customer not found popup */}
        {showCustomerPopup && (
          <View style={{
            position: 'absolute',
            top: 40,
            left: 0,
            right: 0,
            zIndex: 100,
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#ff5a1f',
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 16,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>This customer does not exist.</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => { setScannerTarget('customer'); setScannerVisible(true); }}
        >
          <Text style={styles.scanIcon}>📷</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 16 }} />
      ) : error ? (
        <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text>
      ) : (
        search.trim().length > 0 && (
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item.CustomerListID}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.customerItem, selectedCustomer?.CustomerListID === item.CustomerListID && styles.selectedCustomer]}
                onPress={() => {
                  setSelectedCustomer(item);
                  setSearch(item.name || '');
                }}
              >
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerBarcode}>{item.barcode}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 180, marginBottom: 16 }}
          />
        )
      )}
      <Text style={styles.title}>Order Number</Text>
      <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Enter or scan order number (letters and/or numbers)"
          value={orderNumber}
          onChangeText={text => {
            setOrderNumber(text);
            setOrderError('');
          }}
        />
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => { setScannerTarget('order'); setScannerVisible(true); }}
        >
          <Text style={styles.scanIcon}>📷</Text>
        </TouchableOpacity>
      </View>
      {!orderNumberValid && orderNumber.length > 0 && (
        <Text style={{ color: 'red', marginBottom: 8 }}>
          Order number must contain only letters and/or numbers.
        </Text>
      )}
      <TouchableOpacity
        style={[styles.nextButton, !(selectedCustomer && orderNumberValid) && styles.nextButtonDisabled]}
        disabled={!(selectedCustomer && orderNumberValid)}
        onPress={() => {
          if (selectedCustomer && orderNumberValid) {
            navigation.navigate('ScanCylindersAction', {
              customer: selectedCustomer,
              orderNumber,
            });
          } else if (!orderNumberValid) {
            setOrderError('Order number must contain only letters and/or numbers.');
          }
        }}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
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
            <View style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : (event) => {
                  // Only accept barcodes within the border area if boundingBox is available
                  const border = {
                    // These percentages match the overlay border: top 41%, left 5%, width 90%, height 18%
                    top: 0.41, left: 0.05, width: 0.9, height: 0.18
                  };
                  if (event?.boundingBox) {
                    const { origin, size } = event.boundingBox;
                    // boundingBox origin and size are in relative coordinates (0-1) or pixels depending on API
                    // We'll assume relative (0-1) for Expo CameraView
                    const centerX = origin.x + size.width / 2;
                    const centerY = origin.y + size.height / 2;
                    if (
                      centerX < border.left ||
                      centerX > border.left + border.width ||
                      centerY < border.top ||
                      centerY > border.top + border.height
                    ) {
                      // Barcode is outside the border, ignore
                      return;
                    }
                  } else {
                    // If boundingBox is not available, we cannot restrict by area
                    // TODO: Expo CameraView may not provide boundingBox for all barcode types/platforms
                    // This is a limitation of the current API
                  }
                  setScanned(true);
                  setTimeout(() => setScanned(false), scanDelay);
                  setScannerVisible(false);
                  if (scannerTarget === 'customer') {
                    let normalized = event.data.trim();
                    // Remove all non-alphanumeric characters for comparison
                    const alphanum = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
                    const scannedAlphanum = alphanum(normalized);
                    console.log('RAW SCANNED:', JSON.stringify(event.data), 'LEN:', event.data.length);
                    console.log('NORMALIZED SCANNED:', scannedAlphanum, 'LEN:', scannedAlphanum.length);
                    let found = false;
                    customers.forEach(c => {
                      const dbAlphanum = alphanum(c.barcode);
                      console.log('DB:', dbAlphanum, 'LEN:', dbAlphanum.length, '| Customer:', c.name);
                      if (scannedAlphanum && dbAlphanum === scannedAlphanum) found = true;
                    });
                    const match = customers.find(c => scannedAlphanum && alphanum(c.barcode) === scannedAlphanum);
                    if (match) {
                      console.log('MATCH FOUND:', match.name);
                      setSelectedCustomer(match);
                      setSearch(match.name || '');
                      setCustomerBarcodeError('');
                    } else {
                      console.log('NO MATCH FOUND');
                      setSelectedCustomer(null);
                      setSearch('');
                      setCustomerBarcodeError('This customer does not exist.');
                      setShowCustomerPopup(true);
                      setTimeout(() => setShowCustomerPopup(false), 2500);
                    }
                  } else if (scannerTarget === 'order') {
                    setOrderNumber(event.data);
                  }
                }}
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
                    'interleaved2of5',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2563eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  customerItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCustomer: {
    borderColor: '#2563eb',
    backgroundColor: '#e0e7ff',
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  customerBarcode: {
    fontSize: 13,
    color: '#888',
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#e0e7ff',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  scanButton: {
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    padding: 10,
    marginLeft: 8,
  },
  scanIcon: {
    fontSize: 20,
  },
}); 