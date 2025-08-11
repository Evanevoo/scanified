import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import ScanArea from '../components/ScanArea';
import { useAuth } from '../hooks/useAuth';
import { CylinderLimitService } from '../services/CylinderLimitService';
import { useAssetConfig } from '../context/AssetContext';

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
    // Fetch owners for the current organization
    const fetchOwners = async () => {
      if (!profile?.organization_id) return;
      const { data, error } = await supabase
        .from('owners')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name', { ascending: true });
      if (!error && data) setOwners(data);
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
      console.error('Duplicate check error:', barcodeError || serialError);
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

  // Add new owner
  const handleAddOwner = async () => {
    if (!newOwnerName.trim() || !profile?.organization_id) return;
    const { data, error } = await supabase
      .from('owners')
      .insert({ name: newOwnerName.trim(), organization_id: profile.organization_id })
      .select();
    if (!error && data && data[0]) {
      setOwners([...owners, data[0]]);
      setSelectedOwner(data[0].name);
      setAddingOwner(false);
      setNewOwnerName('');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Add New Cylinder</Text>
      
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
              >
                <Picker.Item label="Select Gas Type" value="" color={colors.textSecondary} />
                {gasTypes.map(gasType => (
                  <Picker.Item 
                    key={gasType.id} 
                    label={`${gasType.category} - ${gasType.type}`} 
                    value={gasType.id.toString()} 
                    color={colors.text} 
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
              >
                <Picker.Item label="Select Location" value="" color={colors.textSecondary} />
                {locations.map(location => (
                  <Picker.Item 
                    key={location.id} 
                    label={location.name} 
                    value={location.id} 
                    color={colors.text} 
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
            >
              <Picker.Item label="Select Owner" value="" color={colors.textSecondary} />
              {owners.map(owner => (
                <Picker.Item key={owner.id} label={owner.name} value={owner.name} color={colors.text} />
              ))}
              <Picker.Item label="Add new owner..." value="__add_new__" color={colors.textSecondary} />
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

      {/* Scanner Modal */}
      <Modal
        visible={scannerVisible}
        onRequestClose={() => setScannerVisible(false)}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalOverlay}>
          <ScanArea
            onScanned={(scannedBarcode) => {
              setBarcode(scannedBarcode);
              setScannerVisible(false);
            }}
            label="SCAN HERE"
            onClose={() => setScannerVisible(false)}
          />
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
  title: {
    fontSize: 24,
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
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
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