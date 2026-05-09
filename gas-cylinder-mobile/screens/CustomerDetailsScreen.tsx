import logger from '../utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../components/design-system';

type LeaseStatus = 'active' | 'scheduled' | 'expired' | 'none';

const parseLocalDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;
  const dateOnly = String(value).split('T')[0];
  const parts = dateOnly.split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatLeaseDate = (value?: string | null): string | null => {
  const d = parseLocalDateOnly(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function CustomerDetailsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const scrollPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 24 : Math.max(insets.bottom, 24) + 24;
  const params = (route?.params ?? {}) as { customerId?: string };
  const customerId = params.customerId ?? '';
  const { profile, loading: authLoading, organizationLoading } = useAuth();
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const [customer, setCustomer] = useState<any>(null);
  const [cylinders, setCylinders] = useState<any[]>([]);
  const [leaseContract, setLeaseContract] = useState<any>(null);
  const [leaseItemCount, setLeaseItemCount] = useState<number>(0);
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
      if (authLoading || organizationLoading) {
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

      let { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', customerId)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (!cust && !custErr) {
        const fallback = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('organization_id', profile.organization_id)
          .maybeSingle();
        cust = fallback.data;
        custErr = fallback.error;
      }

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
        .eq('assigned_customer', cust.CustomerListID || customerId);

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
      }

      // Lease lookup. Try lease_agreements (the active table in this project) first,
      // then fall back to lease_contracts (newer schema) if it's deployed. Match by
      // any of the customer keys (CustomerListID, UUID, route param), normalized to
      // handle whitespace/case mismatches.
      const normKey = (v: any) => String(v || '').trim().toLowerCase();
      const customerKeys = [cust.CustomerListID, cust.id, customerId]
        .filter(Boolean)
        .map(String);
      const normalizedKeys = new Set(customerKeys.map(normKey));

      const fetchAgreementsFromTable = async (tableName: string) => {
        const { data, error: tblErr } = await supabase
          .from(tableName)
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('start_date', { ascending: false });
        if (tblErr) {
          // 42P01 = relation does not exist; ignore so we can fall through.
          if (tblErr.code !== '42P01') {
            logger.log(`⚠️ Error fetching ${tableName}:`, tblErr);
          }
          return null;
        }
        return data || [];
      };

      let agreements = await fetchAgreementsFromTable('lease_agreements');
      if (agreements === null) {
        agreements = await fetchAgreementsFromTable('lease_contracts');
      }

      const matchingAgreements = (agreements || []).filter((row) =>
        normalizedKeys.has(normKey(row.customer_id))
      );

      logger.log('🔍 Lease agreements found for customer:', matchingAgreements.length);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickActive = (rows: any[]) => {
        if (rows.length === 0) return null;
        const live = rows.filter((row) => {
          const status = String(row.status || '').toLowerCase();
          return status !== 'cancelled' && status !== 'expired' && status !== 'renewed';
        });
        const pool = live.length ? live : rows;
        const inWindow = pool.find((row) => {
          const start = parseLocalDateOnly(row.start_date);
          const end = parseLocalDateOnly(row.end_date);
          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(0, 0, 0, 0);
          const startedOk = !start || start <= today;
          const notExpired = !end || end >= today;
          return startedOk && notExpired;
        });
        return inWindow || pool[0];
      };
      const activeContract = pickActive(matchingAgreements);

      if (isMounted) {
        setLeaseContract(activeContract);
        setLeaseItemCount(matchingAgreements.length);
      }

      if (isMounted) setLoading(false);
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [customerId, profile?.organization_id, authLoading, organizationLoading]);

  const leaseSummary = useMemo<{
    status: LeaseStatus;
    label: string;
    helper: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }>(() => {
    if (!leaseContract) {
      return {
        status: 'none',
        label: 'No active lease',
        helper: 'No lease agreement is linked to this customer.',
        color: colors.textSecondary,
        icon: 'document-outline',
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseLocalDateOnly(leaseContract.start_date);
    const end = parseLocalDateOnly(leaseContract.end_date);
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);
    const isScheduled = !!(start && start > today);
    const isExpired = !!(end && end < today);
    const isActive = !isScheduled && !isExpired;

    const startStr = formatLeaseDate(leaseContract.start_date);
    const endStr = formatLeaseDate(leaseContract.end_date) || 'no end date';
    const dateBits: string[] = [];
    if (startStr) dateBits.push(`Starts ${startStr}`);
    dateBits.push(`Ends ${endStr}`);
    const agreementNum = leaseContract.agreement_number ? `Agreement #${leaseContract.agreement_number}` : null;
    const countBit = leaseItemCount > 1 ? `${leaseItemCount} agreements on file` : null;
    const headerBits = [agreementNum, countBit].filter(Boolean) as string[];
    const helper = headerBits.length
      ? `${headerBits.join(' · ')}. ${dateBits.join(' • ')}.`
      : `${dateBits.join(' • ')}.`;

    if (isActive) {
      return {
        status: 'active',
        label: 'Active lease',
        helper,
        color: colors.success || '#10B981',
        icon: 'shield-checkmark-outline',
      };
    }
    if (isScheduled) {
      return {
        status: 'scheduled',
        label: 'Scheduled lease',
        helper,
        color: colors.info || colors.primary,
        icon: 'time-outline',
      };
    }
    return {
      status: 'expired',
      label: 'Expired lease',
      helper,
      color: colors.warning || '#F59E0B',
      icon: 'alert-circle-outline',
    };
  }, [leaseContract, leaseItemCount, colors]);

  if (loading || authLoading || organizationLoading) {
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
        <View
          style={[
            styles.leaseBadge,
            {
              backgroundColor: leaseSummary.color + '1A',
              borderColor: leaseSummary.color + '55',
            },
          ]}
        >
          <Ionicons name={leaseSummary.icon} size={14} color={leaseSummary.color} style={{ marginRight: 6 }} />
          <Text style={[styles.leaseBadgeText, { color: leaseSummary.color }]} numberOfLines={1}>
            Lease: {leaseSummary.status === 'none' ? 'None' : leaseSummary.label.replace(' lease', '')}
          </Text>
        </View>
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

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LEASE AGREEMENT</Text>
      <ModernCard elevated={false} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View
            style={[
              styles.leaseIconWrap,
              { backgroundColor: leaseSummary.color + '1F' },
            ]}
          >
            <Ionicons name={leaseSummary.icon} size={20} color={leaseSummary.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.leaseLabel, { color: leaseSummary.color }]}>{leaseSummary.label}</Text>
            <Text style={[styles.leaseHelper, { color: colors.textSecondary }]}>{leaseSummary.helper}</Text>
          </View>
        </View>
      </ModernCard>

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
  leaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  leaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  leaseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaseLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  leaseHelper: {
    fontSize: 13,
    lineHeight: 18,
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
