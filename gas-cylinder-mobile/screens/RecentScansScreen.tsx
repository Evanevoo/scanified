import logger from '../utils/logger';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../components/design-system';
import { formatDateTimeLocal } from '../utils/dateUtils';

export default function RecentScansScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, organization, loading: authLoading } = useAuth();
  const listPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 16 : Math.max(insets.bottom, 24) + 24;
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Recent Synced Scans</Text>
      {organization ? (
        <>
          <Text style={[styles.organizationName, { color: colors.primary }]}>Organization: {organization.name}</Text>
          <Text style={[styles.orgId, { color: colors.textSecondary }]}>Org ID: {organization.id}</Text>
        </>
      ) : profile?.organization_id ? (
        <Text style={[styles.orgId, { color: colors.textSecondary }]}>Org ID: {profile.organization_id} (Loading organization details...)</Text>
      ) : null}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scans...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barcode-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No recent scans found.</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingHorizontal: 4 }}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <ModernCard elevated={false} style={styles.scanItem}>
              <View style={styles.scanRow}>
                <View style={[styles.scanIconWrap, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="barcode-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.scanContent}>
                  <Text style={[styles.scanBarcode, { color: colors.primary }]}>Barcode: {item.bottle_barcode || item.barcode_number}</Text>
                  <Text style={[styles.scanOrder, { color: colors.text }]}>Order: {item.order_number}</Text>
                  <Text style={[styles.scanCustomer, { color: colors.textSecondary }]}>Customer: {item.customer_name || '-'}</Text>
                  <Text style={[styles.scanTime, { color: colors.textSecondary }]}>{formatDateTimeLocal(item.created_at)}</Text>
                </View>
              </View>
            </ModernCard>
          )}
          ListEmptyComponent={!error ? <Text style={[styles.empty, { color: colors.textSecondary, textAlign: 'center', marginTop: 24 }]}>No recent scans found.</Text> : null}
          style={{ marginTop: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
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
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  loadingWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  scanItem: {
    marginBottom: 12,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanContent: {
    flex: 1,
  },
  scanBarcode: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanOrder: {
    fontSize: 15,
    marginTop: 2,
  },
  scanCustomer: {
    fontSize: 14,
    marginTop: 2,
  },
  scanTime: {
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  empty: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  organizationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  orgId: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
}); 