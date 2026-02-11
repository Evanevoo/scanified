import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Modal, Dimensions, useWindowDimensions, Alert, Platform } from 'react-native';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform as PlatformUtil } from '../utils/platform';
import { soundService } from '../services/soundService';
import { ModernCard } from '../components/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { FormatValidationService } from '../services/FormatValidationService';
import ScanArea from '../components/ScanArea';
import { getStartOfTodayISO, getEndOfTodayISO } from '../utils/dateUtils';

const { width, height } = Dimensions.get('window');

// Quick Actions Configuration (Ionicons for design system)
const getQuickActions = () => [
  { title: 'Delivery', iconName: 'camera' as const, action: 'ScanCylinders', color: '#3B82F6' },
  { title: 'Add', iconName: 'add' as const, action: 'AddCylinder', color: '#10B981' },
  { title: 'Edit', iconName: 'pencil' as const, action: 'EditCylinder', color: '#F59E0B' },
  { title: 'Locate', iconName: 'location' as const, action: 'FillCylinder', color: '#EF4444' },
  { title: 'History', iconName: 'time' as const, action: 'History', color: '#06B6D4' },
  { title: 'Analytics', iconName: 'analytics' as const, action: 'Analytics', color: '#8B5CF6' },
];

const SMALL_SCREEN_WIDTH = 375;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < SMALL_SCREEN_WIDTH;

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
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (search.length > 0) {
      searchCustomers();
      searchBottles();
    } else {
      setCustomerResults([]);
      setBottleResults([]);
    }
  }, [search, profile]);



  // Refresh stats when screen comes into focus (e.g., after returning from scan)
  useFocusEffect(
    React.useCallback(() => {
      if (profile?.organization_id) {
        logger.log('🔄 Screen focused, refreshing stats...');
        fetchDashboardStats();
        fetchUnreadCount();
      }
    }, [profile?.organization_id])
  );

  const searchCustomerByName = async (possibleNames: string[]): Promise<{ name: string; id: string } | null> => {
    if (!profile?.organization_id || possibleNames.length === 0) return null;
    try {
      for (const name of possibleNames) {
        if (!name || name.length < 3) continue;
        const { data: customers } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('organization_id', profile.organization_id)
          .ilike('name', `%${name}%`)
          .limit(1);
        if (customers && customers.length > 0) {
          const found = customers[0];
          return { name: found.name, id: found.CustomerListID };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleOcrCustomerFound = (customer: { name: string; id: string }) => {
    setShowScanner(false);
    navigation.navigate('CustomerDetails', { customerId: customer.id });
  };

  const searchCustomers = async () => {
    if (!profile?.organization_id) {
      logger.log('No organization found, skipping customer search');
      logger.log('Profile data:', profile);
      logger.log('User authenticated:', !!profile);
      return;
    }

    logger.log('🔍 Starting customer search for:', search.trim());
    logger.log('🔍 Organization ID:', profile.organization_id);

    setLoadingCustomers(true);
    try {
      // Search by name only (most reliable) - prefix match (starts with)
      const searchTerm = search.trim();
      let nameQuery = supabase
        .from('customers')
        .select('CustomerListID, name, barcode, contact_details')
        .eq('organization_id', profile.organization_id)
        .ilike('name', `${searchTerm}%`);
      
      logger.log('🔍 Executing name query...');
      const nameResult = await nameQuery.limit(10);
      logger.log('🔍 Name query result:', nameResult);
      
      let allCustomers = nameResult.data || [];
      
      // Try barcode search if barcode column exists - barcodes start and end with *
      // Search for pattern *{searchTerm}* (e.g., if user types "6", find "*6*" or "*6001*")
      try {
        let barcodeQuery = supabase
          .from('customers')
          .select('CustomerListID, name, barcode, contact_details')
          .eq('organization_id', profile.organization_id)
          .ilike('barcode', `*${searchTerm}%`);
        
        logger.log('🔍 Executing barcode query...');
        const barcodeResult = await barcodeQuery.limit(10);
        logger.log('🔍 Barcode query result:', barcodeResult);
        
        if (barcodeResult.data) {
          allCustomers = [...allCustomers, ...barcodeResult.data];
        }
      } catch (barcodeError) {
        logger.log('⚠️ Barcode search failed (column may not exist):', barcodeError);
      }
      
      // Remove duplicates
      const uniqueCustomers = (allCustomers || []).filter((customer, index, self) =>
        index === self.findIndex((c) => c.CustomerListID === customer.CustomerListID)
      );
      
      logger.log('🔍 Combined customers:', uniqueCustomers.length);
      
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
            logger.log('⚠️ Error fetching customer assets:', error);
            return {
              ...customer,
              gases: [],
            };
          }
        }));
        logger.log('🔍 Final results:', results.length);
        setCustomerResults(results);
      } else {
        logger.log('🔍 No customers found, setting empty results');
        setCustomerResults([]);
      }
    } catch (error) {
      logger.error('❌ Error searching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchBottles = async () => {
    if (!profile?.organization_id) {
      logger.log('No organization found, skipping bottle search');
      logger.log('Profile data:', profile);
      logger.log('User authenticated:', !!profile);
      return;
    }

    logger.log('🔍 Starting bottle search for:', search.trim());
    logger.log('🔍 Organization ID:', profile.organization_id);

    setLoadingBottles(true);
    try {
      // Search by barcode_number or serial_number - prefix match (starts with)
      const searchTerm = search.trim();
      
      // Search by barcode_number
      const { data: barcodeAssets, error: barcodeError } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .eq('organization_id', profile.organization_id)
        .ilike('barcode_number', `${searchTerm}%`)
        .limit(5);
      
      // Search by serial_number
      const { data: serialAssets, error: serialError } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .eq('organization_id', profile.organization_id)
        .ilike('serial_number', `${searchTerm}%`)
        .limit(5);
      
      // Combine results and remove duplicates
      const allAssets = [...(barcodeAssets || []), ...(serialAssets || [])];
      const uniqueAssets = allAssets.filter((asset, index, self) =>
        index === self.findIndex((a) => a.barcode_number === asset.barcode_number && a.serial_number === asset.serial_number)
      );
      
      const assets = uniqueAssets.slice(0, 5);
      const error = barcodeError || serialError;
      
      logger.log('🔍 Bottle query result:', { data: assets, error });
      
      if (!error && assets) {
        logger.log('🔍 Found bottles:', assets.length);
        setBottleResults(assets);
      } else {
        logger.log('🔍 No bottles found or error:', error);
        setBottleResults([]);
      }
    } catch (error) {
      logger.error('❌ Error searching bottles:', error);
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
      logger.log('No organization found, skipping stats fetch');
      return;
    }

    try {
      // Get total scans for this user (filter by user_id)
      const { count: totalScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('user_id', profile.id);

      // Get today's scans for this user (local timezone: start to end of today)
      const startOfToday = getStartOfTodayISO();
      const endOfToday = getEndOfTodayISO();
      const { count: todayScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('user_id', profile.id)
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday);

      setStats({
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        unreadScans: 0
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!profile?.organization_id) {
      logger.log('No organization found, skipping unread count fetch');
      logger.log('Profile data:', profile);
      logger.log('User authenticated:', !!profile);
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
      logger.error('Error fetching unread count:', error);
    }
  };

  const handleQuickAction = async (action: string) => {
    // Play sound feedback for actions
    await soundService.playSound('action');
    
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
      case 'History':
        navigation.navigate('History');
        break;
      case 'FillCylinder':
        navigation.navigate('FillCylinder');
        break;
      case 'Analytics':
        navigation.navigate('Analytics');
        break;
      default:
        logger.log('Unknown action:', action);
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={colors.gradient || [colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, isSmallScreen && { paddingBottom: 14, marginBottom: 14 }]}
        >
          <View style={[styles.header, isSmallScreen && { paddingHorizontal: 14, paddingVertical: 8 }]}>
            <View style={[styles.headerContent, isSmallScreen && { minWidth: 0, flex: 1 }]}>
              <Text style={[styles.welcomeText, isSmallScreen && { fontSize: 14 }]} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.75}>
                Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
              </Text>
              <Text style={[styles.appName, isSmallScreen && { fontSize: 13, marginTop: 1 }]} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.65}>
                {organization?.app_name || organization?.name || assetConfig.appName}
              </Text>
            </View>
            <View style={[styles.headerActions, isSmallScreen && { gap: 8 }]}>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => navigation.navigate('RecentScans')}
                accessibilityLabel="Recent scans"
                accessibilityRole="button"
              >
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {stats.unreadScans > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text style={[styles.badgeText, { color: '#fff' }]}>{stats.unreadScans}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar */}
        <View style={[styles.searchContainer, isSmallScreen && { paddingHorizontal: 14, marginBottom: 16 }]}>
          <ModernCard elevated={false} style={styles.searchBarCard}>
            <View style={[styles.searchBar, isSmallScreen && { paddingHorizontal: 12, paddingVertical: 10 }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }, isSmallScreen && { fontSize: 15 }]}
                placeholder={`Search customers or ${assetConfig.assetTypePlural}...`}
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setSearch('')}
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                accessibilityLabel="Barcode Scanner"
                accessibilityHint="Open barcode scanner"
                onPress={() => {
                  logger.log('📷 MLKit: Opening scanner from HomeScreen');
                  setShowScanner(true);
                  setScanned(false);
                }}
              >
                <Ionicons name="camera" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </ModernCard>
        </View>

        {/* Search Results */}
        {search.trim().length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }, isSmallScreen && { marginHorizontal: 14 }]}>
            {customerResults.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.resultsHeader, { color: colors.primary }, isSmallScreen && { fontSize: 13 }]}>Customers</Text>
                {customerResults.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.CustomerListID}_${index}`}
                    style={[styles.resultItem, { borderBottomColor: colors.border }, isSmallScreen && { paddingHorizontal: 12, paddingVertical: 10 }]}
                    onPress={() => navigation.navigate('CustomerDetails', { customerId: item.CustomerListID })}
                  >
                    <Text style={[styles.resultTitle, { color: colors.text }, isSmallScreen && { fontSize: 15 }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                    <Text style={[styles.resultSubtitle, { color: colors.textSecondary }, isSmallScreen && { fontSize: 13, marginTop: 2 }]} numberOfLines={1} ellipsizeMode="tail">
                      ID: {item.CustomerListID} • Gases: {item.gases.length > 0 ? item.gases.join(', ') : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {bottleResults.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.resultsHeader, { color: colors.primary }, isSmallScreen && { fontSize: 13 }]}>{assetConfig.assetDisplayNamePlural}</Text>
                {bottleResults.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.barcode_number}_${index}`}
                    style={[styles.resultItem, { borderBottomColor: colors.border }, isSmallScreen && { paddingHorizontal: 12, paddingVertical: 10 }]}
                    onPress={() => navigation.navigate('CylinderDetails', { barcode: item.barcode_number })}
                  >
                    <Text style={[styles.resultTitle, { color: colors.text }, isSmallScreen && { fontSize: 15 }]} numberOfLines={1} ellipsizeMode="tail">#{item.barcode_number}</Text>
                    <Text style={[styles.resultSubtitle, { color: colors.textSecondary }, isSmallScreen && { fontSize: 13, marginTop: 2 }]} numberOfLines={1} ellipsizeMode="tail">
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
        <View style={[styles.quickActionsContainer, isSmallScreen && { paddingHorizontal: 14, paddingBottom: 14 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: '800' }, isSmallScreen && { fontSize: 18, marginBottom: 12 }]}>Quick Actions</Text>
          <View style={[styles.actionsGrid, isSmallScreen && { gap: 10 }]}>
            {getQuickActions().map((action, index) => (
              <ModernCard
                key={index}
                onPress={() => handleQuickAction(action.action)}
                elevated
                style={[styles.actionCard, isSmallScreen && { padding: 12, minWidth: 0 }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }, isSmallScreen && { width: 36, height: 36, marginBottom: 6 }]}>
                  <Ionicons name={action.iconName} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionTitle, { color: colors.text, fontWeight: '700' }, isSmallScreen && { fontSize: 11 }]} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.8}>{action.title}</Text>
              </ModernCard>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Scanner */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScanArea
            searchCustomerByName={searchCustomerByName}
            onCustomerFound={handleOcrCustomerFound}
            onScanned={async (data: string) => {
              if (scanned || !data) return;
              logger.log('📷 Barcode scanned in HomeScreen:', data);
              setScanned(true);
              let cleanedBarcode = data.trim().replace(/^\*+|\*+$/g, '');
              if (!cleanedBarcode) {
                setScanned(false);
                return;
              }
              setShowScanner(false);
              try {
                if (!profile?.organization_id) {
                  setSearch(cleanedBarcode);
                  setTimeout(() => { searchCustomers(); searchBottles(); }, 100);
                  return;
                }
                const formats = await FormatValidationService.getOrganizationFormats(profile.organization_id);
                const isSalesReceipt = cleanedBarcode.startsWith('%');
                const cylinderPattern = formats.cylinder_serial_format?.pattern || '^[0-9]{9}$';
                const cylinderRegex = new RegExp(cylinderPattern);
                const isCylinder = cylinderRegex.test(cleanedBarcode);
                if (isSalesReceipt) {
                  const { data: customer } = await supabase
                    .from('customers')
                    .select('CustomerListID')
                    .eq('organization_id', profile.organization_id)
                    .ilike('barcode', `*${cleanedBarcode}*`)
                    .limit(1)
                    .single();
                  if (customer) {
                    navigation.navigate('CustomerDetails', { customerId: customer.CustomerListID });
                    return;
                  }
                } else if (isCylinder) {
                  navigation.navigate('CylinderDetails', { barcode: cleanedBarcode });
                  return;
                }
                setSearch(cleanedBarcode);
                setTimeout(() => { searchCustomers(); searchBottles(); }, 100);
              } catch (error) {
                logger.error('❌ Error processing barcode:', error);
                setSearch(cleanedBarcode);
                setTimeout(() => { searchCustomers(); searchBottles(); }, 100);
              }
            }}
            onClose={() => setShowScanner(false)}
            label=""
            validationPattern={/^[\dA-Za-z\-%*]+$/}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
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
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.95,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    color: '#ffffff',
    opacity: 0.95,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
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
    paddingHorizontal: Platform.OS === 'ios' && PlatformUtil.isPad ? 40 : 20,
    marginBottom: 24,
    gap: Platform.OS === 'ios' && PlatformUtil.isPad ? 20 : 12,
    maxWidth: Platform.OS === 'ios' && PlatformUtil.isPad ? 800 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  statCardWrapper: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBarCard: {
    marginBottom: 0,
    padding: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fullscreenWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCamera: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  scanFrame: {
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  closeCameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  flashButton: {
    position: 'absolute',
    top: 50,
    right: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: Platform.OS === 'ios' && PlatformUtil.isPad ? 800 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  actionCard: {
    width: Platform.OS === 'ios' && PlatformUtil.isPad ? '31%' : '48%',
    padding: Platform.OS === 'ios' && PlatformUtil.isPad ? 16 : 14,
    alignItems: 'center',
    marginBottom: 0,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 