import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { useRoute } from '@react-navigation/native';

export default function CustomerDetailsScreen() {
  const route = useRoute();
  const { customerId } = route.params as { customerId: string };
  const [customer, setCustomer] = useState<any>(null);
  const [cylinders, setCylinders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      // Fetch customer info
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', customerId)
        .single();
      if (custErr || !cust) {
        setError('Customer not found.');
        setLoading(false);
        return;
      }
      setCustomer(cust);
      // Fetch cylinders rented by this customer
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('assigned_customer', customerId);
      if (error) {
        setError('Error fetching cylinders.');
        setLoading(false);
        return;
      }
      setCylinders(data || []);
      setLoading(false);
    };
    fetchDetails();
  }, [customerId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }
  if (error) {
    return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  }

  // Build full address from all address fields
  const addressParts = [
    customer.address,
    customer.address2,
    customer.address3,
    customer.address4,
    customer.address5,
    customer.city,
    customer.postal_code
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{customer.name}</Text>
      <Text style={styles.label}>Barcode: <Text style={styles.value}>{customer.barcode}</Text></Text>
      <Text style={styles.label}>Contact: <Text style={styles.value}>{customer.contact_details}</Text></Text>
      <Text style={styles.label}>Phone: <Text style={styles.value}>{customer.phone}</Text></Text>
      <Text style={styles.label}>Address: <Text style={styles.value}>{fullAddress}</Text></Text>
      <Text style={styles.sectionTitle}>Currently Renting</Text>
      {cylinders.length === 0 ? (
        <Text style={styles.value}>No cylinders currently rented.</Text>
      ) : (
        cylinders.map((cyl, idx) => (
          <View key={cyl.barcode_number + idx} style={styles.cylinderBox}>
            <Text style={styles.cylinderLabel}>Barcode: <Text style={styles.cylinderValue}>{cyl.barcode_number}</Text></Text>
            <Text style={styles.cylinderLabel}>Serial: <Text style={styles.cylinderValue}>{cyl.serial_number}</Text></Text>
            <Text style={styles.cylinderLabel}>Gas Type: <Text style={styles.cylinderValue}>{cyl.group_name}</Text></Text>
            <Text style={styles.cylinderLabel}>Status: <Text style={styles.cylinderValue}>{cyl.status || 'Unknown'}</Text></Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  value: {
    fontWeight: 'normal',
    color: '#444',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#2563eb',
    marginTop: 18,
    marginBottom: 8,
  },
  cylinderBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cylinderLabel: {
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 2,
  },
  cylinderValue: {
    fontWeight: 'normal',
    color: '#444',
  },
  error: {
    color: '#ff5a1f',
    fontSize: 16,
    textAlign: 'center',
  },
}); 