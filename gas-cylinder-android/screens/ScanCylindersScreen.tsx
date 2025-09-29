import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, Dimensions, Alert, Linking } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SimpleCameraTest from '../SimpleCameraTest';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import ScanOverlay from '../components/ScanOverlay';
import { Customer } from '../types';
// import { FormatValidationService } from '../services/FormatValidationService';
import { Platform } from '../utils/platform';

const { width, height } = Dimensions.get('window');

// Simple string similarity calculation (Levenshtein distance based)
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Normalize for comparison: trim whitespace and ignore leading/trailing '*'
// (common Code 39 start/stop characters). Stored values are not altered.
const normalizeBarcode = (value: string): string => {
  if (!value) return '';
  return value.trim().replace(/^\*+|\*+$/g, '');
};

// Check if barcode is within scan rectangle bounds - More lenient
const isBarcodeInScanArea = (bounds: any): boolean => {
  if (!bounds) {
    console.log('📍 No bounds provided, allowing scan');
    return true; // Allow scan if no bounds available
  }
  
  // Get screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // More lenient scan area (90% of screen)
  const scanAreaWidth = screenWidth * 0.9;
  const scanAreaHeight = screenHeight * 0.5;
  const scanAreaLeft = (screenWidth - scanAreaWidth) / 2;
  const scanAreaTop = (screenHeight - scanAreaHeight) / 2;
  const scanAreaRight = scanAreaLeft + scanAreaWidth;
  const scanAreaBottom = scanAreaTop + scanAreaHeight;
  
  // Check if barcode center is within scan area
  const barcodeX = bounds.origin?.x + (bounds.size?.width / 2) || 0;
  const barcodeY = bounds.origin?.y + (bounds.size?.height / 2) || 0;
  
  const isInArea = (
    barcodeX >= scanAreaLeft &&
    barcodeX <= scanAreaRight &&
    barcodeY >= scanAreaTop &&
    barcodeY <= scanAreaBottom
  );
  
  console.log('📍 Barcode position check:', {
    barcodeX,
    barcodeY,
    scanAreaLeft,
    scanAreaTop,
    scanAreaRight,
    scanAreaBottom,
    isInArea
  });
  
  return isInArea;
};

// Validate barcode format for gas cylinders - More lenient for customer barcodes
const validateGasCylinderBarcode = (barcode: string): { isValid: boolean; error?: string } => {
  if (!barcode || !barcode.trim()) {
    return { isValid: false, error: 'Empty barcode' };
  }

  const trimmed = barcode.trim();
  
  // More lenient validation - accept most common barcode formats
  // Allow letters, numbers, hyphens, underscores, and basic symbols
  const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
  
  if (!basicPattern.test(trimmed)) {
    return { 
      isValid: false, 
      error: `Invalid barcode format.\nOnly letters, numbers, and basic symbols are allowed.\nGot: ${trimmed}` 
    };
  }

  // Check minimum length
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Barcode too short' };
  }

  // Check maximum length
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Barcode too long' };
  }

  return { isValid: true };
};

