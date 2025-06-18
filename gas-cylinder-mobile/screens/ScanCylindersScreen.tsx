import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import ScanArea from '../components/ScanArea';

const { width, height } = Dimensions.get('window');

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
  const { colors } = useTheme();
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
    
    // Enhanced filtering to handle both 'A' and 'a' endings
    const startsWith = customers.filter(c => (c.name?.toLowerCase() || '').startsWith(lower));
    const contains = customers.filter(c =>
      (c.name?.toLowerCase() || '').includes(lower) && !(c.name?.toLowerCase() || '').startsWith(lower)
    );
    
    // Barcode matching with case-insensitive handling
    const barcodeMatches = customers.filter(c => {
      if (!c.barcode) return false;
      
      const customerBarcode = c.barcode.trim();
      const searchBarcode = search.trim();
      
      // Exact match
      if (customerBarcode === searchBarcode) return true;
      
      // Handle case variations for barcodes ending with 'A' or 'a'
      if (searchBarcode.endsWith('A') || searchBarcode.endsWith('a')) {
        const baseBarcode = searchBarcode.slice(0, -1);
        const uppercaseVersion = baseBarcode + 'A';
        const lowercaseVersion = baseBarcode + 'a';
        
        return customerBarcode === uppercaseVersion || customerBarcode === lowercaseVersion;
      }
      
      // Case-insensitive partial match
      return customerBarcode.toLowerCase().includes(searchBarcode.toLowerCase());
    });
    
    // Combine all matches, removing duplicates
    const allMatches = [...startsWith, ...contains, ...barcodeMatches];
    const uniqueMatches = allMatches.filter((customer, index, self) => 
      index === self.findIndex(c => c.CustomerListID === customer.CustomerListID)
    );
    
    return uniqueMatches;
  })();

  const orderNumberValid = /^[A-Za-z0-9]+$/.test(orderNumber);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, (showCustomerScan || showOrderScan) && styles.fullscreenContainer]}>
      {showCustomerScan ? (
        <View style={styles.fullscreenWrapper}>
          <CameraView
            style={styles.fullscreenCamera}
            facing="back"
            onBarcodeScanned={(event) => {
              const barcode = event.data.trim();
              if (barcode) {
                // Normalize barcode to handle both 'A' and 'a' endings
                let normalizedBarcode = barcode;
                
                // If barcode ends with 'a', try both 'a' and 'A' versions
                if (barcode.endsWith('a')) {
                  const uppercaseVersion = barcode.slice(0, -1) + 'A';
                  // Check if uppercase version exists in customers
                  const uppercaseMatch = customers.find(c => 
                    c.barcode && c.barcode.trim() === uppercaseVersion
                  );
                  if (uppercaseMatch) {
                    normalizedBarcode = uppercaseVersion;
                  }
                }
                // If barcode ends with 'A', try both 'A' and 'a' versions
                else if (barcode.endsWith('A')) {
                  const lowercaseVersion = barcode.slice(0, -1) + 'a';
                  // Check if lowercase version exists in customers
                  const lowercaseMatch = customers.find(c => 
                    c.barcode && c.barcode.trim() === lowercaseVersion
                  );
                  if (lowercaseMatch) {
                    normalizedBarcode = lowercaseVersion;
                  }
                }
                
                setSearch(normalizedBarcode);
                setShowCustomerScan(false);
              }
            }}
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
          <View style={styles.scanRectangle} />
          <View style={styles.scanAreaOverlay} />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowCustomerScan(false)}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      ) : showOrderScan ? (
        <View style={styles.fullscreenWrapper}>
          <CameraView
            style={styles.fullscreenCamera}
            facing="back"
            onBarcodeScanned={(event) => {
              const barcode = event.data.trim();
              if (barcode) {
                setOrderNumber(barcode);
                setShowOrderScan(false);
              }
            }}
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
          <View style={styles.scanRectangle} />
          <View style={styles.scanAreaOverlay} />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowOrderScan(false)}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.primary }]}>Scan or Search for Customer</Text>
          <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Search customer name or scan barcode"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={text => {
                setSearch(text);
                setCustomerBarcodeError('');
                setSelectedCustomer(null); // Clear selection when typing
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
                  backgroundColor: colors.error,
                  paddingVertical: 12,
                  paddingHorizontal: 28,
                  borderRadius: 16,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <Text style={{ color: colors.surface, fontWeight: 'bold', fontSize: 16 }}>This customer does not exist.</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCustomerScan(true)}
            >
              <Text style={styles.scanIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Suggestions Dropdown */}
          {search.trim() && !selectedCustomer && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {loading ? (
                <View style={styles.suggestionItem}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>Loading customers...</Text>
                </View>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.slice(0, 10).map((customer) => (
                  <TouchableOpacity
                    key={customer.CustomerListID}
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setSearch(customer.name);
                    }}
                  >
                    <Text style={[styles.suggestionName, { color: colors.text }]}>{customer.name}</Text>
                    {customer.barcode && (
                      <Text style={[styles.suggestionBarcode, { color: colors.textSecondary }]}>Barcode: {customer.barcode}</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.suggestionItem}>
                  <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>No customers found</Text>
                </View>
              )}
            </View>
          )}

          {/* Selected Customer Display */}
          {selectedCustomer && (
            <View style={[styles.customerItem, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.customerName, { color: colors.text }]}>✓ {selectedCustomer.name}</Text>
              {selectedCustomer.barcode && (
                <Text style={[styles.customerBarcode, { color: colors.textSecondary }]}>Barcode: {selectedCustomer.barcode}</Text>
              )}
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setSelectedCustomer(null);
                  setSearch('');
                }}
              >
                <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.title, { color: colors.primary }]}>Order Number</Text>
          <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter or scan order number (letters and/or numbers)"
              placeholderTextColor={colors.textSecondary}
              value={orderNumber}
              onChangeText={text => {
                setOrderNumber(text);
                setOrderError('');
              }}
            />
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowOrderScan(true)}
            >
              <Text style={styles.scanIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          {!orderNumberValid && orderNumber.length > 0 && (
            <Text style={{ color: colors.error, marginBottom: 8 }}>
              Order number must contain only letters and/or numbers.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }, !(selectedCustomer && orderNumberValid) && { backgroundColor: colors.border }]}
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
            <Text style={[styles.nextButtonText, { color: colors.surface }]}>Next</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  customerItem: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  customerBarcode: {
    fontSize: 13,
  },
  nextButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  scanButton: {
    borderRadius: 10,
    padding: 10,
    marginLeft: 8,
  },
  scanIcon: {
    fontSize: 20,
  },
  suggestionsContainer: {
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 200,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 8,
  },
  suggestionName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  suggestionBarcode: {
    fontSize: 13,
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenContainer: {
    padding: 0,
    backgroundColor: '#000',
  },
  fullscreenScanArea: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  fullscreenWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCamera: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scanRectangle: {
    position: 'absolute',
    top: '40%',
    left: '7.5%',
    width: '85%',
    height: '20%',
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
  scanAreaOverlay: {
    position: 'absolute',
    top: '40%',
    left: '7.5%',
    width: '85%',
    height: '20%',
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
}); 