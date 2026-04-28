import logger from '../utils/logger';
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, Pressable, Modal, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import ScanArea from '../components/ScanArea';
import { Picker } from '@react-native-picker/picker';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { soundService } from '../services/soundService';

const { width, height } = Dimensions.get('window');

const TRACKED_BOTTLE_FIELDS = [
  'barcode_number',
  'serial_number',
  'product_code',
  'gas_type',
  'status',
  'location',
  'assigned_customer',
  'customer_name',
  'ownership',
  'description',
  'category',
  'group_name',
];

const normalizeComparableValue = (value: any) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

const valuesDiffer = (a: any, b: any) =>
  JSON.stringify(normalizeComparableValue(a)) !== JSON.stringify(normalizeComparableValue(b));

const buildBottleFieldChanges = (previousBottle: any, updatedFields: Record<string, unknown>) => {
  const changes: Record<string, { from: any; to: any }> = {};
  TRACKED_BOTTLE_FIELDS.forEach((field) => {
    if (!(field in updatedFields)) return;
    const from = normalizeComparableValue(previousBottle?.[field]);
    const to = normalizeComparableValue(updatedFields[field]);
    if (!valuesDiffer(from, to)) return;
    changes[field] = { from, to };
  });
  return changes;
};

export default function EditCylinderScreen() {
  const insets = useSafeAreaInsets();
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const scrollPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 40 : insets.bottom + 40;
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
  const [ownerType, setOwnerType] = useState('organization');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [bottles, setBottles] = useState([]);
  const [barcodeSuggestions, setBarcodeSuggestions] = useState([]);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [ownershipValues, setOwnershipValues] = useState<{ id: string; value: string }[]>([]);
  const [ownershipValuesLoading, setOwnershipValuesLoading] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState('');
  const [ownershipPickerVisible, setOwnershipPickerVisible] = useState(false);
  const [gasTypes, setGasTypes] = useState<any[]>([]);
  const [gasTypesLoading, setGasTypesLoading] = useState(false);
  const [gasTypesError, setGasTypesError] = useState('');
  const [selectedGasTypeId, setSelectedGasTypeId] = useState('');
  const [gasTypePickerVisible, setGasTypePickerVisible] = useState(false);

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

  // Fetch customers, locations, and ownership values when cylinder is loaded (step 2)
  React.useEffect(() => {
    if (step === 2 && profile?.organization_id) {
      setCustomersLoading(true);
      setLocationsLoading(true);

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

      supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name')
        .then(({ data, error }) => {
          if (error) {
            logger.log('❌ Error loading locations:', error);
            setLocationsError('Failed to load locations');
            setLocations([]);
          } else {
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

      setGasTypesLoading(true);
      supabase
        .from('gas_types')
        .select('*')
        .order('category', { ascending: true })
        .order('group_name', { ascending: true })
        .order('type', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            logger.log('❌ Error loading gas types:', error);
            setGasTypesError('Failed to load gas types');
          } else {
            setGasTypes(data || []);
            setGasTypesError('');
          }
          setGasTypesLoading(false);
        });
    }
  }, [step, profile?.organization_id]);

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
  }, [profile?.organization_id]); // Use profile?.organization_id instead of whole profile object to prevent infinite loops

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
      setOwnerType(cylinder?.owner_type || 'organization');
      setOwnerCustomerId(cylinder?.owner_id || '');
      setOwnerName(cylinder?.owner_name || '');
      setSelectedLocation(cylinder?.location || '');
      setSelectedLocationName(cylinder?.location || '');
      setSelectedOwnership(cylinder?.ownership || '');
      const matchedGasType = gasTypes.find((gt: any) => gt.type === cylinder?.gas_type);
      setSelectedGasTypeId(matchedGasType ? matchedGasType.id.toString() : '');
    }
  }, [cylinder, gasTypes]);

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

  // Step 1: Scan or enter barcode (full-frame scan, same as HomeScreen)
  // Step 2: Scan new barcode for editing
  const handleBarcodeScanned = (event: { data?: string; bounds?: any }) => {
    const data = event?.data?.trim();
    if (!data) return;
    
    // Filter by bounds to ensure barcode is within visual scan frame
    if (event?.bounds && !isBarcodeInScanArea(event.bounds)) {
      logger.log('📷 Barcode outside scan area, ignoring');
      return;
    }
    
    // Play scan sound
    soundService.playSound('scan').catch(err => {
      logger.warn('⚠️ Could not play scan sound:', err);
    });
    
    setScanned(true);
    setTimeout(() => setScanned(false), scanDelay);
    setBarcode(data);
    setScannerVisible(false);
    // In step 1, fetch the cylinder. In step 2, just update the barcode field.
    if (step === 1) {
      fetchCylinder(data);
    }
  };

  // Check if barcode is within the visual scan frame
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) return true; // Allow if no bounds
    
    const scanFrameWidth = 320;
    const scanFrameHeight = 150;
    const scanFrameTop = 150;
    
    const scanAreaLeft = (width - scanFrameWidth) / 2;
    const scanAreaTop = scanFrameTop;
    const scanAreaRight = scanAreaLeft + scanFrameWidth;
    const scanAreaBottom = scanAreaTop + scanFrameHeight;
    
    const barcodeX = bounds.origin?.x || bounds.x || 0;
    const barcodeY = bounds.origin?.y || bounds.y || 0;
    const barcodeWidth = bounds.size?.width || bounds.width || 0;
    const barcodeHeight = bounds.size?.height || bounds.height || 0;
    
    const barcodeCenterX = barcodeX + (barcodeWidth / 2);
    const barcodeCenterY = barcodeY + (barcodeHeight / 2);
    
    let screenBarcodeX: number;
    let screenBarcodeY: number;
    
    if (barcodeCenterX <= 1 && barcodeCenterY <= 1) {
      screenBarcodeX = barcodeCenterX * width;
      screenBarcodeY = barcodeCenterY * height;
    } else {
      screenBarcodeX = barcodeCenterX;
      screenBarcodeY = barcodeCenterY;
    }
    
    const toleranceX = scanFrameWidth * 0.1;
    const toleranceY = scanFrameHeight * 0.1;
    
    return (
      screenBarcodeX >= (scanAreaLeft - toleranceX) &&
      screenBarcodeX <= (scanAreaRight + toleranceX) &&
      screenBarcodeY >= (scanAreaTop - toleranceY) &&
      screenBarcodeY <= (scanAreaBottom + toleranceY)
    );
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
    // Update cylinder with ownership and location (bottles table uses barcode_number, not barcode)
    const updateFields: Record<string, unknown> = {
      barcode_number: barcode,
      serial_number: serial,
      location: selectedLocationName ? String(selectedLocationName).toUpperCase().replace(/\s+/g, '_') : (selectedLocation || null),
    };
    if (selectedGasTypeId) {
      const selectedGasType = gasTypes.find((gt: any) => gt.id.toString() === selectedGasTypeId);
      if (selectedGasType) {
        updateFields.gas_type = selectedGasType.type;
        updateFields.group_name = selectedGasType.group_name || null;
        updateFields.category = selectedGasType.category || null;
        updateFields.product_code = selectedGasType.product_code || null;
        updateFields.description = selectedGasType.description || null;
      }
    }
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
      const fieldChanges = buildBottleFieldChanges(cylinder, updateFields);
      if (Object.keys(fieldChanges).length > 0 && profile?.organization_id && cylinder?.id) {
        const baseAuditPayload = {
          organization_id: profile.organization_id,
          user_id: profile?.id || null,
          action: 'BOTTLE_UPDATE',
          details: {
            event_type: 'bottle_update',
            bottle_id: cylinder.id,
            barcode_number: (updateFields.barcode_number as string) || cylinder.barcode_number || null,
            field_changes: fieldChanges,
          },
          created_at: new Date().toISOString(),
        };
        const tableAwarePayload = {
          ...baseAuditPayload,
          table_name: 'bottles',
          record_id: cylinder.id,
        };
        const { error: auditError } = await supabase.from('audit_logs').insert(tableAwarePayload);
        if (auditError) {
          await supabase.from('audit_logs').insert(baseAuditPayload);
        }
        const typeChangeFields = ['category', 'group_name', 'type', 'gas_type', 'product_code', 'description'];
        const hasTypeChange = typeChangeFields.some((field) => field in fieldChanges);
        if (hasTypeChange) {
          const typeChangeSummary = typeChangeFields
            .filter((field) => field in fieldChanges)
            .map((field) => {
              const from = fieldChanges[field]?.from == null ? 'empty' : String(fieldChanges[field].from);
              const to = fieldChanges[field]?.to == null ? 'empty' : String(fieldChanges[field].to);
              return `${field}: ${from} -> ${to}`;
            })
            .join(' | ');
          const { error: typeChangeScanError } = await supabase.from('bottle_scans').insert({
            organization_id: profile.organization_id,
            bottle_barcode: (updateFields.barcode_number as string) || cylinder.barcode_number,
            mode: 'LOCATE',
            order_number: 'manual',
            customer_id: updateFields.assigned_customer || cylinder.assigned_customer || null,
            customer_name: updateFields.customer_name || cylinder.customer_name || null,
            location: updateFields.location || cylinder.location || null,
            notes: `[TYPE_CHANGE] ${typeChangeSummary}`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          if (typeChangeScanError) {
            logger.warn('Failed to create android TYPE_CHANGE scan record:', typeChangeScanError);
          }
        }
      }
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
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>Scan or Enter Cylinder Barcode</Text>
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}>
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

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Gas Type</Text>
              {gasTypesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>Loading gas types...</Text>
                </View>
              ) : gasTypesError ? (
                <Text style={[styles.error, { color: colors.error }]}>{gasTypesError}</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setGasTypePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerButtonText, { color: selectedGasTypeId ? colors.text : colors.textSecondary }]}>
                    {selectedGasTypeId
                      ? (() => {
                          const gasType = gasTypes.find((gt: any) => gt.id.toString() === selectedGasTypeId);
                          return gasType ? `${gasType.category} - ${gasType.type}` : 'Select gas type...';
                        })()
                      : (cylinder?.gas_type || 'Select gas type...')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
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
            <Pressable style={styles.modalOverlay} onPress={() => setLocationPickerVisible(false)}>
              <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Location</Text>
                  <TouchableOpacity onPress={() => setLocationPickerVisible(false)}>
                    <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerModalScroll}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedLocation(loc.id);
                        setSelectedLocationName(loc.name);
                        setLocationPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerModalItemText, { color: colors.text }]}>{loc.name}</Text>
                      {selectedLocation === loc.id && <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>}
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
            <Pressable style={styles.modalOverlay} onPress={() => setOwnershipPickerVisible(false)}>
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ownership</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Owner Type</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Picker
                  selectedValue={ownerType}
                  onValueChange={setOwnerType}
                  style={[styles.picker, { color: colors.text }]}
                  dropdownIconColor={colors.text}
                  itemStyle={{ color: colors.text }}
                >
                  <Picker.Item label="Organization" value="organization" color={colors.text} />
                  <Picker.Item label="Customer" value="customer" color={colors.text} />
                  <Picker.Item label="External Company" value="external" color={colors.text} />
                </Picker>
              </View>
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
                  <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Picker
                      selectedValue={ownerCustomerId}
                      onValueChange={setOwnerCustomerId}
                      style={[styles.picker, { color: colors.text }]}
                      dropdownIconColor={colors.text}
                      itemStyle={{ color: colors.text }}
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
                handleBarcodeScanned({ data: data.trim() });
              }
            }}
            onClose={() => {
              setScannerVisible(false);
              setScanned(false);
            }}
            label="Scan cylinder barcode"
            validationPattern={/^[\dA-Za-z\-%]+$/}
            style={{ flex: 1 }}
            disablePeriodicFocus
          />
        </View>
      </Modal>

      {/* Gas Type Picker Modal */}
      <Modal
        visible={gasTypePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGasTypePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setGasTypePickerVisible(false)}>
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Gas Type</Text>
              <TouchableOpacity onPress={() => setGasTypePickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              {gasTypes.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerModalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedGasTypeId(item.id.toString());
                    setGasTypePickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                    {item.category} - {item.type}
                  </Text>
                  {selectedGasTypeId === item.id.toString() && (
                    <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                  )}
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 200,
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
  ownershipHint: {
    fontSize: 12,
    marginTop: 6,
  },
  input: {
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    // color applied inline where used: { color: colors.text }
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
  loadingText: {
    fontWeight: '600',
    marginLeft: 8,
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
  zoomControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1001,
  },
  zoomButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
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
  },
}); 
