import logger from '../utils/logger';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';

export default function RecentScansScreen() {
  const { profile, organization, loading: authLoading } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchScans = useCallback(async (isRefresh = false) => {
    if (authLoading) {
      return; // Wait for auth to finish loading
    }

    if (!profile?.organization_id) {
      setError('Organization not found');
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    // Only show scans from the last 90 days to avoid showing very old data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Query bottle_scans table first (primary table)
    const { data: bottleScans, error: bottleError } = await supabase
      .from('bottle_scans')
      .select('id, bottle_barcode, order_number, customer_name, created_at, read')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Also query scans table as fallback (some scans might only be in scans table)
    const { data: scansData, error: scansError } = await supabase
      .from('scans')
      .select('id, barcode_number, order_number, customer_name, created_at')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (bottleError) {
      logger.log('Bottle_scans query error:', bottleError);
    }
    if (scansError) {
      logger.log('Scans table query error:', scansError);
    }
    
    // Combine and normalize data from both tables
    const allScans = [];
    
    // Add bottle_scans (map bottle_barcode to barcode_number for consistency)
    if (bottleScans) {
      allScans.push(...bottleScans.map(scan => ({
        ...scan,
        barcode_number: scan.bottle_barcode,
        source: 'bottle_scans'
      })));
    }
    
    // Add scans table data (map barcode_number to bottle_barcode for consistency)
    if (scansData) {
      allScans.push(...scansData.map(scan => ({
        ...scan,
        bottle_barcode: scan.barcode_number,
        read: false, // scans table doesn't have read field
        source: 'scans'
      })));
    }
    
    // Remove duplicates (same barcode and created_at within 1 second)
    const uniqueScans = allScans.reduce((acc, scan) => {
      const key = `${scan.bottle_barcode || scan.barcode_number}_${new Date(scan.created_at).getTime()}`;
      if (!acc.find(s => `${s.bottle_barcode || s.barcode_number}_${new Date(s.created_at).getTime()}` === key)) {
        acc.push(scan);
      }
      return acc;
    }, []);
    
    // Sort by created_at descending and limit to 20
    uniqueScans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const finalScans = uniqueScans.slice(0, 20);
    
    if (bottleError && scansError) {
      setError('Failed to load scans from both tables.');
      logger.log('Both queries failed:', { bottleError, scansError });
    } else {
      setError('');
      setScans(finalScans);
      logger.log(`✅ Loaded ${finalScans.length} recent scans (${bottleScans?.length || 0} from bottle_scans, ${scansData?.length || 0} from scans)`);
    }
    
    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
    
    // Mark scans as read if any are unread (only for bottle_scans table)
    if (bottleScans && bottleScans.length > 0) {
      const unreadIds = bottleScans.filter(s => !s.read).map(s => s.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('bottle_scans')
          .update({ read: true })
          .eq('organization_id', profile.organization_id)
          .in('id', unreadIds);
      }
    }
  }, [profile, authLoading]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Refresh when screen comes into focus (e.g., after scanning)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure any recent scans have synced
      const timer = setTimeout(() => {
        fetchScans(true);
      }, 500);
      return () => clearTimeout(timer);
    }, [fetchScans])
  );

  const onRefresh = useCallback(() => {
    fetchScans(true);
  }, [fetchScans]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Synced Scans</Text>
      {organization ? (
        <>
          <Text style={styles.organizationName}>Organization: {organization.name}</Text>
          <Text style={styles.orgId}>Org ID: {organization.id}</Text>
        </>
      ) : profile?.organization_id ? (
        <Text style={styles.orgId}>Org ID: {profile.organization_id} (Loading organization details...)</Text>
      ) : null}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563eb']}
              tintColor="#2563eb"
            />
          }
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
  organizationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
    textAlign: 'center',
  },
  orgId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
}); 