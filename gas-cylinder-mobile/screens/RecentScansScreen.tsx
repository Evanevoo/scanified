import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function RecentScansScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      setError('');
      // Use the correct table name: bottle_scans
      const { data, error } = await supabase
        .from('bottle_scans')
        .select('id, bottle_barcode, order_number, customer_name, created_at, read')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.log('Supabase error:', error);
        setError(error.message || 'Failed to load scans.');
      } else {
        setError('');
        setScans(data || []);
      }
      setLoading(false);
      // Mark scans as read if any are unread
      if (data && data.length > 0) {
        const unreadIds = data.filter(s => !s.read).map(s => s.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('bottle_scans')
            .update({ read: true })
            .in('id', unreadIds);
        }
      }
    };
    fetchScans();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Synced Scans</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : scans.length === 0 ? (
        <Text style={styles.empty}>No recent scans found.</Text>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.scanItem}>
              <Text style={styles.scanBarcode}>Barcode: {item.bottle_barcode}</Text>
              <Text style={styles.scanOrder}>Order: {item.order_number}</Text>
              <Text style={styles.scanCustomer}>Customer: {item.customer_name || '-'}</Text>
              <Text style={styles.scanTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={!error ? <Text style={{ color: '#888', textAlign: 'center', marginTop: 24 }}>No recent scans found.</Text> : null}
          style={{ marginTop: 12 }}
        />
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
  scanItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  scanBarcode: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
  },
  scanOrder: {
    color: '#222',
    fontSize: 15,
    marginTop: 2,
  },
  scanCustomer: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  scanTime: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    color: '#ff5a1f',
    marginTop: 40,
    textAlign: 'center',
  },
  empty: {
    color: '#888',
    marginTop: 40,
    textAlign: 'center',
    fontSize: 16,
  },
}); 