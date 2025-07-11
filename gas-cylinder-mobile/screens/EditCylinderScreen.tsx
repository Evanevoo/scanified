import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';

export default function EditCylinderScreen() {
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

  // Fetch customers when cylinder is loaded (step 2)
  React.useEffect(() => {
    if (step === 2) {
      setCustomersLoading(true);
      supabase
        .from('customers')
        .select('CustomerListID, name')
        .order('name')
        .then(({ data, error }) => {
          if (error) setCustomersError('Failed to load customers');
          else setCustomers(data || []);
          setCustomersLoading(false);
        });
    }
  }, [step]);

  // Set initial owner fields when cylinder is loaded
  React.useEffect(() => {
    if (cylinder) {
      setOwnerType(cylinder.owner_type || 'organization');
      setOwnerCustomerId(cylinder.owner_id || '');
      setOwnerName(cylinder.owner_name || '');
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
      setError('Cylinder not found.');
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
      .neq('id', cylinder.id)
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
      .neq('id', cylinder.id)
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
      .eq('id', cylinder.id);
    setLoading(false);
    if (updateError) {
      setError('Failed to update cylinder.');
    } else {
      Alert.alert('Success', 'Cylinder updated successfully!');
      setStep(1);
      setBarcode('');
      setSerial('');
      setCylinder(null);
    }
  };

  return (
    <View style={styles.container}>
      {step === 1 && (
        <>
          <Text style={styles.title}>Scan or Enter Cylinder Barcode</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TextInput
              style={styles.input}
              placeholder="Enter barcode"
              value={barcode}
              onChangeText={setBarcode}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.scanButton} onPress={() => setScannerVisible(true)}>
              <Text style={{ fontSize: 22 }}>📷</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => fetchCylinder(barcode)}
            disabled={!barcode || loading}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
      {step === 2 && cylinder && (
        <>
          <Text style={styles.title}>Edit Cylinder Info</Text>
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
            {cylinder.owner_type === 'organization' && 'Organization'}
            {cylinder.owner_type === 'customer' && `Customer: ${cylinder.owner_name || cylinder.assigned_customer}`}
            {cylinder.owner_type === 'external' && `External: ${cylinder.owner_name}`}
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>Save</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
      {loading && <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />}
      {/* Scanner Modal */}
      {scannerVisible && (
        <View style={styles.scannerModal}>
          {!permission ? (
            <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', marginBottom: 16 }}>We need your permission to show the camera</Text>
              <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
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
                borderColor: '#2563eb',
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.0)',
                zIndex: 10,
              }} />
              {/* Optional: darken area outside border */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '25%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '75%', left: 0, width: '100%', height: '25%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '25%', left: 0, width: '10%', height: '50%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
              <View style={{ position: 'absolute', top: '25%', right: 0, width: '10%', height: '50%', backgroundColor: 'rgba(0,0,0,0.35)' }} />
            </View>
          )}
          <TouchableOpacity onPress={() => setScannerVisible(false)} style={{ marginTop: 24, backgroundColor: '#2563eb', padding: 16, borderRadius: 10 }}>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#2563eb',
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
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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