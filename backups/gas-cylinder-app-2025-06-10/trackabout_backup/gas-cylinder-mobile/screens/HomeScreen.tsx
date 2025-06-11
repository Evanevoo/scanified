import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
        .from('scanned_cylinders')
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
        const { data: cylinders } = await supabase
          .from('cylinders')
          .select('group_name')
          .eq('assigned_customer', cust.CustomerListID);
        return {
          ...cust,
          gases: Array.from(new Set((cylinders || []).map(c => c.group_name))).filter(Boolean),
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
        .from('scanned_cylinders')
        .select('cylinder_barcode, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!error && data) setRecentScans(data);
    };
    fetchRecentScans();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Row: Settings and Notification */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.topIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate('RecentScans')}>
            <Text style={styles.topIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
        {/* 2x2 Button Grid */}
        <View style={styles.grid}>
          {BUTTONS.map((btn, idx) => (
            <TouchableOpacity
              key={btn.title}
              style={[styles.gridButton, { backgroundColor: btn.color, marginRight: idx % 2 === 0 ? 12 : 0, marginBottom: idx < 2 ? 12 : 0 }]}
              onPress={() => {
                if (btn.action === 'ScanCylinders') navigation.navigate('ScanCylinders');
                else if (btn.title === 'Edit') navigation.navigate('EditCylinder');
                else if (btn.title === 'Add New') navigation.navigate('AddCylinder');
                else if (btn.title === 'Locate') navigation.navigate('LocateCylinder');
                else if (btn.title === 'History') navigation.navigate('History');
              }}
            >
              <View style={styles.gridIconCircle}><Text style={styles.gridIcon}>{btn.icon}</Text></View>
              <Text style={styles.gridTitle}>{btn.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Customer Search Bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers by name"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.micCircle}><Text style={styles.micIcon}>🔍</Text></TouchableOpacity>
        </View>
        {search.trim().length > 0 && (
          <View style={styles.customerDropdown}>
            {loadingCustomers ? (
              <Text style={{ padding: 12, color: '#2563eb' }}>Loading...</Text>
            ) : customerResults.length === 0 ? (
              <Text style={{ padding: 12, color: '#888' }}>No customers found.</Text>
            ) : (
              customerResults.map(item => (
                <TouchableOpacity
                  key={item.CustomerListID}
                  style={styles.customerItem}
                  onPress={() => navigation.navigate('CustomerDetails', { customerId: item.CustomerListID })}
                >
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerDetail}>Barcode: {item.barcode}</Text>
                  <Text style={styles.customerDetail}>Contact: {item.contact_details}</Text>
                  <Text style={styles.customerDetail}>Gases: {item.gases.length > 0 ? item.gases.join(', ') : 'None'}</Text>
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  topIcon: {
    fontSize: 20,
    color: '#222',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF5A1F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
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
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
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
    color: '#222',
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#222',
    marginRight: 10,
  },
  micCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
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
    backgroundColor: '#F3F4F6',
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
    color: '#222',
  },
  customerDropdown: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    borderBottomColor: '#f1f1f1',
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 13,
    color: '#444',
    marginBottom: 1,
  },
}); 