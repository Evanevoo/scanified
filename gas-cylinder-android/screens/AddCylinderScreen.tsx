import logger from '../utils/logger';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView, FlatList, Pressable, Dimensions } from 'react-native';
import { supabase } from '../supabase';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { CylinderLimitService } from '../services/CylinderLimitService';
import { useAssetConfig } from '../context/AssetContext';
import { Platform } from '../utils/platform';
import { useNavigation } from '@react-navigation/native';
import { soundService } from '../services/soundService';

const { width, height } = Dimensions.get('window');

interface GasType {
  id: number;
  category: string;
  group_name: string;
  type: string;
  product_code: string;
  description: string;
  in_house_total: number;
  with_customer_total: number;
  lost_total: number;
  total: number;
  dock_stock: string;
}

interface Location {
  id: string;
  name: string;
  province: string;
  gst_rate: number;
  pst_rate: number;
  total_tax_rate: number;
}

export default function AddCylinderScreen() {
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const navigation = useNavigation();
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [gasTypes, setGasTypes] = useState<GasType[]>([]);
  const [selectedGasType, setSelectedGasType] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGasTypes, setLoadingGasTypes] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { profile } = useAuth();
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleBarcodeScanned = (event: { data?: string; bounds?: any }) => {
    if (scanned || !event?.data) return;
    
    // Filter by bounds to ensure barcode is within visual scan frame
    if (event.bounds && !isBarcodeInScanArea(event.bounds)) {
      logger.log('📷 Barcode outside scan area, ignoring');
      return;
    }
    
    const barcode = event.data.trim().replace(/^\*+|\*+$/g, '');
    if (barcode) {
      // Play scan sound
      soundService.playSound('scan').catch(err => {
        logger.warn('⚠️ Could not play scan sound:', err);
      });
      
      setBarcode(barcode);
      setScanned(true);
      setScannerVisible(false);
      setTimeout(() => setScanned(false), 1000);
    }
  };

  // Check if barcode is within the visual scan frame
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) return true; // Allow if no bounds
    
    const screenWidth = width;
    const screenHeight = height;
    const scanFrameWidth = 320;
    const scanFrameHeight = 150;
    const scanFrameTop = 150;
    
    const scanAreaLeft = (screenWidth - scanFrameWidth) / 2;
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
      screenBarcodeX = barcodeCenterX * screenWidth;
      screenBarcodeY = barcodeCenterY * screenHeight;
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

  useEffect(() => {
    const fetchGasTypes = async () => {
      setLoadingGasTypes(true);
      setError('');
      const { data, error } = await supabase
        .from('gas_types')
        .select('*')
        .order('category', { ascending: true })
        .order('group_name', { ascending: true })
        .order('type', { ascending: true });
      if (error) {
        setError('Failed to load gas types.');
        return;
      }
      setGasTypes(data || []);
      setLoadingGasTypes(false);
    };
    fetchGasTypes();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      setError('');
      if (!profile?.organization_id) {
        setLocations([]);
        setLoadingLocations(false);
        return;
      }
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name', { ascending: true });
      if (error) {
        setError('Failed to load locations.');
        setLocations([]);
        setLoadingLocations(false);
        return;
      }
      setLocations(data || []);
      setLoadingLocations(false);
    };
    fetchLocations();
  }, [profile]);

  useEffect(() => {
    // Fetch ownership values for the current organization
    const fetchOwners = async () => {
      if (!profile?.organization_id) return;
      const { data, error } = await supabase
        .from('ownership_values')
        .select('id, value')
        .eq('organization_id', profile.organization_id)
        .order('value', { ascending: true });
      if (!error && data) {
        // Map the data to match the expected format (name -> value)
        setOwners(data.map(item => ({ id: item.id, name: item.value })));
      }
    };
    fetchOwners();
  }, [profile]);

  useEffect(() => {
    // Auto-save draft functionality removed for React Native compatibility
    // localStorage is not available in React Native
  }, [barcode, serial, selectedGasType, selectedLocation]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!barcode || !serial || !selectedGasType || !selectedLocation) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    
    // Check cylinder limits before adding
    if (profile?.organization_id) {
      const validation = await CylinderLimitService.validateCylinderAddition(profile.organization_id, 1);
      
      if (!validation.isValid) {
        setLoading(false);
        Alert.alert(
          validation.message.title,
          validation.message.message,
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }
    }
    
    // Get the selected gas type details
    const selectedGasTypeData = gasTypes.find(gt => gt.id.toString() === selectedGasType);
    if (!selectedGasTypeData) {
      setError('Invalid gas type selected.');
      setLoading(false);
      return;
    }

    // Get the selected location details
    const selectedLocationData = locations.find(loc => loc.id === selectedLocation);
    if (!selectedLocationData) {
      setError('Invalid location selected.');
      setLoading(false);
      return;
    }
    
    // Check for duplicate barcode or serial
    const { data: barcodeDup, error: barcodeError } = await supabase
      .from('bottles')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('barcode_number', barcode);
    
    const { data: serialDup, error: serialError } = await supabase
      .from('bottles')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('serial_number', serial);
    
    if (barcodeError || serialError) {
      logger.error('Duplicate check error:', barcodeError || serialError);
      setError('Error checking duplicates: ' + (barcodeError?.message || serialError?.message));
      setLoading(false);
      return;
    }
    
    if ((barcodeDup && barcodeDup.length > 0) || (serialDup && serialDup.length > 0)) {
      setError('A cylinder with this barcode or serial already exists.');
      setLoading(false);
      return;
    }
    
    // Insert new bottle with gas type and location information
    const { error: insertError } = await supabase
      .from('bottles')
      .insert({ 
        barcode_number: barcode, 
        serial_number: serial, 
        gas_type: selectedGasTypeData.type,
        group_name: selectedGasTypeData.group_name,
        category: selectedGasTypeData.category,
        product_code: selectedGasTypeData.product_code,
        description: selectedGasTypeData.description,
        location: selectedLocationData.id,
        ownership: selectedOwner,
        organization_id: profile.organization_id
      });
    setLoading(false);
    if (insertError) {
      setError('Failed to add cylinder.');
    } else {
      setSuccess(`${assetConfig?.assetDisplayName || 'Asset'} added successfully!`);
      setBarcode('');
      setSerial('');
      setSelectedGasType('');
      setSelectedLocation('');
      // localStorage.removeItem('addCylinderDraft'); // Removed for React Native compatibility
    }
  };

  // Add new ownership value
  const handleAddOwner = async () => {
    if (!newOwnerName.trim() || !profile?.organization_id) return;
    const { data, error } = await supabase
      .from('ownership_values')
      .insert({ value: newOwnerName.trim(), organization_id: profile.organization_id })
      .select();
    if (!error && data && data[0]) {
      setOwners([...owners, { id: data[0].id, name: data[0].value }]);
      setSelectedOwner(data[0].value);
      setAddingOwner(false);
      setNewOwnerName('');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Scanner Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Scan Barcode</Text>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setScannerVisible(true)}
        >
          <Text style={[styles.scanButtonText, { color: colors.surface }]}>
            {barcode ? `✓ Scanned: ${barcode}` : '📷 SCAN BARCODE'}
          </Text>
        </TouchableOpacity>
        {barcode && (
          <Text style={[styles.scanSuccess, { color: colors.success }]}>
            ✓ Barcode scanned successfully
          </Text>
        )}
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Barcode Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter barcode number"
            placeholderTextColor={colors.textSecondary}
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Serial Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter serial number"
            placeholderTextColor={colors.textSecondary}
            value={serial}
            onChangeText={setSerial}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Configuration Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Configuration</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Gas Type</Text>
          {loadingGasTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading gas types...</Text>
            </View>
          ) : (
            <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker
                selectedValue={selectedGasType}
                onValueChange={setSelectedGasType}
                style={[styles.picker, { color: colors.text }]}
                enabled={true}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Select Gas Type" value="" />
                {gasTypes.map(gasType => (
                  <Picker.Item 
                    key={gasType.id} 
                    label={`${gasType.category} - ${gasType.type}`} 
                    value={gasType.id.toString()} 
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
          {loadingLocations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading locations...</Text>
            </View>
          ) : (
            <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker
                selectedValue={selectedLocation}
                onValueChange={setSelectedLocation}
                style={[styles.picker, { color: colors.text }]}
                enabled={true}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Select Location" value="" />
                {locations.map(location => (
                  <Picker.Item 
                    key={location.id} 
                    label={location.name} 
                    value={location.id} 
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Ownership</Text>
          <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={selectedOwner}
              onValueChange={value => {
                if (value === '__add_new__') setAddingOwner(true);
                else setSelectedOwner(value);
              }}
              style={[styles.picker, { color: colors.text }]}
              enabled={true}
              dropdownIconColor={colors.text}
            >
              <Picker.Item label="Select Owner" value="" />
              {owners.map(owner => (
                <Picker.Item key={owner.id} label={owner.name} value={owner.name} />
              ))}
              <Picker.Item label="Add new owner..." value="__add_new__" />
            </Picker>
          </View>
        </View>

        {addingOwner && (
          <View style={styles.addOwnerContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="New owner name"
              placeholderTextColor={colors.textSecondary}
              value={newOwnerName}
              onChangeText={setNewOwnerName}
              autoCapitalize="words"
            />
            <TouchableOpacity style={[styles.addOwnerBtn, { backgroundColor: colors.primary }]} onPress={handleAddOwner}>
              <Text style={[styles.addOwnerBtnText, { color: colors.surface }]}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelOwnerBtn, { backgroundColor: colors.border }]} onPress={() => setAddingOwner(false)}>
              <Text style={[styles.cancelOwnerBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Error and Success Messages */}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {success ? <Text style={[styles.success, { color: colors.success }]}>{success}</Text> : null}
      
      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity 
          style={[
            styles.submitBtn, 
            { backgroundColor: colors.primary },
            (loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0) && { backgroundColor: colors.border }
          ]} 
          onPress={handleSubmit} 
          disabled={loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0}
        >
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={[styles.submitBtnText, { color: colors.surface }]}>Add Cylinder</Text>}
        </TouchableOpacity>
      </View>

      {/* Scanner Modal - same layout as other screens */}
      <Modal
        visible={scannerVisible}
        onRequestClose={() => setScannerVisible(false)}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.fullscreenWrapper}>
          {!permission ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.statusText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerContent}>
              <Text style={styles.statusText}>Camera permission required</Text>
              <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeCameraButton} onPress={() => setScannerVisible(false)}>
                <Text style={styles.closeCameraText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.fullscreenCamera}
                onPress={() => {
                  // Tap to focus - Android Expo Camera handles this automatically
                }}
              >
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={flashEnabled}
                  zoom={cameraZoom}
                  barcodeScannerSettings={{
                    barcodeTypes: ['code128', 'code39', 'codabar', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'qr', 'aztec', 'datamatrix', 'pdf417'],
                    regionOfInterest: {
                      x: (width - 320) / 2 / width,
                      y: 150 / height,
                      width: 320 / width,
                      height: 150 / height,
                    },
                  }}
                  onBarcodeScanned={scanned ? undefined : (event: any) => {
                    handleBarcodeScanned(event);
                  }}
                />
              </Pressable>
              
              {/* Camera Overlay - same as HomeScreen */}
              <View style={styles.cameraOverlay} pointerEvents="none">
                <View style={styles.scanFrame} pointerEvents="none" />
              </View>
              
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={() => setScannerVisible(false)}
              >
                <Text style={styles.closeCameraText}>✕ Close</Text>
              </TouchableOpacity>
              
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

              {/* Zoom Controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    setCameraZoom(Math.max(0, cameraZoom - 0.1));
                  }}
                >
                  <Ionicons name="remove-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.zoomText}>{Math.round((1 + cameraZoom) * 100)}%</Text>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    setCameraZoom(Math.min(2, cameraZoom + 0.1));
                  }}
                >
                  <Ionicons name="add-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
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
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    height: 56,
  },
  picker: {
    width: '100%',
    height: 56,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  loadingText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  scanButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  scanSuccess: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  addOwnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  addOwnerBtn: {
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  addOwnerBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelOwnerBtn: {
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  cancelOwnerBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  submitBtn: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  success: {
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
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
    zIndex: 1000,
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalCloseBtn: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
}); 