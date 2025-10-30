import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { useTheme } from '../context/ThemeContext';

export default function CylinderDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { barcode } = route.params as { barcode: string };
  const { profile } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const { colors } = useTheme();
  const [cylinder, setCylinder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!profile?.organization_id && !authLoading) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching cylinder details for barcode:', barcode);
      console.log('🔍 Organization ID:', profile.organization_id);

      setLoading(true);
      setError('');
      
      // Fetch cylinder info
      const { data: cyl, error: cylErr } = await supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode)
        .eq('organization_id', profile.organization_id)
        .single();
      
      console.log('🔍 Cylinder query result:', { data: cyl, error: cylErr });
      
      if (cylErr || !cyl) {
        console.log('❌ Cylinder not found:', cylErr);
        setError(`${assetConfig?.assetDisplayName || 'Cylinder'} not found.`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Cylinder found:', cyl.barcode_number);
      setCylinder(cyl);
      
      // Fetch customer info if cylinder is assigned to a customer
      if (cyl.assigned_customer) {
        const { data: cust, error: custErr } = await supabase
          .from('customers')
          .select('CustomerListID, name, phone, email, address, city, province, postal_code')
          .eq('CustomerListID', cyl.assigned_customer)
          .eq('organization_id', profile.organization_id)
          .single();
          
        console.log('🔍 Customer query result:', { data: cust, error: custErr });
        
        if (!custErr && cust) {
          console.log('✅ Customer found:', cust.name);
          setCustomer(cust);
        }
      }
      
      setLoading(false);
    };
    fetchDetails();
  }, [barcode, profile]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading {assetConfig?.assetDisplayName || 'cylinder'} details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.surface }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.primary }]}>
          {assetConfig?.assetDisplayName || 'Cylinder'} Details
        </Text>
        <Text style={[styles.barcode, { color: colors.text }]}>#{cylinder.barcode_number}</Text>
      </View>

      {/* Basic Information */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Barcode:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.barcode_number}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Serial Number:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.serial_number}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Product Code:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.product_code || 'Not set'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Description:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.description || 'Not set'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Gas Type:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.group_name || cylinder.gas_type || 'Not set'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Status:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.status || 'Unknown'}</Text>
        </View>
      </View>

      {/* Location Information */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Location</Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Current Location:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            {cylinder.location ? cylinder.location.replace(/_/g, ' ') : 'Not set'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Days at Location:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.days_at_location || 0}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Last Location Update:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{formatDateTime(cylinder.last_location_update)}</Text>
        </View>
      </View>

      {/* Customer Assignment */}
      {customer && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Assigned Customer</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Customer Name:</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{customer.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Customer ID:</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{customer.CustomerListID}</Text>
          </View>
          
          {customer.phone && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>Phone:</Text>
              <Text style={[styles.value, { color: colors.textSecondary }]}>{customer.phone}</Text>
            </View>
          )}
          
          {customer.email && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>Email:</Text>
              <Text style={[styles.value, { color: colors.textSecondary }]}>{customer.email}</Text>
            </View>
          )}
          
          {(customer.address || customer.city) && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>Address:</Text>
              <Text style={[styles.value, { color: colors.textSecondary }]}>
                {[customer.address, customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Ownership Information */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ownership</Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Owner Type:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.owner_type || 'Organization'}</Text>
        </View>
        
        {cylinder.owner_name && (
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Owner Name:</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.owner_name}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Ownership:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.ownership || 'Not specified'}</Text>
        </View>
      </View>

      {/* Maintenance Information */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Maintenance & History</Text>
        
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Last Audited:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{formatDateTime(cylinder.last_audited)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Last Filled:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{formatDateTime(cylinder.last_filled_date)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Fill Count:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{cylinder.fill_count || 0}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text }]}>Last Maintenance:</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{formatDateTime(cylinder.last_maintenance)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EditCylinder', { barcode: cylinder.barcode_number })}
        >
          <Text style={[styles.actionButtonText, { color: colors.surface }]}>Edit {assetConfig?.assetDisplayName || 'Cylinder'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Back to Search</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  barcode: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
