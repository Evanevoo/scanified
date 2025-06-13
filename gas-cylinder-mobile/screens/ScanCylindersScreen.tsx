import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScanArea from '../components/ScanArea';

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
  const [showCustomerScan, setShowCustomerScan] = useState(false);
  const [showOrderScan, setShowOrderScan] = useState(false);

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

  const filteredCustomers = (() => {
    if (!search.trim()) return customers;
    const lower = search.toLowerCase();
    const startsWith = customers.filter(c => (c.name?.toLowerCase() || '').startsWith(lower));
    const contains = customers.filter(c =>
      (c.name?.toLowerCase() || '').includes(lower) && !(c.name?.toLowerCase() || '').startsWith(lower)
    );
    return [...startsWith, ...contains];
  })();

  const orderNumberValid = /^[A-Za-z0-9]+$/.test(orderNumber);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan or Search for Customer</Text>
      {showCustomerScan ? (
        <ScanArea
          onScanned={barcode => {
            setSearch(barcode);
            setShowCustomerScan(false);
          }}
          label="SCAN CUSTOMER BARCODE"
        />
      ) : (
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
            onPress={() => setShowCustomerScan(true)}
          >
            <Text style={styles.scanIcon}>📷</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.title}>Order Number</Text>
      {showOrderScan ? (
        <ScanArea
          onScanned={barcode => {
            setOrderNumber(barcode);
            setShowOrderScan(false);
          }}
          label="SCAN ORDER NUMBER"
        />
      ) : (
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
            onPress={() => setShowOrderScan(true)}
          >
            <Text style={styles.scanIcon}>📷</Text>
          </TouchableOpacity>
        </View>
      )}
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