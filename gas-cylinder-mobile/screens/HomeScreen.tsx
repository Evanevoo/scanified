import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

const QUICK_ACTIONS = [
  {
    title: 'Scan Cylinders',
    subtitle: 'Scan barcodes',
    icon: '📷',
    action: 'ScanCylinders',
    color: '#3B82F6',
  },
  {
    title: 'Add Cylinder',
    subtitle: 'Register new',
    icon: '➕',
    action: 'AddCylinder',
    color: '#10B981',
  },
  {
    title: 'Edit Details',
    subtitle: 'Update info',
    icon: '✏️',
    action: 'EditCylinder',
    color: '#F59E0B',
  },
  {
    title: 'Locate Item',
    subtitle: 'Find location',
    icon: '📍',
    action: 'LocateCylinder',
    color: '#EF4444',
  },
  {
    title: 'View History',
    subtitle: 'Past scans',
    icon: '📋',
    action: 'History',
    color: '#8B5CF6',
  },
  {
    title: 'Fill Status',
    subtitle: 'Update fill',
    icon: '🔧',
    action: 'FillCylinder',
    color: '#06B6D4',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [bottleResults, setBottleResults] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingBottles, setLoadingBottles] = useState(false);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    pendingActions: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchUnreadCount();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get total scans
      const { count: totalScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true });

      // Get today's scans
      const today = new Date().toISOString().split('T')[0];
      const { count: todayScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        pendingActions: 3, // Mock data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .is('read', false);
      if (!error) setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    if (search.trim().length === 0) {
      setCustomerResults([]);
      setBottleResults([]);
      return;
    }
    
    searchCustomers();
    searchBottles();
  }, [search]);

  const searchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      let query = supabase
        .from('customers')
        .select('CustomerListID, name, barcode, contact_details');
      
      if (search.trim().length === 1) {
        query = query.ilike('name', `${search.trim()}%`);
      } else {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      
      const { data: customers, error } = await query.limit(5);
      if (!error && customers) {
        const results = await Promise.all(customers.map(async (customer) => {
          const { data: bottles } = await supabase
            .from('bottles')
            .select('group_name')
            .eq('assigned_customer', customer.CustomerListID);
          return {
            ...customer,
            gases: Array.from(new Set((bottles || []).map(c => c.group_name))).filter(Boolean),
          };
        }));
        setCustomerResults(results);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchBottles = async () => {
    setLoadingBottles(true);
    try {
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .ilike('barcode_number', `%${search.trim()}%`)
        .limit(5);
      
      if (!error && bottles) {
        setBottleResults(bottles);
      }
    } catch (error) {
      console.error('Error searching bottles:', error);
    } finally {
      setLoadingBottles(false);
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
            <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome back!</Text>
            <Text style={[styles.appName, { color: colors.primary }]}>LessAnnoyingScan</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              onPress={() => navigation.navigate('RecentScans')}
            >
              <Text style={styles.headerButtonIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.surface }]}>{unreadCount}</Text>
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
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pendingActions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search customers or cylinders..."
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
                {customerResults.map(item => (
                  <TouchableOpacity
                    key={item.CustomerListID}
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
                <Text style={[styles.resultsHeader, { color: colors.primary }]}>Cylinders</Text>
                {bottleResults.map(item => (
                  <TouchableOpacity
                    key={item.barcode_number}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('EditCylinder', { barcode: item.barcode_number })}
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
            {QUICK_ACTIONS.map((action, index) => (
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
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
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
  },
  actionCard: {
    width: '48%',
    padding: 16,
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