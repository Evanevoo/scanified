import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../supabase';
import { Picker } from '@react-native-picker/picker';
import ScanArea from '../components/ScanArea';

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
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        setError('Failed to load locations.');
        return;
      }
      setLocations(data || []);
      setLoadingLocations(false);
    };
    fetchLocations();
  }, []);

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
    const { data: dup, error: dupError } = await supabase
      .from('cylinders')
      .select('id')
      .or(`barcode_number.eq.${barcode},serial_number.eq.${serial}`);
    if (dupError) {
      setError('Error checking duplicates.');
      setLoading(false);
      return;
    }
    if (dup && dup.length > 0) {
      setError('A cylinder with this barcode or serial already exists.');
      setLoading(false);
      return;
    }
    
    // Insert new cylinder with gas type and location information
    const { error: insertError } = await supabase
      .from('cylinders')
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
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Cylinder</Text>
      <ScanArea
        onScanned={setBarcode}
        label="SCAN HERE"
        style={{ marginBottom: 0 }}
      />
      <TextInput
        style={styles.input}
        placeholder="Barcode Number"
        value={barcode}
        onChangeText={setBarcode}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Serial Number"
        value={serial}
        onChangeText={setSerial}
        autoCapitalize="none"
      />
      
      <Text style={styles.label}>Gas Type</Text>
      {loadingGasTypes ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading gas types...</Text>
        </View>
      ) : gasTypes.length === 0 ? (
        <Text style={styles.error}>No gas types available. Please import gas types in the web app first.</Text>
      ) : (
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedGasType}
            onValueChange={setSelectedGasType}
            style={styles.picker}
          >
            <Picker.Item label="Select Gas Type" value="" />
            {gasTypes.map(type => (
              <Picker.Item 
                key={type.id} 
                label={type.type} 
                value={type.id.toString()} 
              />
            ))}
          </Picker>
        </View>
      )}
      
      <Text style={styles.label}>Location</Text>
      {loadingLocations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      ) : locations.length === 0 ? (
        <Text style={styles.error}>No locations available. Please add locations in the web app first.</Text>
      ) : (
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            style={styles.picker}
          >
            <Picker.Item label="Select Location" value="" />
            {locations.map(location => {
              const label = `${location.name}, ${location.province}`;
              return (
                <Picker.Item 
                  key={location.id} 
                  label={label} 
                  value={location.id} 
                />
              );
            })}
          </Picker>
        </View>
      )}
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <TouchableOpacity 
        style={[
          styles.submitBtn, 
          (loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0) && styles.submitBtnDisabled
        ]} 
        onPress={handleSubmit} 
        disabled={loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Cylinder</Text>}
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
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
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  picker: {
    height: 48,
    width: '100%',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
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
  submitBtnDisabled: {
    backgroundColor: '#e5e7eb',
  },
  error: {
    color: '#ff5a1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  success: {
    color: '#22c55e',
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loadingText: {
    color: '#2563eb',
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 