// Barcode validation utility
const validateBarcode = async (barcode: string, organizationId: string): Promise<{ isValid: boolean; error?: string }> => {
  console.log('🔍 Validating barcode:', { barcode, organizationId });
  
  if (!barcode || !barcode.trim()) {
    console.log('❌ Empty barcode');
    return { isValid: false, error: 'Barcode cannot be empty' };
  }

  const trimmedBarcode = barcode.trim();
  console.log('🔍 Trimmed barcode:', trimmedBarcode);

  if (!organizationId) {
    console.log('🔍 No organization ID, using basic validation');
    // More lenient basic validation
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      console.log('❌ Basic pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    if (trimmedBarcode.length < 1) {
      console.log('❌ Barcode too short');
      return { isValid: false, error: 'Barcode too short (minimum 1 character)' };
    }
    if (trimmedBarcode.length > 100) {
      console.log('❌ Barcode too long');
      return { isValid: false, error: 'Barcode too long (maximum 100 characters)' };
    }
    console.log('✅ Basic validation passed');
    return { isValid: true };
  }

  try {
    // FormatValidationService is disabled - using basic validation only
    console.log('🔍 Using basic validation (FormatValidationService disabled)');
    
    // Basic validation fallback
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      console.log('❌ Basic pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    console.log('✅ Basic validation passed');
    return { isValid: true };
  } catch (error) {
    console.error('❌ Error validating barcode:', error);
    // Fallback to basic validation
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      console.log('❌ Fallback pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    console.log('✅ Fallback validation passed');
    return { isValid: true };
  }
};

// Order number validation utility
const validateOrderNumber = async (orderNumber: string, organizationId: string): Promise<{ isValid: boolean; error?: string }> => {
  if (!orderNumber || !orderNumber.trim()) {
    return { isValid: false, error: 'Order number cannot be empty' };
  }

  const trimmedOrder = orderNumber.trim();

  if (!organizationId) {
    // Fallback to basic validation if no organization
    const basicPattern = /^[A-Za-z0-9\-_]+$/;
    if (!basicPattern.test(trimmedOrder)) {
      return { 
        isValid: false, 
        error: 'Order number contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.' 
      };
    }
    return { isValid: true };
  }

  try {
    // FormatValidationService is disabled - using basic validation only
    console.log('🔍 Using basic order number validation (FormatValidationService disabled)');
    
    // Basic validation fallback
    const basicPattern = /^[A-Za-z0-9\-_]+$/;
    if (!basicPattern.test(trimmedOrder)) {
      return { 
        isValid: false, 
        error: 'Order number contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.' 
      };
    }
    return { isValid: true };
  } catch (error) {
    console.error('Error validating order number:', error);
    // Fallback to basic validation
    const basicPattern = /^[A-Za-z0-9\-_]+$/;
    if (!basicPattern.test(trimmedOrder)) {
      return { 
        isValid: false, 
        error: 'Order number contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.' 
      };
    }
    return { isValid: true };
  }
};

export default function ScanCylindersScreen() {
  const [search, setSearch] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [customerBarcodeError, setCustomerBarcodeError] = useState('');
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const { profile, loading: authLoading } = useAuth();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'customer' | 'order' | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanDelay = 1500; // ms
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [showCustomerScan, setShowCustomerScan] = useState(false);
  const [showOrderScan, setShowOrderScan] = useState(false);
  const [showSimpleTest, setShowSimpleTest] = useState(false);


  useEffect(() => {
    const fetchCustomers = async () => {
      // Don't fetch customers if auth is still loading
      if (authLoading) {
        console.log('Auth still loading, waiting...');
        return;
      }

      if (!profile?.organization_id) {
        // Only log if we have a profile but no organization_id (actual error case)
        if (profile && !profile.organization_id) {
          console.log('No organization found, skipping customer fetch');
          console.log('Profile data:', profile);
          console.log('User authenticated:', !!profile);
        }
        setLoading(false);
        // Don't set error immediately - let the UI handle the empty state gracefully
        setCustomers([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Fetch customers for the current organization
        const { data, error } = await supabase
          .from('customers')
          .select('name, barcode, CustomerListID')
          .eq('organization_id', profile.organization_id);
          
        if (error) {
          console.error('Error fetching customers:', error);
          setError('Failed to load customers: ' + error.message);
          setCustomers([]);
        } else {
          setCustomers(data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching customers:', err);
        setError('Failed to load customers: ' + err.message);
        setCustomers([]);
      }
      
      setLoading(false);
    };
    
    fetchCustomers();
  }, [profile, authLoading]);


  useEffect(() => {
    if (scannerVisible) {
      setScanned(false);
    }
  }, [scannerVisible]);

  // Validate order number when it changes
  useEffect(() => {
    const validateOrder = async () => {
      if (orderNumber.trim()) {
        const validation = await validateOrderNumber(orderNumber, profile?.organization_id || '');
        setOrderError(validation.isValid ? '' : validation.error || '');
      } else {
        setOrderError('');
      }
    };
    validateOrder();
  }, [orderNumber, profile?.organization_id]);

  // Validate customer barcode when search changes
  useEffect(() => {
    const validateCustomer = async () => {
      if (search.trim() && !selectedCustomer) {
        const validation = await validateBarcode(search, profile?.organization_id || '');
        setCustomerBarcodeError(validation.isValid ? '' : validation.error || '');
      } else {
        setCustomerBarcodeError('');
      }
    };
    validateCustomer();
  }, [search, selectedCustomer, profile?.organization_id]);

  const filteredCustomers = (() => {
    if (!search.trim()) return customers;
    const lower = search.toLowerCase();
    
    // Enhanced filtering to handle both 'A' and 'a' endings
    const startsWith = customers.filter(c => (c.name?.toLowerCase() || '').startsWith(lower));
    const contains = customers.filter(c =>
      (c.name?.toLowerCase() || '').includes(lower) && !(c.name?.toLowerCase() || '').startsWith(lower)
    );
    
    // Barcode matching with case-insensitive handling
    const barcodeMatches = customers.filter(c => {
      if (!c.barcode) return false;
      
      const customerBarcode = normalizeBarcode(c.barcode);
      const searchBarcode = normalizeBarcode(search);
      
      // Exact match
      if (customerBarcode === searchBarcode) return true;
      
      // Handle case variations for barcodes ending with 'A' or 'a'
      if (searchBarcode.endsWith('A') || searchBarcode.endsWith('a')) {
        const baseBarcode = searchBarcode.slice(0, -1);
        const uppercaseVersion = baseBarcode + 'A';
        const lowercaseVersion = baseBarcode + 'a';
        
        return customerBarcode === uppercaseVersion || customerBarcode === lowercaseVersion;
      }
      
      // Case-insensitive partial match
      return customerBarcode.toLowerCase().includes(searchBarcode.toLowerCase());
    });
    
    // Combine all matches, removing duplicates
    const allMatches = [...startsWith, ...contains, ...barcodeMatches];
    const uniqueMatches = allMatches.filter((customer, index, self) => 
      index === self.findIndex(c => c.CustomerListID === customer.CustomerListID)
    );
    
    return uniqueMatches;
  })();

  const handleBarcodeScanned = async (event: any) => {
    const data = event?.data || event;
    const type = event?.type || 'unknown';
    
    console.log('🔍 Barcode scanned:', { type, data, scanned, scannerTarget });
    console.log('🔍 Full event object:', event);
    
    if (!data || typeof data !== 'string') {
      console.log('❌ Invalid barcode data:', data);
      return;
    }
    
    if (scanned) {
      console.log('⚠️ Already scanned, ignoring');
      return;
    }
    
    if (!scannerTarget) {
      console.log('❌ No scanner target set');
      return;
    }
    
    // Set scanned immediately to prevent duplicate scans
    setScanned(true);
    
    // Add a small delay to allow the UI to update
    setTimeout(async () => {
    
    try {
      // Skip validation for now - accept any barcode format
      console.log('✅ Skipping validation - accepting barcode:', data);

      // Apply the scanned data based on target
      if (scannerTarget === 'customer') {
        console.log('👤 Setting customer search:', data);
        
        // Check if the scanned barcode matches any existing customer
        const scannedBarcode = normalizeBarcode(data);
        const matchingCustomer = customers.find(customer => {
          if (!customer.barcode) return false;
          
          const customerBarcode = normalizeBarcode(customer.barcode);
          
          // Exact match (case insensitive)
          if (customerBarcode.toLowerCase() === scannedBarcode.toLowerCase()) {
            return true;
          }
          
          // Handle common barcode variations (A/a endings)
          if (scannedBarcode.length > 1) {
            const baseScanned = scannedBarcode.slice(0, -1);
            const baseCustomer = customerBarcode.slice(0, -1);
            
            if (baseScanned.toLowerCase() === baseCustomer.toLowerCase()) {
              return true;
            }
          }
          
          return false;
        });
        
        if (!matchingCustomer) {
          console.log('⚠️ Scanned barcode does not match any existing customer');
          
          // Find similar barcodes for helpful suggestions
          const similarBarcodes = customers
            .filter(customer => customer.barcode)
            .map(customer => normalizeBarcode(customer.barcode))
            .filter(barcode => {
              const similarity = calculateSimilarity(scannedBarcode.toLowerCase(), barcode.toLowerCase());
              return similarity > 0.7; // 70% similarity threshold
            })
            .slice(0, 3); // Show max 3 suggestions
          
          let message = `The scanned barcode "${normalizeBarcode(data)}" does not match any existing customer in your organization.`;
          
          if (similarBarcodes.length > 0) {
            message += `\n\nSimilar barcodes found:\n• ${similarBarcodes.join('\n• ')}`;
          }
          
          message += '\n\nPlease verify the barcode or add this customer to your system.';
          
          Alert.alert(
            'Customer Not Found',
            message,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use Anyway', onPress: () => {
                setSearch(scannedBarcode);
                setShowCustomerScan(false);
                setScannerVisible(false);
                setScannerTarget(null);
              }}
            ]
          );
          setScanned(false);
          return;
        }
        
        // Customer found, proceed normally
        console.log('✅ Customer found:', matchingCustomer.name);
        setSearch(normalizeBarcode(matchingCustomer.barcode || data));
        setSelectedCustomer(matchingCustomer);
        setShowCustomerScan(false);
        setScannerVisible(false);
        setScannerTarget(null);
        
        // Show success feedback
        Alert.alert(
          'Customer Found!',
          `Successfully scanned customer: ${matchingCustomer.name}`,
          [{ text: 'OK' }]
        );
      } else if (scannerTarget === 'order') {
        console.log('📦 Setting order number:', data);
        setOrderNumber(data);
        setShowOrderScan(false);
        setScannerVisible(false);
        setScannerTarget(null);
      }
      
      // Reset scanned state after a delay
      setTimeout(() => setScanned(false), 2000);
      
    } catch (error) {
      console.error('❌ Error processing barcode scan:', error);
      setScanned(false);
      
      const errorMessage = 'Failed to process barcode. Please try again.';
      if (scannerTarget === 'customer') {
        setCustomerBarcodeError(errorMessage);
      } else if (scannerTarget === 'order') {
        setOrderError(errorMessage);
      }
      
      setTimeout(() => {
        setCustomerBarcodeError('');
        setOrderError('');
      }, 3000);
    }
    }, 100); // Close the setTimeout from line 308
  };

  const openScanner = async (target: 'customer' | 'order') => {
    console.log('📷 Opening scanner for target:', target);
    console.log('📷 Current permission status:', permission?.granted);
    
    try {
      // Check if permission is still loading
      if (!permission) {
        console.log('📷 Permission still loading, waiting...');
        Alert.alert(
          'Camera Loading',
          'Camera permissions are still loading. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (!permission.granted) {
        console.log('📷 Requesting camera permission...');
        const result = await requestPermission();
        console.log('📷 Permission request result:', result);
        if (!result.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to scan barcodes.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      console.log('📷 Setting up scanner for target:', target);
      
      // Clear any existing errors
      setCustomerBarcodeError('');
      setOrderError('');
      
      // Reset states
      setScanned(false);
      setScannerTarget(target);
      
      console.log('🎯 Scanner target set to:', target);
      
      // Open the appropriate scanner modal
      if (target === 'customer') {
        console.log('📷 Opening customer scanner modal');
        console.log('📷 Customers loaded:', customers.length);
        console.log('📷 Customer barcodes:', customers.map(c => c.barcode).filter(Boolean));
        setShowCustomerScan(true);
      } else {
        console.log('📷 Opening order scanner modal');
        setShowOrderScan(true);
      }
      
      setScannerVisible(true);
      console.log('📷 Scanner setup complete');
      console.log('📷 showCustomerScan will be:', target === 'customer');
      
    } catch (error) {
      console.error('❌ Error opening scanner:', error);
      Alert.alert(
        'Scanner Error',
        'Failed to open camera scanner. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const canProceed = selectedCustomer && orderNumber.trim() && !orderError && !customerBarcodeError;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, (showCustomerScan || showOrderScan) && styles.fullscreenContainer]}>
      {/* Auth Loading State */}
      {authLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading organization data...
          </Text>
        </View>
      )}

      {/* Main Content - Only show when auth is loaded */}
      {!authLoading && !showCustomerScan && !showOrderScan && (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Scan {assetConfig.assetDisplayNamePlural}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select customer and enter order details to begin scanning
            </Text>
          </View>

          {/* Order Number Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>Order Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: orderError ? colors.error : colors.border,
                    color: colors.text 
                  }
                ]}
                placeholder={assetConfig?.orderNumberFormat?.description || "Enter order number"}
                placeholderTextColor={colors.textSecondary}
                value={orderNumber}
                onChangeText={setOrderNumber}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.scanButton, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: permission?.granted ? 1 : 0.6
                  }
                ]}
                onPress={() => openScanner('order')}
                disabled={!permission?.granted}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
            {orderError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{orderError}</Text>
            ) : assetConfig?.orderNumberFormat?.examples?.length > 0 ? (
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Examples: {assetConfig.orderNumberFormat.examples.slice(0, 2).join(', ')}
              </Text>
            ) : null}
            {!permission?.granted && (
              <Text style={[styles.helperText, { color: colors.warning || '#F59E0B' }]}>
                Camera permission required for scanning
              </Text>
            )}
          </View>

          {/* Customer Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>Customer</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: customerBarcodeError ? colors.error : colors.border,
                    color: colors.text 
                  }
                ]}
                placeholder={assetConfig?.barcodeFormat?.description || "Search customer or scan barcode"}
                placeholderTextColor={colors.textSecondary}
                value={selectedCustomer ? selectedCustomer.name : search}
                onChangeText={(text) => {
                  setSearch(text);
                  setSelectedCustomer(null);
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.scanButton, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: permission?.granted ? 1 : 0.6
                  }
                ]}
                onPress={() => {
                  console.log('📷 Customer scan button pressed');
                  console.log('📷 Permission granted:', permission?.granted);
                  console.log('📷 Scanner target:', scannerTarget);
                  openScanner('customer');
                }}
                disabled={!permission?.granted}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
            {customerBarcodeError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{customerBarcodeError}</Text>
            ) : selectedCustomer && selectedCustomer.barcode === search ? (
              <Text style={[styles.successText, { color: colors.success || '#10B981' }]}>
                ✅ Customer found via barcode scan: {selectedCustomer.name}
              </Text>
            ) : null}
            {!permission?.granted && (
              <Text style={[styles.helperText, { color: colors.warning || '#F59E0B' }]}>
                Camera permission required for scanning
              </Text>
            )}
          </View>

          {/* Customer List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading customers...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : authLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
            </View>
          ) : filteredCustomers.length === 0 && !selectedCustomer ? (
            <View style={styles.emptyStateContainer}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {!profile?.organization_id && !authLoading
                  ? 'No organization associated with your account. Please contact your administrator.'
                  : 'No customers found. Please check your organization settings.'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.CustomerListID}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border,
                      borderWidth: selectedCustomer?.CustomerListID === item.CustomerListID ? 2 : 1,
                      borderColor: selectedCustomer?.CustomerListID === item.CustomerListID ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setSearch(item.name);
                    setCustomerBarcodeError('');
                  }}
                >
                  <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.customerId, { color: colors.textSecondary }]}>{item.CustomerListID}</Text>
                  {item.barcode && (
                    <Text style={[styles.customerBarcode, { color: colors.textSecondary }]}>Barcode: {item.barcode}</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.customerList}
              showsVerticalScrollIndicator={false}
            />
          )}


          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: canProceed ? colors.primary : colors.border,
                opacity: canProceed ? 1 : 0.6
              }
            ]}
            onPress={() => {
              if (canProceed) {
                navigation.navigate('EnhancedScan', {
                  customer: selectedCustomer,
                  customerName: selectedCustomer?.name || selectedCustomer?.customer_name,
                  customerId: selectedCustomer?.id,
                  orderNumber: orderNumber.trim()
                });
              }
            }}
            disabled={!canProceed}
          >
            <Text style={[styles.continueButtonText, { color: canProceed ? '#FFFFFF' : colors.textSecondary }]}>
              Continue to Scanning
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Camera Scanner - Customer */}
      {showCustomerScan && (
        <View style={styles.fullscreenWrapper}>
          {console.log('📷 RENDERING CAMERA VIEW - showCustomerScan is true')}
          <CameraView
            style={styles.fullscreenCamera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "codabar", "itf14"],
            }}
            onBarcodeScanned={({ data }) => {
              console.log('📷 BARCODE DETECTED:', data);
              console.log('📷 Available customers:', customers.length);
              console.log('📷 Customer barcodes:', customers.map(c => c.barcode).filter(Boolean));
              
              const barcode = data.trim();
              if (barcode) {
                // Close camera first
                setShowCustomerScan(false);
                
                // Try multiple matching strategies
                const exactMatch = customers.find(customer => 
                  customer.barcode && customer.barcode.toLowerCase() === barcode.toLowerCase()
                );
                
                const partialMatch = customers.find(customer => 
                  customer.barcode && (customer.barcode.toLowerCase().includes(barcode.toLowerCase()) || barcode.toLowerCase().includes(customer.barcode.toLowerCase()))
                );
                
                // Try multiple normalization strategies for scanner vs website format differences
                const normalizeBarcode = (b) => {
                  if (!b) return '';
                  return b
                    .replace(/[^a-zA-Z0-9]/g, '') // Remove all special characters
                    .toUpperCase() // Convert to uppercase
                    .trim();
                };
                
                const normalizeForScanner = (b) => {
                  if (!b) return '';
                  return b
                    .replace(/^%/, '') // Remove leading %
                    .replace(/-/g, '') // Remove dashes
                    .toUpperCase() // Convert to uppercase
                    .trim();
                };
                
                // Enhanced normalization for the specific format: *%800006A2-1610382989A*
                const normalizeStoredBarcode = (b) => {
                  if (!b) return '';
                  return b
                    .replace(/^\*%/, '') // Remove leading *%
                    .replace(/\*$/, '') // Remove trailing *
                    .replace(/-/g, '') // Remove dashes
                    .toUpperCase() // Convert to uppercase
                    .trim();
                };
                
                const normalizedScanned = normalizeBarcode(barcode);
                const scannerNormalizedScanned = normalizeForScanner(barcode);
                
                const normalizedMatch = customers.find(customer => 
                  customer.barcode && normalizeBarcode(customer.barcode) === normalizedScanned
                );
                
                const scannerMatch = customers.find(customer => 
                  customer.barcode && normalizeForScanner(customer.barcode) === scannerNormalizedScanned
                );
                
                // Enhanced matching for the specific stored format
                const storedFormatMatch = customers.find(customer => 
                  customer.barcode && normalizeStoredBarcode(customer.barcode) === scannerNormalizedScanned
                );
                
                console.log('📷 Exact match:', exactMatch);
                console.log('📷 Partial match:', partialMatch);
                console.log('📷 Normalized match:', normalizedMatch);
                console.log('📷 Normalized scanned:', normalizedScanned);
                console.log('📷 Scanner normalized scanned:', scannerNormalizedScanned);
                console.log('📷 Scanner match:', scannerMatch);
                console.log('📷 Stored format match:', storedFormatMatch);
                
                // Debug: Show what each customer barcode normalizes to
                customers.forEach(customer => {
                  if (customer.barcode) {
                    console.log(`📷 Customer "${customer.name}": "${customer.barcode}" -> normalizeStoredBarcode: "${normalizeStoredBarcode(customer.barcode)}"`);
                  }
                });
                
                if (exactMatch) {
                  setSearch(exactMatch.barcode);
                  setSelectedCustomer(exactMatch);
                  setShowCustomerScan(false); // Close scanner after finding customer
                  Alert.alert('Customer Found!', `Found: ${exactMatch.name}\nBarcode: ${barcode}`);
                } else if (storedFormatMatch) {
                  setSearch(storedFormatMatch.barcode);
                  setSelectedCustomer(storedFormatMatch);
                  setShowCustomerScan(false); // Close scanner after finding customer
                  Alert.alert('Customer Found (Stored Format Match)!', `Found: ${storedFormatMatch.name}\nScanned: ${barcode}\nStored: ${storedFormatMatch.barcode}`);
                } else if (scannerMatch) {
                  setSearch(scannerMatch.barcode);
                  setSelectedCustomer(scannerMatch);
                  setShowCustomerScan(false); // Close scanner after finding customer
                  Alert.alert('Customer Found (Scanner Format Match)!', `Found: ${scannerMatch.name}\nScanned: ${barcode}\nStored: ${scannerMatch.barcode}`);
                } else if (normalizedMatch) {
                  setSearch(normalizedMatch.barcode);
                  setSelectedCustomer(normalizedMatch);
                  setShowCustomerScan(false); // Close scanner after finding customer
                  Alert.alert('Customer Found (Normalized Match)!', `Found: ${normalizedMatch.name}\nScanned: ${barcode}\nStored: ${normalizedMatch.barcode}`);
                } else if (partialMatch) {
                  setSearch(partialMatch.barcode);
                  setSelectedCustomer(partialMatch);
                  setShowCustomerScan(false); // Close scanner after finding customer
                  Alert.alert('Customer Found (Partial Match)!', `Found: ${partialMatch.name}\nScanned: ${barcode}\nStored: ${partialMatch.barcode}`);
                } else {
                  setSearch(barcode);
                  Alert.alert('Barcode Scanned', `Scanned: ${barcode}\nNo matching customer found.\n\nAvailable barcodes:\n${customers.map(c => c.barcode).filter(Boolean).slice(0, 5).join('\n')}`);
                }
              }
            }}
          />
          
          {/* Scan area with border */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
          
          {/* Close button */}
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowCustomerScan(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Camera Scanner - Order */}
      {showOrderScan && (
        <View style={styles.fullscreenWrapper}>
          <CameraView
            style={styles.fullscreenCamera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "codabar", "itf14"],
            }}
            onBarcodeScanned={({ data, bounds }) => {
              console.log('📷 Raw order barcode event:', data, 'bounds:', bounds);
              
              // Check if barcode is within scan area (if bounds are available)
              if (bounds && !isBarcodeInScanArea(bounds)) {
                console.log('📷 Order barcode outside scan area, ignoring');
                return;
              }
              
              const barcode = data.trim();
              if (barcode) {
                console.log('📷 Order barcode detected:', barcode);
                setOrderNumber(barcode);
                setShowOrderScan(false);
              }
            }}
          />
          <View style={styles.scanRectangle} />
          <View style={styles.scanAreaOverlay} />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowOrderScan(false)}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  fullscreenContainer: {
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerList: {
    flex: 1,
    marginBottom: 20,
  },
  customerItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
    marginBottom: 2,
  },
  customerBarcode: {
    fontSize: 12,
  },
  continueButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  fullscreenContainer: {
    padding: 0,
    backgroundColor: '#000',
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
  scanRectangle: {
    position: 'absolute',
    top: '40%',
    left: '7.5%',
    width: '85%',
    height: '20%',
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
  scanAreaOverlay: {
    position: 'absolute',
    top: '40%',
    left: '7.5%',
    width: '85%',
    height: '20%',
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cooldownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -25 }],
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cooldownText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  simpleScanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleScanBox: {
    width: '80%',
    height: 200,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleScanText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    textAlign: 'center',
  },
  simpleScanSubtext: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    textAlign: 'center',
    marginTop: 10,
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
  },
  simpleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  scanArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '80%',
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
}); 