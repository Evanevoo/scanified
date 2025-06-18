import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

const BUTTONS = [
  {
    title: 'Scan',
    color: '#F5F5DC',
    icon: '🛢️',
    action: 'ScanCylinders',
  },
  {
    title: 'Edit',
    color: '#FFF3B0',
    icon: '📝',
  },
  {
    title: 'Locate',
    color: '#E6F4D8',
    icon: '📍',
  },
  {
    title: 'Add New',
    color: '#FFE4B8',
    icon: '➕',
  },
  {
    title: 'History',
    color: '#D1E8FF',
    icon: '🕓',
  },
  {
    title: 'Fill',
    color: '#D1FFD6',
    icon: '💧',
  },
];

const FILES = [
  { name: 'Strategy-Pitch-Final.xls', icon: '📄', color: '#E6F4D8' },
  { name: 'user-journey-01.jpg', icon: '🖼️', color: '#E6F4D8' },
  { name: 'Invoice-oct-2024.doc', icon: '📄', color: '#FFE4B8' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState([]);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      // Adjust the filter as needed for your schema
      const { count, error } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .is('read', false);
      if (!error) setUnreadCount(count || 0);
    };
    fetchUnreadCount();
    // Optionally, poll every 10s for updates
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (search.trim().length === 0) {
      setCustomerResults([]);
      return;
    }
    setLoadingCustomers(true);
    // Fetch customers matching the search
    const fetchCustomers = async () => {
      let query = supabase
        .from('customers')
        .select('CustomerListID, name, barcode, contact_details');
      if (search.trim().length === 1) {
        // If only one letter, match names starting with that letter
        query = query.ilike('name', `${search.trim()}%`);
      } else {
        // If more than one character, match names containing the word
        query = query.ilike('name', `%${search.trim()}%`);
      }
      query = query.limit(10);
      const { data: custs, error } = await query;
      if (error || !custs) {
        setCustomerResults([]);
        setLoadingCustomers(false);
        return;
      }
      // For each customer, fetch their rented gases
      const results = await Promise.all(custs.map(async (cust) => {
        const { data: bottles } = await supabase
          .from('bottles')
          .select('group_name')
          .eq('assigned_customer', cust.CustomerListID);
        return {
          ...cust,
          gases: Array.from(new Set((bottles || []).map(c => c.group_name))).filter(Boolean),
        };
      }));
      setCustomerResults(results);
      setLoadingCustomers(false);
    };
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    // Fetch recent scans for the bottom grid
    const fetchRecentScans = async () => {
      const { data, error } = await supabase
        .from('bottle_scans')
        .select('bottle_barcode, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!error && data) setRecentScans(data);
    };
    fetchRecentScans();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Row: Settings and Notification */}
        <View style={styles.topRow}>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.topIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('RecentScans')}>
            <Text style={styles.topIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}><Text style={[styles.badgeText, { color: colors.surface }]}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
        {/* 2x2 Button Grid */}
        <View style={styles.grid}>
          {BUTTONS.map((btn, idx) => (
            <TouchableOpacity
              key={btn.title}
              style={[styles.gridButton, { backgroundColor: colors.surface, borderColor: colors.border, marginRight: idx % 2 === 0 ? 12 : 0, marginBottom: idx < 2 ? 12 : 0 }]}
              onPress={() => {
                if (btn.action === 'ScanCylinders') navigation.navigate('ScanCylinders');
                else if (btn.title === 'Edit') navigation.navigate('EditCylinder');
                else if (btn.title === 'Add New') navigation.navigate('AddCylinder');
                else if (btn.title === 'Locate') navigation.navigate('LocateCylinder');
                else if (btn.title === 'History') navigation.navigate('History');
                else if (btn.title === 'Fill') navigation.navigate('FillCylinder');
              }}
            >
              <View style={[styles.gridIconCircle, { backgroundColor: colors.primary }]}><Text style={styles.gridIcon}>{btn.icon}</Text></View>
              <Text style={[styles.gridTitle, { color: colors.text }]}>{btn.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Customer Search Bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Search customers by name"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={[styles.micCircle, { backgroundColor: colors.primary }]}><Text style={styles.micIcon}>🔍</Text></TouchableOpacity>
        </View>
        {search.trim().length > 0 && (
          <View style={[styles.customerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loadingCustomers ? (
              <Text style={{ padding: 12, color: colors.primary }}>Loading...</Text>
            ) : customerResults.length === 0 ? (
              <Text style={{ padding: 12, color: colors.textSecondary }}>No customers found.</Text>
            ) : (
              customerResults.map(item => (
                <TouchableOpacity
                  key={item.CustomerListID}
                  style={[styles.customerItem, { borderBottomColor: colors.border }]}
                  onPress={() => navigation.navigate('CustomerDetails', { customerId: item.CustomerListID })}
                >
                  <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>Barcode: {item.barcode}</Text>
                  <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>Contact: {item.contact_details}</Text>
                  <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>Gases: {item.gases.length > 0 ? item.gases.join(', ') : 'None'}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingTop: 10,
    flexGrow: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  topIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  gridButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    padding: 18,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  gridIcon: {
    fontSize: 24,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
  },
  micCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  micIcon: {
    fontSize: 20,
  },
  filesRow: {
    flexGrow: 0,
    marginBottom: 10,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  fileIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
  },
  customerDropdown: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10,
  },
  customerItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 13,
    marginBottom: 1,
  },
}); 