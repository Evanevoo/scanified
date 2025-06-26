import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../supabase';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import ScanArea from '../components/ScanArea';
import { useAuth } from '../hooks/useAuth';

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
    // Restore draft if present
    const draft = localStorage.getItem('addCylinderDraft');
    if (draft) {
      const { barcode, serial, selectedGasType, selectedLocation } = JSON.parse(draft);
      setBarcode(barcode || '');
      setSerial(serial || '');
      setSelectedGasType(selectedGasType || '');
      setSelectedLocation(selectedLocation || '');
    }
  }, []);

  useEffect(() => {
    // Auto-save draft
    localStorage.setItem('addCylinderDraft', JSON.stringify({
      barcode,
      serial,
      selectedGasType,
      selectedLocation
    }));
  }, [barcode, serial, selectedGasType, selectedLocation]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!barcode || !serial || !selectedGasType || !selectedLocation) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    
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
      .eq('barcode_number', barcode);
    
    const { data: serialDup, error: serialError } = await supabase
      .from('bottles')
      .select('id')
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
        location: selectedLocationData.id
      });
    setLoading(false);
    if (insertError) {
      setError('Failed to add cylinder.');
    } else {
      setSuccess('Cylinder added successfully!');
      setBarcode('');
      setSerial('');
      setSelectedGasType('');
      setSelectedLocation('');
      localStorage.removeItem('addCylinderDraft');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Add New Cylinder</Text>
      <ScanArea
        onScanned={setBarcode}
        label="SCAN HERE"
        style={{ marginBottom: 0 }}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Barcode Number"
        placeholderTextColor={colors.textSecondary}
        value={barcode}
        onChangeText={setBarcode}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Serial Number"
        placeholderTextColor={colors.textSecondary}
        value={serial}
        onChangeText={setSerial}
        autoCapitalize="none"
      />
      
      <Text style={[styles.label, { color: colors.text }]}>Gas Type</Text>
      {loadingGasTypes ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading gas types...</Text>
        </View>
      ) : gasTypes.length === 0 ? (
        <Text style={[styles.error, { color: colors.error }]}>No gas types available. Please import gas types in the web app first.</Text>
      ) : (
        <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Picker
            selectedValue={selectedGasType}
            onValueChange={setSelectedGasType}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Select Gas Type" value="" color={colors.textSecondary} />
            {gasTypes.map(type => (
              <Picker.Item 
                key={type.id} 
                label={type.type} 
                value={type.id.toString()}
                color={colors.text}
              />
            ))}
          </Picker>
        </View>
      )}
      
      <Text style={[styles.label, { color: colors.text }]}>Location</Text>
      {loadingLocations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading locations...</Text>
        </View>
      ) : locations.length === 0 ? (
        <Text style={[styles.error, { color: colors.error }]}>No locations available. Please add locations in the web app first.</Text>
      ) : (
        <View style={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Select Location" value="" color={colors.textSecondary} />
            {locations.map(location => {
              const label = `${location.name}, ${location.province}`;
              return (
                <Picker.Item 
                  key={location.id} 
                  label={label} 
                  value={location.id}
                  color={colors.text}
                />
              );
            })}
          </Picker>
        </View>
      )}
      
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {success ? <Text style={[styles.success, { color: colors.success }]}>{success}</Text> : null}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  pickerWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  picker: {
    height: 48,
    width: '100%',
  },
  submitBtn: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    marginBottom: 8,
    textAlign: 'center',
  },
  success: {
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 