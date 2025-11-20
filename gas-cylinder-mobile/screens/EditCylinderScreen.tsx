import logger from '../utils/logger';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function EditCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [cylinder, setCylinder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [ownerType, setOwnerType] = useState('organization');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Fetch customers and locations when cylinder is loaded (step 2)
  React.useEffect(() => {
    if (step === 2 && profile?.organization_id) {
      setCustomersLoading(true);
      setLocationsLoading(true);
      
      // Fetch customers
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

      // Fetch locations
      supabase
        .from('locations')
        .select('id, name, province')
        .order('name')
        .then(({ data, error }) => {
          if (error) {
            logger.log('❌ Error loading locations:', error);
            setLocationsError('Failed to load locations');
            // Fallback to hardcoded locations
            setLocations([
              { id: 'saskatoon', name: 'Saskatoon', province: 'Saskatchewan' },
              { id: 'regina', name: 'Regina', province: 'Saskatchewan' },
              { id: 'chilliwack', name: 'Chilliwack', province: 'British Columbia' },
              { id: 'prince-george', name: 'Prince George', province: 'British Columbia' }
            ]);
          } else {
            logger.log('✅ Loaded locations:', data?.length || 0);
            setLocations(data || []);
          }
          setLocationsLoading(false);
        });
    }
  }, [step, profile]);

  // Initialize barcode from route params if provided
  React.useEffect(() => {
    const routeBarcode = (route.params as any)?.barcode;
    if (routeBarcode) {
      setBarcode(routeBarcode);
      fetchCylinder(routeBarcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set initial owner fields and location when cylinder is loaded
  React.useEffect(() => {
    if (cylinder) {
      setBarcode(cylinder.barcode_number || barcode);
      setSerial(cylinder.serial_number || serial);
      setOwnerType(cylinder?.owner_type || 'organization');
      setOwnerCustomerId(cylinder?.owner_id || '');
      setOwnerName(cylinder?.owner_name || '');
      setSelectedLocation(cylinder?.location || '');
    }
  }, [cylinder]);

  const scanDelay = 1500; // ms

  // Step 1: Scan or enter barcode
  const handleBarcodeScanned = (event) => {
    // Only accept barcodes within the border area if boundingBox is available
    const border = {
      top: 0.41, left: 0.05, width: 0.9, height: 0.18
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
    // Update cylinder with ownership fields and location
    const updateFields = { 
      barcode, 
      serial_number: serial,
      location: selectedLocation 
    };
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

  // Get current ownership display text
  const getCurrentOwnershipText = () => {
    if (!cylinder) return 'Not set';
    if (cylinder.owner_type === 'organization') return 'Organization';
    if (cylinder.owner_type === 'customer') {
      const customerName = cylinder.owner_name || 
        (cylinder.assigned_customer && customers.find(c => c.CustomerListID === cylinder.assigned_customer)?.name) ||
        cylinder.assigned_customer;
      return customerName ? `Customer: ${customerName}` : 'Customer (not specified)';
    }
    if (cylinder.owner_type === 'external') {
      return cylinder.owner_name ? `External: ${cylinder.owner_name}` : 'External (not specified)';
    }
    return cylinder.ownership || 'Not set';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>Scan or Enter Cylinder Barcode</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter barcode"
              placeholderTextColor={colors.textSecondary}
              value={barcode}
              onChangeText={setBarcode}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={[styles.scanButton, { backgroundColor: colors.primary }]} 
              onPress={() => setScannerVisible(true)}
            >
              <Text style={{ fontSize: 22 }}>📷</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchCylinder(barcode)}
            disabled={!barcode || loading}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </ScrollView>
      )}
      {step === 2 && cylinder && (
        <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Barcode</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={barcode}
                onChangeText={setBarcode}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Serial Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={serial}
                onChangeText={setSerial}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Location</Text>
            
            <View style={styles.inputGroup}>
              {locationsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>Loading locations...</Text>
                </View>
              ) : locationsError ? (
                <Text style={[styles.error, { color: colors.error }]}>{locationsError}</Text>
              ) : (
                <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Picker
                    selectedValue={selectedLocation}
                    onValueChange={setSelectedLocation}
                    style={[styles.picker, { color: colors.text }]}
                  >
                    <Picker.Item label="Select a location..." value="" color={colors.textSecondary} />
                    {locations.map(location => (
                      <Picker.Item 
                        key={location.id} 
                        label={`${location.name} (${location.province})`} 
                        value={location.name.toUpperCase()}
                        color={colors.text}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ownership</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Owner Type</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Picker
                  selectedValue={ownerType}
                  onValueChange={setOwnerType}
                  style={[styles.picker, { color: colors.text }]}
                >
                  <Picker.Item label="Organization" value="organization" color={colors.text} />
                  <Picker.Item label="Customer" value="customer" color={colors.text} />
                  <Picker.Item label="External Company" value="external" color={colors.text} />
                </Picker>
              </View>
            </View>

            {ownerType === 'customer' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Assign to Customer</Text>
                {customersLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Loading customers...</Text>
                  </View>
                ) : customersError ? (
                  <Text style={[styles.error, { color: colors.error }]}>{customersError}</Text>
                ) : (
                  <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Picker
                      selectedValue={ownerCustomerId}
                      onValueChange={setOwnerCustomerId}
                      style={[styles.picker, { color: colors.text }]}
                    >
                      <Picker.Item label="Select a customer..." value="" color={colors.textSecondary} />
                      {customers.map(c => (
                        <Picker.Item key={c.CustomerListID} label={c.name} value={c.CustomerListID} color={colors.text} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
            )}

            {ownerType === 'external' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>External Company Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter company name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Current Ownership</Text>
              <View style={[styles.currentOwnershipDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.currentOwnershipText, { color: colors.textSecondary }]}>
                  {getCurrentOwnershipText()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.nextButtonText}>Save</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </ScrollView>
      )}
      {loading && step === 1 && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />}
      {/* Scanner Modal */}
      {scannerVisible && (
        <View style={styles.scannerModal}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.scannerCloseButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.scannerCloseIcon}>✕</Text>
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
              }} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 10 }}>
                <Text style={{ color: colors.surface, fontWeight: 'bold' }}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerEnabled={true}
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
                borderColor: colors.primary,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.0)',
                zIndex: 10,
              }} />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 56,
    width: '100%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  loadingText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  currentOwnershipDisplay: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  currentOwnershipText: {
    fontSize: 16,
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  scanButton: {
    borderRadius: 12,
    padding: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
  },
  scannerModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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
}); 