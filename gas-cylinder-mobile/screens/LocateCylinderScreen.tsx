import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert, Linking, ScrollView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import logger from '../utils/logger';

interface Location {
  id: string;
  name: string;
}

export default function LocateCylinderScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanDelay = 1500;
  
  // Location selection
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const handleBarCodeScanned = (event: any) => {
    const border = { top: 0.30, left: 0.05, width: 0.9, height: 0.18 };
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

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      if (!profile?.organization_id) {
        setLoadingLocations(false);
        return;
      }

      setLoadingLocations(true);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', profile.organization_id)
          .order('name');

        if (error) {
          logger.error('Error fetching locations:', error);
          setLocations([]);
        } else {
          setLocations(data || []);
        }
      } catch (err) {
        logger.error('Error fetching locations:', err);
        setLocations([]);
      }
      setLoadingLocations(false);
    };

    fetchLocations();
  }, [profile?.organization_id]);

  const fetchAsset = async (value: string, mode: 'barcode' | 'serial') => {
    if (!profile?.organization_id) {
      setError('Organization not found');
      return;
    }

    setLoading(true);
    setError('');
    setAsset(null);
    setSelectedLocation(''); // Reset location selection
    
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
    // Set initial location if asset has a location
    if (data.location) {
      // Try to find matching location by name
      const matchingLocation = locations.find(loc => 
        loc.name.toUpperCase() === data.location.toUpperCase().replace(/_/g, ' ')
      );
      if (matchingLocation) {
        setSelectedLocation(matchingLocation.id);
      }
    }
  };

  const handleUpdateLocation = async () => {
    if (!asset || !selectedLocation) {
      setError('Please select a location');
      return;
    }

    setUpdatingLocation(true);
    setError('');

    try {
      const selectedLocationName = locations.find(loc => loc.id === selectedLocation)?.name || '';
      
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          location: selectedLocationName.toUpperCase().replace(/\s+/g, '_'),
          last_location_update: new Date().toISOString(),
          days_at_location: 0 // Reset days when location changes
        })
        .eq('id', asset.id)
        .eq('organization_id', profile.organization_id);

      if (updateError) {
        logger.error('Error updating location:', updateError);
        setError('Failed to update location. Please try again.');
      } else {
        // Refresh asset data
        await fetchAsset(asset.barcode_number || asset.serial_number, asset.barcode_number ? 'barcode' : 'serial');
        Alert.alert('Success', 'Location updated successfully');
      }
    } catch (err) {
      logger.error('Error updating location:', err);
      setError('Failed to update location. Please try again.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Enter or scan a barcode or serial number to search for {assetConfig.assetDisplayName?.toLowerCase() || 'asset'} details
      </Text>
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Search</Text>}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {asset && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>{assetConfig.assetDisplayName} Details</Text>
          <Text style={styles.detailsLabel}>Barcode: <Text style={styles.detailsValue}>{asset.barcode_number}</Text></Text>
          <Text style={styles.detailsLabel}>Serial: <Text style={styles.detailsValue}>{asset.serial_number}</Text></Text>
          <Text style={styles.detailsLabel}>Type: <Text style={styles.detailsValue}>{asset.group_name}</Text></Text>
          <Text style={styles.detailsLabel}>Status: <Text style={styles.detailsValue}>{asset.status || 'Unknown'}</Text></Text>
          <Text style={styles.detailsLabel}>Current Location: <Text style={styles.detailsValue}>
            {asset.location ? asset.location.replace(/_/g, ' ') : 'Not set'}
          </Text></Text>
          <Text style={styles.detailsLabel}>Assigned To: <Text style={styles.detailsValue}>{asset.customer_name || 'N/A'}</Text></Text>
          
          {/* Location Update Section */}
          <View style={styles.locationUpdateSection}>
            <Text style={styles.locationUpdateTitle}>Update Location</Text>
            {loadingLocations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#40B5AD" />
                <Text style={styles.loadingText}>Loading locations...</Text>
              </View>
            ) : locations.length === 0 ? (
              <Text style={styles.emptyText}>No locations available. Please add locations in the web dashboard.</Text>
            ) : (
              <>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedLocation}
                    onValueChange={(itemValue) => {
                      logger.log('Location selected:', itemValue);
                      setSelectedLocation(itemValue);
                    }}
                    style={styles.picker}
                    dropdownIconColor="#6B7280"
                  >
                    <Picker.Item label="-- Select Location --" value="" />
                    {locations.map(location => (
                      <Picker.Item 
                        key={location.id} 
                        label={location.name} 
                        value={location.id} 
                      />
                    ))}
                  </Picker>
                </View>
                
                {selectedLocation && (
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleUpdateLocation}
                    disabled={updatingLocation}
                    activeOpacity={0.8}
                  >
                    {updatingLocation ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.updateButtonText}>Update Location</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
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
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.scannerCloseButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.scannerCloseIcon}>✕</Text>
          </TouchableOpacity>

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
                enableTorch={flashEnabled}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{}}
              />
              {/* Overlay border rectangle */}
              <View style={styles.scanOverlay} />
              
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
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanBtn: {
    backgroundColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
    color: '#40B5AD',
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
    backgroundColor: 'transparent',
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
    backgroundColor: '#40B5AD',
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
    top: '30%',
    left: '5%',
    width: '90%',
    height: '18%',
    borderWidth: 3,
    borderColor: '#40B5AD',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 10,
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
  locationUpdateSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  locationUpdateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
    color: '#6B7280',
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
  },
  updateButton: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#40B5AD',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 