import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Modal, Dimensions, Alert } from 'react-native';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform } from '../utils/platform';
import { soundService } from '../services/soundService';
import { StatCard, ModernCard, MobileCard, MobileButton } from '../components/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import ExpoCameraScanner from '../components/ExpoCameraScanner';
import { FormatValidationService } from '../services/FormatValidationService';

const { width, height } = Dimensions.get('window');

// Quick Actions Configuration
const getQuickActions = () => [
  { title: 'Delivery', icon: '📷', action: 'ScanCylinders', color: '#3B82F6' },
  { title: 'Add', icon: '➕', action: 'AddCylinder', color: '#10B981' },
  { title: 'Edit', icon: '✏️', action: 'EditCylinder', color: '#F59E0B' },
  { title: 'Locate', icon: '📍', action: 'FillCylinder', color: '#EF4444' },
  { title: 'History', icon: '📊', action: 'History', color: '#06B6D4' },
  { title: 'Analytics', icon: '📈', action: 'Analytics', color: '#8B5CF6' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
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
  const [permission, requestPermission] = useCameraPermissions();

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
      // Search by name - substring match (characters appear in order anywhere in name)
      const searchTerm = search.trim();
      let nameQuery = supabase
        .from('customers')
        .select('CustomerListID, name, barcode, contact_details')
        .eq('organization_id', profile.organization_id)
        .ilike('name', `%${searchTerm}%`);
      
      logger.log('🔍 Executing name query...');
      const nameResult = await nameQuery.limit(10);
      logger.log('🔍 Name query result:', nameResult);
      
      let allCustomers = nameResult.data || [];
      
      // Try barcode search if barcode column exists - substring match
      // Search for pattern containing searchTerm anywhere (e.g., if user types "6", find "*6*" or "*6001*")
      try {
        let barcodeQuery = supabase
          .from('customers')
          .select('CustomerListID, name, barcode, contact_details')
          .eq('organization_id', profile.organization_id)
          .ilike('barcode', `%${searchTerm}%`);
        
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
      // Search by barcode_number or serial_number - substring match (characters appear in order)
      const searchTerm = search.trim();
      
      // Search by barcode_number
      const { data: barcodeAssets, error: barcodeError } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .eq('organization_id', profile.organization_id)
        .ilike('barcode_number', `%${searchTerm}%`)
        .limit(5);
      
      // Search by serial_number
      const { data: serialAssets, error: serialError } = await supabase
        .from('bottles')
        .select('barcode_number, serial_number, assigned_customer, customer_name, product_code, description')
        .eq('organization_id', profile.organization_id)
        .ilike('serial_number', `%${searchTerm}%`)
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

      // Get today's scans for this user
      const today = new Date().toISOString().split('T')[0];
      const { count: todayScans } = await supabase
        .from('bottle_scans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('user_id', profile.id)
        .gte('created_at', today);

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
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.welcomeText}>
                Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
              </Text>
              <Text style={styles.appName} numberOfLines={1} ellipsizeMode="tail">
                {organization?.app_name || organization?.name || assetConfig.appName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => navigation.navigate('RecentScans')}
              >
                <Text style={styles.headerButtonIcon}>🔔</Text>
                {stats.unreadScans > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text style={[styles.badgeText, { color: '#fff' }]}>{stats.unreadScans}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.headerButtonIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <ModernCard elevated={false} style={styles.searchBarCard}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={`Search customers or ${assetConfig.assetTypePlural}...`}
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                  accessibilityHint="Clear the search input"
                  onPress={() => setSearch('')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                accessibilityLabel="Scan barcode"
                accessibilityHint="Open barcode scanner"
                onPress={async () => {
                  if (!permission) {
                    return;
                  }
                  if (!permission.granted) {
                    const result = await requestPermission();
                    if (!result.granted) {
                      Alert.alert('Camera Permission Required', 'Please allow camera access to scan barcodes.');
                      return;
                    }
                  }
                  logger.log('📷 Opening scanner from HomeScreen (Android)');
                  setShowScanner(true);
                  setScanned(false);
                }}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </ModernCard>
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
          <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: '800' }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {getQuickActions().map((action, index) => (
              <MobileCard
                key={index}
                onPress={() => handleQuickAction(action.action)}
                elevated
                intensity="medium"
                style={styles.actionCard}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Text style={styles.actionIconText}>{action.icon}</Text>
                </View>
                <Text style={[styles.actionTitle, { color: colors.text, fontWeight: '700' }]}>{action.title}</Text>
              </MobileCard>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <ExpoCameraScanner
          onBarcodeScanned={async (data) => {
            if (scanned || !data) return;
            
            logger.log('📷 Barcode scanned in HomeScreen:', data);
            setScanned(true);
            
            // Clean the barcode - remove leading/trailing asterisks
            let cleanedBarcode = data.trim().replace(/^\*+|\*+$/g, '');
            
            if (!cleanedBarcode) {
              logger.log('📷 Empty barcode after cleaning');
              setScanned(false);
              return;
            }
            
            setShowScanner(false);
            
            // Determine if this is a customer (sales receipt with %) or cylinder (9 digits)
            // Use FormatValidationService to check formats
            try {
              if (!profile?.organization_id) {
                logger.log('❌ No organization ID, falling back to search');
                setSearch(cleanedBarcode);
                setTimeout(() => {
                  searchCustomers();
                  searchBottles();
                }, 100);
                return;
              }
              
              const formats = await FormatValidationService.getOrganizationFormats(profile.organization_id);
              
              // Check if it's a sales receipt barcode (starts with %)
              const isSalesReceipt = cleanedBarcode.startsWith('%');
              
              // Check if it matches cylinder format (9 digits); accept after normalizing O→0, I→1, etc.
              const cylinderPattern = formats.cylinder_serial_format?.pattern || '^[0-9]{9}$';
              const cylinderRegex = new RegExp(cylinderPattern);
              const letterToDigit: Record<string, string> = { O: '0', o: '0', I: '1', l: '1', L: '1', S: '5', s: '5', Z: '2', z: '2', B: '8', b: '8', G: '6', g: '6' };
              const normalizedForCylinder = cleanedBarcode.replace(/./g, (c) => letterToDigit[c] ?? c);
              const digitsOnly = normalizedForCylinder.replace(/[^0-9]/g, '');
              const isCylinder = cylinderRegex.test(cleanedBarcode) || digitsOnly.length === 9;
              const cylinderBarcode = digitsOnly.length === 9 ? digitsOnly : cleanedBarcode;
              
              logger.log('🔍 Barcode analysis:', {
                cleanedBarcode,
                isSalesReceipt,
                isCylinder,
                cylinderPattern
              });
              
              if (isSalesReceipt) {
                // Sales receipt - find customer by barcode or CustomerListID (PostgreSQL uses % for LIKE, not *)
                logger.log('🔍 Searching for customer with barcode/ID:', cleanedBarcode);
                const pattern = `%${cleanedBarcode}%`;
                const { data: customer } = await supabase
                  .from('customers')
                  .select('CustomerListID')
                  .eq('organization_id', profile.organization_id)
                  .or(`barcode.ilike.${pattern},CustomerListID.ilike.${pattern}`)
                  .limit(1)
                  .single();
                
                if (customer) {
                  logger.log('✅ Found customer, navigating to CustomerDetails');
                  navigation.navigate('CustomerDetails', { customerId: customer.CustomerListID });
                  return;
                }
              } else if (isCylinder) {
                // Cylinder barcode - navigate directly to cylinder details (use canonical 9-digit form)
                logger.log('✅ Cylinder barcode detected, navigating to CylinderDetails');
                navigation.navigate('CylinderDetails', { barcode: cylinderBarcode });
                return;
              }
              
              // Fallback: search for both
              logger.log('🔍 No direct match, performing search');
              setSearch(cleanedBarcode);
              setTimeout(() => {
                searchCustomers();
                searchBottles();
              }, 100);
            } catch (error) {
              logger.error('❌ Error processing barcode:', error);
              // Fallback to search
              setSearch(cleanedBarcode);
              setTimeout(() => {
                searchCustomers();
                searchBottles();
              }, 100);
            }
          }}
          enabled={!scanned}
          onClose={() => {
            setShowScanner(false);
            setScanned(false);
          }}
          target="customer"
        />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
  zoomControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1001,
  },
  zoomButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
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
    padding: Platform.OS === 'ios' && Platform.isPad ? 16 : 14,
    alignItems: 'center',
    marginBottom: 0,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 