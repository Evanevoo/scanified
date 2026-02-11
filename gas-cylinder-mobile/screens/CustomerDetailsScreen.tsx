import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../components/design-system';

export default function CustomerDetailsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const scrollPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 24 : Math.max(insets.bottom, 24) + 24;
  const params = (route?.params ?? {}) as { customerId?: string };
  const customerId = params.customerId ?? '';
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const [customer, setCustomer] = useState<any>(null);
  const [cylinders, setCylinders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      if (!customerId) {
        if (isMounted) {
          setError('No customer specified');
          setLoading(false);
        }
        return;
      }
      if (!profile?.organization_id) {
        if (isMounted) {
          setError('Organization not found');
          setLoading(false);
        }
        return;
      }

      logger.log('🔍 Fetching customer details for ID:', customerId);
      logger.log('🔍 Organization ID:', profile.organization_id);

      setLoading(true);
      setError('');

      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', customerId)
        .eq('organization_id', profile.organization_id)
        .single();

      logger.log('🔍 Customer query result:', { data: cust, error: custErr });

      if (custErr || !cust) {
        logger.log('❌ Customer not found:', custErr);
        if (isMounted) {
          setError('Customer not found.');
          setLoading(false);
        }
        return;
      }

      logger.log('✅ Customer found:', cust.name);
      if (isMounted) setCustomer(cust);

      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('assigned_customer', customerId);

      logger.log('🔍 Cylinders query result:', { data, error });

      if (error) {
        logger.log('❌ Error fetching cylinders:', error);
        if (isMounted) {
          setError('Error fetching cylinders.');
          setLoading(false);
        }
        return;
      }

      logger.log('✅ Found cylinders:', data?.length || 0);
      if (isMounted) {
        setCylinders(data || []);
        setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [customerId, profile]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading customer...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} style={{ marginBottom: 12 }} />
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: scrollPaddingBottom, backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <ModernCard elevated style={styles.headerCard}>
        <Text style={[styles.title, { color: colors.primary }]} numberOfLines={2}>
          {customer.name}
        </Text>
        {customer.barcode ? (
          <Text style={[styles.barcodeLabel, { color: colors.textSecondary }]}>
            Barcode: {customer.barcode}
          </Text>
        ) : null}
      </ModernCard>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTACT</Text>
      <ModernCard elevated={false} style={styles.infoCard}>
        {customer.contact_details ? (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <Text style={[styles.value, { color: colors.text }]}>{customer.contact_details}</Text>
          </View>
        ) : null}
        {customer.phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <Text style={[styles.value, { color: colors.text }]}>{customer.phone}</Text>
          </View>
        ) : null}
        {!customer.contact_details && !customer.phone && (
          <Text style={[styles.value, { color: colors.textSecondary }]}>No contact details</Text>
        )}
      </ModernCard>

      {fullAddress ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ADDRESS</Text>
          <ModernCard elevated={false} style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.value, { color: colors.text }]}>{fullAddress}</Text>
            </View>
          </ModernCard>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {assetConfig?.assetDisplayNamePlural?.toUpperCase() || 'CYLINDERS'} RENTED
      </Text>
      {cylinders.length === 0 ? (
        <ModernCard elevated={false} style={styles.emptyCard}>
          <Ionicons name="flask-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {assetConfig?.assetDisplayNamePlural?.toLowerCase() || 'cylinders'} currently rented.
          </Text>
        </ModernCard>
      ) : (
        cylinders.map((cyl, idx) => (
          <ModernCard
            key={cyl.barcode_number + idx}
            onPress={() => navigation.navigate('CylinderDetails', { barcode: cyl.barcode_number })}
            elevated
            style={styles.cylinderCard}
          >
            <View style={styles.cylinderRow}>
              <View style={[styles.cylinderIconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="barcode-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cylinderContent}>
                <Text style={[styles.cylinderBarcode, { color: colors.text }]}>{cyl.barcode_number}</Text>
                <Text style={[styles.cylinderMeta, { color: colors.textSecondary }]}>
                  Serial: {cyl.serial_number} • {cyl.group_name || '—'} • {cyl.status || 'Unknown'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </ModernCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  headerCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  barcodeLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  infoCard: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoIcon: {
    marginRight: 12,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
  },
  cylinderCard: {
    marginBottom: 10,
  },
  cylinderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cylinderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cylinderContent: {
    flex: 1,
  },
  cylinderBarcode: {
    fontSize: 16,
    fontWeight: '600',
  },
  cylinderMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});
