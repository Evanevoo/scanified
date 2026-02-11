import logger from '../utils/logger';
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, Pressable, Modal, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import ScanArea from '../components/ScanArea';
import { Picker } from '@react-native-picker/picker';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Customer {
  CustomerListID: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  province?: string;
}

interface Cylinder {
  id: string;
  barcode_number: string;
  serial_number?: string;
  owner_type?: string;
  owner_id?: string;
  owner_name?: string;
  assigned_customer?: string;
  location?: string;
  ownership?: string;
}

export default function EditCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  // Initialize step based on whether barcode is provided in route params
  const routeBarcode = (route?.params as any)?.barcode;
  const [step, setStep] = useState(routeBarcode ? 2 : 1); // Start at step 2 if barcode provided
  const [barcode, setBarcode] = useState(routeBarcode || '');
  const [serial, setSerial] = useState('');
  const [cylinder, setCylinder] = useState<Cylinder | null>(null);
  const [loading, setLoading] = useState(!!routeBarcode); // Show loading if barcode provided
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  
  const [ownerType, setOwnerType] = useState<'organization' | 'customer' | 'external'>('organization');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [ownerTypePickerVisible, setOwnerTypePickerVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [ownershipValues, setOwnershipValues] = useState<{ id: string; value: string }[]>([]);
  const [ownershipValuesLoading, setOwnershipValuesLoading] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState('');
  const [ownershipPickerVisible, setOwnershipPickerVisible] = useState(false);
  const [bottles, setBottles] = useState<{ barcode_number: string }[]>([]);
  const [barcodeSuggestions, setBarcodeSuggestions] = useState<{ barcode_number: string }[]>([]);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);

  const searchCustomerByName = async (possibleNames: string[]): Promise<{ name: string; id: string } | null> => {
    if (!profile?.organization_id || possibleNames.length === 0) return null;
    try {
      for (const name of possibleNames) {
        if (!name || name.length < 3) continue;
        const { data: customers } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('organization_id', profile.organization_id)
          .ilike('name', `%${name}%`)
          .limit(1);
        if (customers && customers.length > 0) {
          const found = customers[0];
          return { name: found.name, id: found.CustomerListID };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleOcrCustomerFound = (customer: { name: string; id: string }) => {
    setScannerVisible(false);
    navigation.navigate('CustomerDetails', { customerId: customer.id });
  };

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

      setOwnershipValuesLoading(true);
      supabase
        .from('ownership_values')
        .select('id, value')
        .eq('organization_id', profile.organization_id)
        .order('value')
        .then(async ({ data, error }) => {
          if (!error && data && data.length > 0) {
            setOwnershipValues(data.map((item) => ({ id: item.id, value: item.value })));
          } else {
            const { data: bottlesData } = await supabase
              .from('bottles')
              .select('ownership')
              .eq('organization_id', profile.organization_id)
              .not('ownership', 'is', null)
              .not('ownership', 'eq', '');
            const unique = [...new Set((bottlesData || []).map((b) => b.ownership).filter(Boolean))].sort();
            setOwnershipValues(unique.map((v) => ({ id: v, value: v })));
          }
          setOwnershipValuesLoading(false);
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
          if (!error && data) setBottles(data);
        });
    }
  }, [profile?.organization_id]);

  // Filter barcode suggestions when typing in step 1
  React.useEffect(() => {
    if (barcode.trim() && bottles.length > 0 && step === 1) {
      const searchText = barcode.toLowerCase();
      const filtered = bottles
        .filter(b =>
          b.barcode_number &&
          b.barcode_number.toLowerCase().includes(searchText) &&
          b.barcode_number.toLowerCase() !== searchText
        )
        .slice(0, 5);
      setBarcodeSuggestions(filtered);
      setShowBarcodeSuggestions(filtered.length > 0);
    } else {
      setBarcodeSuggestions([]);
      setShowBarcodeSuggestions(false);
    }
  }, [barcode, bottles, step]);

  // Initialize barcode from route params if provided
  React.useEffect(() => {
    const routeBarcode = (route?.params as any)?.barcode;
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
      const ownerTypeValue = cylinder?.owner_type;
      if (ownerTypeValue === 'organization' || ownerTypeValue === 'customer' || ownerTypeValue === 'external') {
        setOwnerType(ownerTypeValue);
      } else {
        setOwnerType('organization');
      }
      setOwnerCustomerId(cylinder?.owner_id || '');
      setOwnerName(cylinder?.owner_name || '');
      setSelectedLocation(cylinder?.location || '');
      setSelectedLocationName(cylinder?.location || '');
      setSelectedOwnership(cylinder?.ownership || '');
    }
  }, [cylinder]);

  const scanDelay = 1500; // ms

  // Step 1: Scan or enter barcode
  // Step 2: Scan new barcode for editing
  const handleBarcodeScanned = (event: any) => {
    const data = typeof event === 'string' ? event : event?.data;
    if (!data) {
      logger.log('⚠️ No barcode data received');
      return;
    }
    
    logger.log('📷 Barcode scanned:', data);
    setScanned(true);
    setTimeout(() => setScanned(false), scanDelay);
    setBarcode(data);
    setScannerVisible(false);
    // In step 1, fetch the cylinder. In step 2, just update the barcode field.
    if (step === 1) {
      fetchCylinder(data);
    }
  };

  const fetchCylinder = async (barcodeValue: string) => {
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
    // Update cylinder with ownership fields and location (bottles table uses barcode_number, not barcode)
    const updateFields: Record<string, unknown> = { 
      barcode_number: barcode, 
      serial_number: serial,
      location: selectedLocationName || selectedLocation || null
    };
    if (ownerType === 'organization') {
      updateFields.owner_type = 'organization';
      updateFields.owner_id = null;
      updateFields.owner_name = '';
      updateFields.assigned_customer = null;
      updateFields.ownership = selectedOwnership || null;
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
      setError(updateError.message || `Failed to update ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'}.`);
      logger.log('❌ EditCylinder update error:', updateError);
    } else {
      Alert.alert('Success', `${assetConfig?.assetDisplayName || 'Asset'} updated successfully!`);
      setStep(1);
      setBarcode('');
      setSerial('');
      setCylinder(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit {assetConfig?.assetDisplayName || 'Cylinder'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {step === 1 && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>Scan or Enter Cylinder Barcode</Text>
          <View style={{ position: 'relative' }}>
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
            {showBarcodeSuggestions && barcodeSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 150 }}>
                  {barcodeSuggestions.map((bottle, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setBarcode(bottle.barcode_number);
                        setShowBarcodeSuggestions(false);
                      }}
                    >
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{bottle.barcode_number}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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
      {step === 2 && loading && !cylinder && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading cylinder details...</Text>
        </View>
      )}
      {step === 2 && cylinder && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Barcode</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={barcode}
                  onChangeText={setBarcode}
                  autoCapitalize="none"
                  placeholder="Enter barcode"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity 
                  style={[styles.scanButton, { backgroundColor: colors.primary }]} 
                  onPress={() => setScannerVisible(true)}
                >
                  <Text style={{ fontSize: 22 }}>📷</Text>
                </TouchableOpacity>
              </View>
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
                <TouchableOpacity 
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setLocationPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerButtonText, { color: selectedLocationName ? colors.text : colors.textSecondary }]}>
                    {selectedLocationName || 'Select a location...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Location Picker Modal */}
          <Modal
            visible={locationPickerVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setLocationPickerVisible(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setLocationPickerVisible(false)}
            >
              <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Location</Text>
                  <TouchableOpacity onPress={() => setLocationPickerVisible(false)}>
                    <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerModalScroll}>
                  {locations.map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedLocation(location.name.toUpperCase());
                        setSelectedLocationName(`${location.name} (${location.province})`);
                        setLocationPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                        {location.name} ({location.province})
                      </Text>
                      {selectedLocation === location.name.toUpperCase() && (
                        <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ownership</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Owner Type</Text>
              <TouchableOpacity 
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setOwnerTypePickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                  {ownerType === 'organization' ? 'Organization' : ownerType === 'customer' ? 'Customer' : 'External Company'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {ownerType === 'organization' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Ownership</Text>
                {ownershipValuesLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Loading ownership options...</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setOwnershipPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerButtonText, { color: selectedOwnership ? colors.text : colors.textSecondary }]}>
                      {selectedOwnership || 'Select ownership...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

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
                  <TouchableOpacity 
                    style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCustomerPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerButtonText, { color: ownerCustomerId ? colors.text : colors.textSecondary }]}>
                      {ownerCustomerId ? customers.find(c => c.CustomerListID === ownerCustomerId)?.name || 'Select a customer...' : 'Select a customer...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
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
      {/* Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScanArea
            searchCustomerByName={searchCustomerByName}
            onCustomerFound={handleOcrCustomerFound}
            onScanned={(data: string) => {
              if (!scanned && data) {
                logger.log('📷 Barcode scanned in EditCylinderScreen:', data);
                handleBarcodeScanned(data);
              }
            }}
            onClose={() => {
              setScannerVisible(false);
              setScanned(false);
            }}
            label="Scan cylinder barcode"
            validationPattern={/^[\dA-Za-z\-%]+$/}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

      {/* Owner Type Picker Modal */}
      <Modal
        visible={ownerTypePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOwnerTypePickerVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setOwnerTypePickerVisible(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Owner Type</Text>
              <TouchableOpacity onPress={() => setOwnerTypePickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              {[
                { label: 'Organization', value: 'organization' },
                { label: 'Customer', value: 'customer' },
                { label: 'External Company', value: 'external' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setOwnerType(option.value as 'organization' | 'customer' | 'external');
                    setOwnerTypePickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  {ownerType === option.value && (
                    <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal
        visible={customerPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCustomerPickerVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setCustomerPickerVisible(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => setCustomerPickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              {customers.map((customer) => (
                <TouchableOpacity
                  key={customer.CustomerListID}
                  style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setOwnerCustomerId(customer.CustomerListID);
                    setCustomerPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                    {customer.name}
                  </Text>
                  {ownerCustomerId === customer.CustomerListID && (
                    <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Ownership Picker Modal (when Owner Type is Organization) */}
      <Modal
        visible={ownershipPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOwnershipPickerVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setOwnershipPickerVisible(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Ownership</Text>
              <TouchableOpacity onPress={() => setOwnershipPickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              <TouchableOpacity
                style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedOwnership('');
                  setOwnershipPickerVisible(false);
                }}
              >
                <Text style={[styles.pickerModalItemText, { color: colors.textSecondary }]}>(None)</Text>
                {!selectedOwnership && <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>}
              </TouchableOpacity>
              {ownershipValues.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedOwnership(item.value);
                    setOwnershipPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>{item.value}</Text>
                  {selectedOwnership === item.value && <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  loadingText: {
    fontWeight: '600',
    marginLeft: 8,
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
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  scanFrame: {
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  closeCameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  flashButton: {
    position: 'absolute',
    top: 50,
    right: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    padding: 10,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginHorizontal: 20,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
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
  },
  suggestionText: {
    fontSize: 14,
  },
  // Picker Modal styles
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerModalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalScroll: {
    maxHeight: 400,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerModalItemText: {
    fontSize: 16,
    flex: 1,
  },
  pickerModalCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 
