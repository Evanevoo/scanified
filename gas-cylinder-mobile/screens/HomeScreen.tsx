import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform } from '../utils/platform';

// Quick Actions Configuration - will be updated with dynamic terms
const getQuickActions = (config) => [
  {
    title: `Scan ${config?.assetDisplayNamePlural || 'Cylinders'}`,
    subtitle: 'Scan for shipping or returns',
    icon: '📷',
    action: 'ScanCylinders',
    color: '#2563eb'
  },
  {
    title: `Add ${config?.assetDisplayName || 'Cylinder'}`,
    subtitle: `Add new ${config?.assetDisplayName?.toLowerCase() || 'cylinder'} to inventory`,
    icon: '➕',
    action: 'AddCylinder',
    color: '#10B981'
  },
  {
    title: `Edit ${config?.assetDisplayName || 'Cylinder'}`,
    subtitle: `Modify ${config?.assetDisplayName?.toLowerCase() || 'cylinder'} details`,
    icon: '✏️',
    action: 'EditCylinder',
    color: '#F59E0B'
  },
  {
    title: `Locate ${config?.assetDisplayName || 'Cylinder'}`,
    subtitle: `Find ${config?.assetDisplayName?.toLowerCase() || 'cylinder'} location`,
    icon: '🔍',
    action: 'LocateCylinder',
    color: '#8B5CF6'
  },
  {
    title: `Fill ${config?.assetDisplayName || 'Cylinder'}`,
    subtitle: `Mark ${config?.assetDisplayName?.toLowerCase() || 'cylinder'} as filled`,
    icon: '⛽',
    action: 'FillCylinder',
    color: '#EF4444'
  },
  {
    title: 'History',
    subtitle: 'View scan history',
    icon: '📊',
    action: 'History',
    color: '#6B7280'
  }
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  
  // Debug asset config
  useEffect(() => {
    console.log('🏠 HomeScreen - Asset config:', {
      appName: assetConfig.appName,
      organization: organization?.app_name || organization?.name
    });
  }, [assetConfig.appName, organization]);
  
  const [search, setSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [bottleResults, setBottleResults] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingBottles, setLoadingBottles] = useState(false);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    unreadScans: 0
  });

  useEffect(() => {
    if (search.length > 0) {
      searchCustomers();
      searchBottles();
    } else {
      setCustomerResults([]);
      setBottleResults([]);
    }
  }, [search, profile]);

  // Debug function to test basic data access
  const testDataAccess = async () => {
    if (!profile?.organization_id) return;
    
    console.log('🧪 Testing basic data access...');
    
    // Test customers table
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('CustomerListID, name, barcode')
      .eq('organization_id', profile.organization_id)
      .limit(3);
    
    console.log('🧪 Customers test:', { data: customers, error: customerError });
    
    // Test bottles table
    const { data: bottles, error: bottleError } = await supabase
      .from('bottles')
      .select('barcode_number, customer_name')
      .eq('organization_id', profile.organization_id)
      .limit(3);
    
    console.log('🧪 Bottles test:', { data: bottles, error: bottleError });
  };

  useEffect(() => {
    if (profile?.organization_id) {
      testDataAccess();
    }
  }, [profile]);

  // Refresh stats when screen comes into focus (e.g., after returning from scan)
  useFocusEffect(
    React.useCallback(() => {
      if (profile?.organization_id) {
        console.log('🔄 Screen focused, refreshing stats...');
        fetchDashboardStats();
        fetchUnreadCount();
      }
    }, [profile?.organization_id])
  );

  const searchCustomers = async () => {
    if (!profile?.organization_id) {
      console.log('No organization found, skipping customer search');
      console.log('Profile data:', profile);
      console.log('User authenticated:', !!profile);
      return;
    }

    console.log('🔍 Starting customer search for:', search.trim());
    console.log('🔍 Organization ID:', profile.organization_id);

    setLoadingCustomers(true);
    try {
      // Search by name only (most reliable)
      let nameQuery = supabase
        .from('customers')
        .select('CustomerListID, name, barcode, contact_details')
        .eq('organization_id', profile.organization_id);
      
      if (search.trim().length === 1) {
        nameQuery = nameQuery.ilike('name', `${search.trim()}%`);
      } else {
        nameQuery = nameQuery.ilike('name', `%${search.trim()}%`);
      }
      
      console.log('🔍 Executing name query...');
      const nameResult = await nameQuery.limit(10);
      console.log('🔍 Name query result:', nameResult);
      
      let allCustomers = nameResult.data || [];
      
      // Try barcode search if barcode column exists
      try {
        let barcodeQuery = supabase
          .from('customers')
          .select('CustomerListID, name, barcode, contact_details')
          .eq('organization_id', profile.organization_id)
          .ilike('barcode', `%${search.trim()}%`);
        
        console.log('🔍 Executing barcode query...');
        const barcodeResult = await barcodeQuery.limit(10);
        console.log('🔍 Barcode query result:', barcodeResult);
        
        if (barcodeResult.data) {
          allCustomers = [...allCustomers, ...barcodeResult.data];
        }
      } catch (barcodeError) {
        console.log('⚠️ Barcode search failed (column may not exist):', barcodeError);
      }
      
      // Remove duplicates
      const uniqueCustomers = (allCustomers || []).filter((customer, index, self) =>
        index === self.findIndex((c) => c.CustomerListID === customer.CustomerListID)
      );
      
      console.log('🔍 Combined customers:', uniqueCustomers.length);
      
      if (uniqueCustomers.length > 0) {
        const results = await Promise.all(uniqueCustomers.map(async (customer) => {
          try {
            const { data: assets } = await supabase
              .from('bottles')
              .select('group_name')
              .eq('organization_id', profile.organization_id)
              .eq('assigned_customer', customer.CustomerListID);
            return {
              ...customer,
              gases: Array.from(new Set((assets || []).map(c => c.group_name))).filter(Boolean),
            };
          } catch (error) {
            console.log('⚠️ Error fetching customer assets:', error);
            return {
              ...customer,
              gases: [],
            };
          }
        }));
        console.log('🔍 Final results:', results.length);
        setCustomerResults(results);
      } else {
        console.log('🔍 No customers found, setting empty results');
        setCustomerResults([]);
      }
    } catch (error) {
      console.error('❌ Error searching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchBottles = async () => {
    if (!profile?.organization_id) {
      console.log('No organization found, skipping bottle search');
      console.log('Profile data:', profile);
      console.log('User authenticated:', !!profile);
      return;
    }

    console.log('🔍 Starting bottle search for:', search.trim());
    console.log('🔍 Organization ID:', profile.organization_id);

    setLoadingBottles(true);
    try {
      const { data: assets, error } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .eq('organization_id', profile.organization_id)
        .ilike('barcode_number', `%${search.trim()}%`)
        .limit(5);
      
      console.log('🔍 Bottle query result:', { data: assets, error });
      
      if (!error && assets) {
        console.log('🔍 Found bottles:', assets.length);
        setBottleResults(assets);
      } else {
        console.log('🔍 No bottles found or error:', error);
        setBottleResults([]);
      }
    } catch (error) {
      console.error('❌ Error searching bottles:', error);
    } finally {
      setLoadingBottles(false);
    }
  };

  useEffect(() => {
    if (profile?.organization_id) {
      fetchDashboardStats();
      fetchUnreadCount();
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    if (!profile?.organization_id) {
      console.log('No organization found, skipping stats fetch');
      return;
    }

    try {
      // Get total scans for this organization
      const { count: totalScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);

      // Get today's scans for this organization
      const today = new Date().toISOString().split('T')[0];
      const { count: todayScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .gte('created_at', today);

      setStats({
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        unreadScans: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!profile?.organization_id) {
      console.log('No organization found, skipping unread count fetch');
      console.log('Profile data:', profile);
      console.log('User authenticated:', !!profile);
      return;
    }

    try {
      const { count } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('read', false);
      
      setStats(prev => ({ ...prev, unreadScans: count || 0 }));
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'ScanCylinders':
        navigation.navigate('ScanCylinders');
        break;
      case 'AddCylinder':
        navigation.navigate('AddCylinder');
        break;
      case 'EditCylinder':
        navigation.navigate('EditCylinder');
        break;
      case 'LocateCylinder':
        navigation.navigate('LocateCylinder');
        break;
      case 'History':
        navigation.navigate('History');
        break;
      case 'FillCylinder':
        navigation.navigate('FillCylinder');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
            </Text>
            <Text style={[styles.appName, { color: colors.primary }]}>
              {organization?.app_name || organization?.name || assetConfig.appName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              onPress={() => navigation.navigate('RecentScans')}
            >
              <Text style={styles.headerButtonIcon}>🔔</Text>
              {stats.unreadScans > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.surface }]}>{stats.unreadScans}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.headerButtonIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalScans}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Scans</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.todayScans}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.unreadScans}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unread</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.searchIcon}></Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search customers or ${assetConfig.assetTypePlural}...`}
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Search Results */}
        {search.trim().length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {customerResults.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.resultsHeader, { color: colors.primary }]}>Customers</Text>
                {customerResults.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.CustomerListID}_${index}`}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('CustomerDetails', { customerId: item.CustomerListID })}
                  >
                    <Text style={[styles.resultTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                      ID: {item.CustomerListID} • Gases: {item.gases.length > 0 ? item.gases.join(', ') : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {bottleResults.length > 0 && (
              <View style={styles.resultsSection}>
                                 <Text style={[styles.resultsHeader, { color: colors.primary }]}>{assetConfig.assetDisplayNamePlural}</Text>
                {bottleResults.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.barcode_number}_${index}`}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('CylinderDetails', { barcode: item.barcode_number })}
                  >
                    <Text style={[styles.resultTitle, { color: colors.text }]}>#{item.barcode_number}</Text>
                    <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                      {item.customer_name || 'Unassigned'} • {item.product_code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!loadingCustomers && !loadingBottles && customerResults.length === 0 && bottleResults.length === 0 && (
              <Text style={[styles.noResults, { color: colors.textSecondary }]}>No results found</Text>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {getQuickActions(assetConfig).map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickAction(action.action)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Text style={styles.actionIconText}>{action.icon}</Text>
                </View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'ios' && Platform.isPad ? 40 : 20,
    marginBottom: 24,
    gap: Platform.OS === 'ios' && Platform.isPad ? 20 : 12,
    maxWidth: Platform.OS === 'ios' && Platform.isPad ? 800 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResults: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultsSection: {
    paddingVertical: 8,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  noResults: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    maxWidth: Platform.OS === 'ios' && Platform.isPad ? 800 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  actionCard: {
    width: Platform.OS === 'ios' && Platform.isPad ? '31%' : '48%',
    padding: Platform.OS === 'ios' && Platform.isPad ? 24 : 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
}); 