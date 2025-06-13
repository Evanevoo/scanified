import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { supabase } from '../supabase';
import ScanArea from '../components/ScanArea';

export default function FillCylinderScreen() {
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCylinder = async (value: string, type: 'barcode' | 'serial') => {
    setLoading(true);
    setError('');
    setCylinder(null);
    setSuccess('');
    
    let query;
    if (type === 'barcode') {
      query = supabase
        .from('cylinders')
        .select('*')
        .eq('barcode_number', value);
    } else {
      query = supabase
        .from('cylinders')
        .select('*')
        .eq('serial_number', value);
    }
    
    const { data, error } = await query.single();
    
    setLoading(false);
    if (error || !data) {
      setError(`Cylinder not found with ${type === 'barcode' ? 'barcode' : 'serial'}: ${value}`);
      return;
    }
    setCylinder(data);
  };

  const handleFillCylinder = async () => {
    if (!cylinder) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update cylinder status to filled
      const { error: updateError } = await supabase
        .from('cylinders')
        .update({ 
          status: 'filled',
          last_filled_date: new Date().toISOString(),
          fill_count: (cylinder.fill_count || 0) + 1
        })
        .eq('id', cylinder.id);
      
      if (updateError) {
        setError('Failed to update cylinder status.');
        return;
      }
      
      // Create a fill record
      const { error: fillError } = await supabase
        .from('cylinder_fills')
        .insert({
          cylinder_id: cylinder.id,
          barcode_number: cylinder.barcode_number,
          fill_date: new Date().toISOString(),
          filled_by: 'mobile_app',
          notes: 'Refilled after customer return'
        });
      
      if (fillError) {
        console.warn('Could not create fill record:', fillError);
        // Don't fail the operation if fill record creation fails
      }
      
      setSuccess('Cylinder has been refilled and is ready for rental!');
      setCylinder(null);
      setBarcode('');
      setSerial('');
      
      // Show success alert
      Alert.alert(
        'Refill Complete',
        'The cylinder has been refilled and is now ready for rental.',
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      setError('An error occurred while refilling the cylinder.');
    }
    
    setLoading(false);
  };

  const handleMarkEmpty = async () => {
    if (!cylinder) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update cylinder status to empty
      const { error: updateError } = await supabase
        .from('cylinders')
        .update({ 
          status: 'empty'
        })
        .eq('id', cylinder.id);
      
      if (updateError) {
        setError('Failed to update cylinder status.');
        return;
      }
      
      // Create a fill record for tracking
      const { error: fillError } = await supabase
        .from('cylinder_fills')
        .insert({
          cylinder_id: cylinder.id,
          barcode_number: cylinder.barcode_number,
          fill_date: new Date().toISOString(),
          filled_by: 'mobile_app',
          notes: 'Marked as empty'
        });
      
      if (fillError) {
        console.warn('Could not create fill record:', fillError);
        // Don't fail the operation if fill record creation fails
      }
      
      setSuccess('Cylinder has been marked as empty.');
      setCylinder(null);
      setBarcode('');
      setSerial('');
      
      // Show success alert
      Alert.alert(
        'Status Updated',
        'The cylinder has been marked as empty.',
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      setError('An error occurred while updating the cylinder status.');
    }
    
    setLoading(false);
  };

  const handleManualSubmit = () => {
    if (!barcode.trim() && !serial.trim()) {
      setError('Please enter a barcode or serial number.');
      return;
    }
    
    if (barcode.trim()) {
      fetchCylinder(barcode.trim(), 'barcode');
    } else if (serial.trim()) {
      fetchCylinder(serial.trim(), 'serial');
    }
  };

  const resetForm = () => {
    setBarcode('');
    setSerial('');
    setCylinder(null);
    setError('');
    setSuccess('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Cylinder Status</Text>
      <Text style={styles.subtitle}>Scan or enter cylinder details to mark as full or empty</Text>
      <ScanArea
        onScanned={setBarcode}
        label="SCAN HERE"
        style={{ marginBottom: 0 }}
      />
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Barcode Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Scan or enter barcode"
          value={barcode}
          onChangeText={setBarcode}
          autoCapitalize="none"
        />
      </View>

      {/* Serial Number Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Serial Number (Alternative)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter serial number"
          value={serial}
          onChangeText={setSerial}
          autoCapitalize="none"
        />
      </View>
      
      <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit} disabled={loading}>
        <Text style={styles.submitButtonText}>Find Cylinder</Text>
      </TouchableOpacity>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      
      {/* Cylinder Details */}
      {cylinder && (
        <View style={styles.cylinderDetails}>
          <Text style={styles.detailsTitle}>Cylinder Details</Text>
          <Text style={styles.detailRow}>Barcode: <Text style={styles.detailValue}>{cylinder.barcode_number}</Text></Text>
          <Text style={styles.detailRow}>Serial: <Text style={styles.detailValue}>{cylinder.serial_number}</Text></Text>
          <Text style={styles.detailRow}>Gas Type: <Text style={styles.detailValue}>{cylinder.gas_type || cylinder.group_name}</Text></Text>
          <Text style={styles.detailRow}>Current Status: <Text style={[styles.detailValue, styles.statusText]}>{cylinder.status || 'Unknown'}</Text></Text>
          <Text style={styles.detailRow}>Previous Fill Count: <Text style={styles.detailValue}>{cylinder.fill_count || 0}</Text></Text>
          {cylinder.last_filled_date && (
            <Text style={styles.detailRow}>Last Filled: <Text style={styles.detailValue}>
              {new Date(cylinder.last_filled_date).toLocaleDateString()}
            </Text></Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.fillButton, cylinder.status === 'filled' && styles.fillButtonDisabled]} 
              onPress={handleFillCylinder} 
              disabled={loading || cylinder.status === 'filled'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.fillButtonText}>
                  {cylinder.status === 'filled' ? 'Already Full' : 'Mark as Full'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.emptyButton, cylinder.status === 'empty' && styles.emptyButtonDisabled]} 
              onPress={handleMarkEmpty} 
              disabled={loading || cylinder.status === 'empty'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emptyButtonText}>
                  {cylinder.status === 'empty' ? 'Already Empty' : 'Mark as Empty'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Text style={styles.resetButtonText}>Reset Form</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  cylinderDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailRow: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusText: {
    fontWeight: 'bold',
    color: '#22c55e',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  fillButton: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  fillButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  fillButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  emptyButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#6b7280',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 