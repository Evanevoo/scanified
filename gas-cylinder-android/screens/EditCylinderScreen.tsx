import logger from '../utils/logger';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function EditCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [cylinder, setCylinder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [ownerType, setOwnerType] = useState('organization');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [bottles, setBottles] = useState([]);
  const [barcodeSuggestions, setBarcodeSuggestions] = useState([]);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);

  // Fetch customers when cylinder is loaded (step 2)
  React.useEffect(() => {
    if (step === 2 && profile?.organization_id) {
      setCustomersLoading(true);
      
      supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', profile.organization_id)
        .order('name')
        .then(({ data, error }) => {
          if (error) {
            logger.log('❌ Error loading customers:', error);
            setCustomersError('Failed to load customers');
          } else {
            logger.log('✅ Loaded customers:', data?.length || 0);
            setCustomers(data || []);
          }
          setCustomersLoading(false);
        });
    }
  }, [step, profile]);

  // Fetch bottles for barcode suggestions
  React.useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from('bottles')
        .select('barcode_number')
        .eq('organization_id', profile.organization_id)
        .order('barcode_number')
        .then(({ data, error }) => {
          if (!error && data) {
            setBottles(data);
          }
        });
    }
  }, [profile]);

  // Set initial owner fields when cylinder is loaded
  React.useEffect(() => {
    if (cylinder) {
      setOwnerType(cylinder?.owner_type || 'organization');
      setOwnerCustomerId(cylinder?.owner_id || '');
      setOwnerName(cylinder?.owner_name || '');
    }
  }, [cylinder]);

  // Filter barcode suggestions
  React.useEffect(() => {
    if (barcode.trim() && bottles.length > 0 && step === 1) {
      const searchText = barcode.toLowerCase();
      const filtered = bottles
        .filter(bottle =>
          bottle.barcode_number &&
          bottle.barcode_number.toLowerCase().includes(searchText) &&
          bottle.barcode_number.toLowerCase() !== searchText
        )
        .slice(0, 5);
      setBarcodeSuggestions(filtered);
      setShowBarcodeSuggestions(filtered.length > 0);
    } else {
      setBarcodeSuggestions([]);
      setShowBarcodeSuggestions(false);
    }
  }, [barcode, bottles, step]);

  const scanDelay = 1500; // ms

  // Step 1: Scan or enter barcode
  const handleBarcodeScanned = (event) => {
    // Only accept barcodes within the border area if boundingBox is available
    const border = {
      top: 0.30, left: 0.05, width: 0.9, height: 0.18
    };
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
        // Barcode is outside the border, ignore
        return;
      }
    }
    setScanned(true);
    setTimeout(() => setScanned(false), scanDelay);
    setBarcode(event.data);
    setScannerVisible(false);
    fetchCylinder(event.data);
  };

  const fetchCylinder = async (barcodeValue) => {
    setLoading(true);
    setError('');
    setCylinder(null);
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('barcode_number', barcodeValue)
      .single();
    setLoading(false);
    if (error || !data) {
      setError(`${assetConfig?.assetDisplayName || 'Asset'} not found.`);
      return;
    }
    setCylinder(data);
    setSerial(data.serial_number || '');
    setStep(2);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    // Check for duplicate barcode or serial (excluding this cylinder)
    const { data: dupBarcode } = await supabase
      .from('bottles')
      .select('id')
      .eq('barcode_number', barcode)
      .neq('id', cylinder?.id)
      .maybeSingle();
    if (dupBarcode) {
      setLoading(false);
      setError('Barcode already exists on another cylinder.');
      return;
    }
    const { data: dupSerial } = await supabase
      .from('bottles')
      .select('id')
      .eq('serial_number', serial)
      .neq('id', cylinder?.id)
      .maybeSingle();
    if (dupSerial) {
      setLoading(false);
      setError('Serial number already exists on another cylinder.');
      return;
    }
    // Update cylinder with ownership fields
    const updateFields = { barcode, serial_number: serial };
    if (ownerType === 'organization') {
      updateFields.owner_type = 'organization';
      updateFields.owner_id = null;
      updateFields.owner_name = '';
      updateFields.assigned_customer = null;
    } else if (ownerType === 'customer') {
      updateFields.owner_type = 'customer';
      updateFields.owner_id = ownerCustomerId;
      const selectedCustomer = customers.find(c => c.CustomerListID === ownerCustomerId);
      updateFields.owner_name = selectedCustomer ? selectedCustomer.name : '';
      updateFields.assigned_customer = ownerCustomerId;
    } else if (ownerType === 'external') {
      updateFields.owner_type = 'external';
      updateFields.owner_id = null;
      updateFields.owner_name = ownerName;
      updateFields.assigned_customer = null;
    }
    const { error: updateError } = await supabase
      .from('bottles')
      .update(updateFields)
      .eq('id', cylinder?.id);
    setLoading(false);
    if (updateError) {
      setError(`Failed to update ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'}.`);
    } else {
      Alert.alert('Success', `${assetConfig?.assetDisplayName || 'Asset'} updated successfully!`);
      setStep(1);
      setBarcode('');
      setSerial('');
      setCylinder(null);
    }
  };

  return (
    <View style={styles.container}>
      {step === 1 && (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <Text style={styles.stepTitle}>Scan or Enter Cylinder Barcode</Text>
          <View style={{ position: 'relative' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter barcode"
                value={barcode}
                onChangeText={setBarcode}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.scanButton} onPress={() => setScannerVisible(true)}>
                <Text style={{ fontSize: 22 }}>📷</Text>
              </TouchableOpacity>
            </View>
            {/* Barcode Suggestions */}
            {showBarcodeSuggestions && barcodeSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={{ maxHeight: 150 }}>
                  {barcodeSuggestions.map((bottle, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setBarcode(bottle.barcode_number);
                        setShowBarcodeSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{bottle.barcode_number}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => fetchCylinder(barcode)}
            disabled={!barcode || loading}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
      {step === 2 && cylinder && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}>
          <Text style={styles.label}>Barcode</Text>
          <TextInput
            style={styles.input}
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Serial Number</Text>
          <TextInput
            style={styles.input}
            value={serial}
            onChangeText={setSerial}
            autoCapitalize="none"
          />
          {/* Ownership Management UI */}
          <Text style={styles.label}>Owner Type</Text>
          <Picker
            selectedValue={ownerType}
            onValueChange={setOwnerType}
            style={{ marginBottom: 12 }}
          >
            <Picker.Item label="Organization" value="organization" />
            <Picker.Item label="Customer" value="customer" />
            <Picker.Item label="External Company" value="external" />
          </Picker>
          {ownerType === 'customer' && (
            <>
              <Text style={styles.label}>Assign to Customer</Text>
              {customersLoading ? (
                <Text>Loading customers...</Text>
              ) : customersError ? (
                <Text style={styles.error}>{customersError}</Text>
              ) : (
                <Picker
                  selectedValue={ownerCustomerId}
                  onValueChange={setOwnerCustomerId}
                  style={{ marginBottom: 12 }}
                >
                  <Picker.Item label="Select a customer..." value="" />
                  {customers.map(c => (
                    <Picker.Item key={c.CustomerListID} label={c.name} value={c.CustomerListID} />
                  ))}
                </Picker>
              )}
            </>
          )}
          {ownerType === 'external' && (
            <>
              <Text style={styles.label}>External Company Name</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter company name"
                autoCapitalize="words"
              />
            </>
          )}
          {/* Show current ownership info */}
          <Text style={styles.label}>Current Ownership</Text>
          <Text style={{ marginBottom: 8 }}>
            {cylinder?.owner_type === 'organization' && 'Organization'}
            {cylinder?.owner_type === 'customer' && `Customer: ${cylinder?.owner_name || cylinder?.assigned_customer}`}
            {cylinder?.owner_type === 'external' && `External: ${cylinder?.owner_name}`}
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>Save</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
      {loading && <ActivityIndicator size="large" color="#40B5AD" style={{ marginTop: 20 }} />}
      {/* Scanner Modal */}
      {scannerVisible && (
        <View style={styles.scannerModal}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.scannerCloseButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.scannerCloseIcon}>←</Text>
          </TouchableOpacity>
          
          {!permission ? (
            <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', marginBottom: 16 }}>Camera access is required to scan barcodes</Text>
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
              }} style={{ backgroundColor: '#40B5AD', padding: 16, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                enableTorch={flashEnabled}
                barcodeScannerEnabled={true}
                barcodeScannerSettings={{}}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
              {/* Overlay border rectangle */}
              <View style={{
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
              }} />
              
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
          <TouchableOpacity 
            onPress={() => setScannerVisible(false)} 
            style={{ 
              position: 'absolute',
              bottom: 50,
              alignSelf: 'center',
              backgroundColor: '#40B5AD', 
              padding: 16, 
              borderRadius: 10,
              zIndex: 1000,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#40B5AD',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  label: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#40B5AD',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
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
  error: {
    color: '#ff5a1f',
    marginTop: 10,
    textAlign: 'center',
  },
  scannerModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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
    top: 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCloseIcon: {
    color: '#374151',
    fontSize: 20,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#ff5a1f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#222',
  },
}); 