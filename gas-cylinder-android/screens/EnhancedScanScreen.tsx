import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, 
  ActivityIndicator, Modal, Dimensions, Alert, SafeAreaView, ScrollView, Linking 
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { OfflineStorageService } from '../services/offlineStorage';
import { offlineModeService } from '../services/OfflineModeService';
import { notificationService } from '../services/NotificationService';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { feedbackService } from '../services/feedbackService';
import { autoCompleteService } from '../services/autoCompleteService';
import { statsService } from '../services/statsService';
import SmartAutoCompleteInput from '../components/SmartAutoCompleteInput';
import ProgressIndicator from '../components/ProgressIndicator';
import StatusIndicator from '../components/StatusIndicator';
import FieldToolsPanel from '../components/FieldToolsPanel';
import { fieldToolsService, LocationData } from '../services/fieldToolsService';
import { customizationService } from '../services/customizationService';
import { AccessibilityHelper, AccessibleButton, ScreenReaderAnnouncement } from '../components/AccessibilityHelper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ScanResult {
  id: string;
  barcode: string;
  timestamp: number;
  action: 'in' | 'out' | 'locate' | 'fill';
  location?: string;
  customerName?: string;
  notes?: string;
  synced: boolean;
  offline: boolean;
  itemDetails?: {
    type: 'bottle';
    barcode: string;
    productCode?: string;
    description?: string;
    gasType?: string;
    size?: string;
    status?: string;
    location?: string;
  };
}

export default function EnhancedScanScreen({ route }: { route?: any }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { config } = useAssetConfig();
  
  // Get order number and customer from route params
  const { orderNumber, customerName: routeCustomerName, customerId } = route?.params || {};
  
  const { user, organization, loading: authLoading, organizationLoading } = useAuth();
  
  // Debug organization data
  useEffect(() => {
    if (organization) {
      console.log('🔍 EnhancedScanScreen - Organization data:', {
        id: organization.id,
        name: organization.name,
        app_name: organization.app_name,
        allFields: organization,
        displayAppName: organization?.app_name || organization?.name || 'Scanified'
      });
    } else {
      console.log('🔍 EnhancedScanScreen - No organization data available');
    }
  }, [organization]);
  const { settings } = useSettings();
  
  // State
  const [scannedItems, setScannedItems] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningReady, setScanningReady] = useState(false);
  const [scanningCountdown, setScanningCountdown] = useState(0);
  const [lastScanAttempt, setLastScanAttempt] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'in' | 'out' | 'locate' | 'fill'>('out'); // Default to SHIP
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0 });
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  
  // Batch scanning features
  const [batchMode, setBatchMode] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [scanSpeed, setScanSpeed] = useState<'normal' | 'fast' | 'rapid'>('normal');
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [showFieldTools, setShowFieldTools] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showScannedItems, setShowScannedItems] = useState(false);
  const [currentLocationData, setCurrentLocationData] = useState<LocationData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customizationSettings, setCustomizationSettings] = useState<any>(null);
  const [lastScannedItemDetails, setLastScannedItemDetails] = useState<any>(null);
  const lastScanRef = useRef<number>(0);
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Handle organization loading and errors
  useEffect(() => {
    if (authLoading || organizationLoading) {
      console.log('Auth or organization still loading, waiting...');
      setOrganizationError(null); // Clear any existing error while loading
      return;
    }
    
    if (!user) {
      setOrganizationError('Please log in to use the scanner');
    } else if (!organization) {
      console.log('No organization found after auth completed');
      setOrganizationError('No organization associated with your account. Please contact your administrator.');
    } else {
      console.log('Organization loaded successfully:', organization.name);
      setOrganizationError(null);
    }
  }, [authLoading, organizationLoading, user, organization]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Initialize feedback service, auto-complete, stats, field tools, and customization
  useEffect(() => {
    feedbackService.initialize();
    autoCompleteService.initialize();
    statsService.initialize();
    fieldToolsService.initialize();
    customizationService.initialize();
    
    // Load customization settings
    loadCustomizationSettings();
    
    return () => {
      feedbackService.cleanup();
      fieldToolsService.cleanup();
      customizationService.cleanup();
    };
  }, []);

  const loadCustomizationSettings = async () => {
    try {
      const settings = customizationService.getSettings();
      setCustomizationSettings(settings);
      
      // Apply customization settings
      if (settings) {
        console.log('Applying customization settings:', settings);
        
        // Apply layout settings
        if (settings.layout) {
          console.log('Layout settings:', settings.layout);
        }
        
        // Apply accessibility settings
        if (settings.accessibility) {
          console.log('Accessibility settings:', settings.accessibility);
        }
        
        // Apply custom theme if available
        if (settings.customTheme) {
          console.log('Custom theme:', settings.customTheme);
        }
      }
    } catch (error) {
      console.error('Failed to load customization settings:', error);
    }
  };

  // Save customization settings when they change
  const saveCustomizationSettings = async (newSettings: any) => {
    try {
      // Update different parts of settings using the service methods
      if (newSettings.layout) {
        customizationService.updateLayoutOptions(newSettings.layout);
      }
      if (newSettings.accessibility) {
        customizationService.updateAccessibilityOptions(newSettings.accessibility);
      }
      if (newSettings.customTheme) {
        customizationService.updateCustomTheme(newSettings.customTheme);
      }
      
      setCustomizationSettings(newSettings);
      console.log('Customization settings saved:', newSettings);
    } catch (error) {
      console.error('Failed to save customization settings:', error);
    }
  };

  // Get dynamic styles based on customization settings
  const getDynamicStyles = () => {
    if (!customizationSettings) {
      console.log('No customization settings available');
      return {};
    }
    
    const { layout, accessibility, customTheme } = customizationSettings;
    const dynamicStyles: any = {};
    
    console.log('Applying customization settings:', {
      layout: layout ? 'Available' : 'Not available',
      accessibility: accessibility ? 'Available' : 'Not available',
      customTheme: customTheme ? 'Available' : 'Not available'
    });
    
    // Apply layout settings
    if (layout) {
      console.log('Layout settings:', layout);
      // Font size adjustments
      if (layout.fontSize === 'small') {
        dynamicStyles.fontSizeMultiplier = 0.9;
      } else if (layout.fontSize === 'large') {
        dynamicStyles.fontSizeMultiplier = 1.2;
      } else {
        dynamicStyles.fontSizeMultiplier = 1.0;
      }
      
      // Button size adjustments
      if (layout.buttonSize === 'compact') {
        dynamicStyles.buttonPadding = 8;
      } else if (layout.buttonSize === 'large') {
        dynamicStyles.buttonPadding = 20;
      } else {
        dynamicStyles.buttonPadding = 16;
      }
      
      // Spacing adjustments
      if (layout.spacing === 'tight') {
        dynamicStyles.spacingMultiplier = 0.7;
      } else if (layout.spacing === 'relaxed') {
        dynamicStyles.spacingMultiplier = 1.4;
      } else {
        dynamicStyles.spacingMultiplier = 1.0;
      }
    }
    
    // Apply accessibility settings
    if (accessibility) {
      console.log('Accessibility settings:', accessibility);
      if (accessibility.largeText) {
        dynamicStyles.fontSizeMultiplier = (dynamicStyles.fontSizeMultiplier || 1.0) * 1.2;
      }
      
      if (accessibility.boldText) {
        dynamicStyles.fontWeight = 'bold';
      }
      
      if (accessibility.highContrast) {
        dynamicStyles.highContrast = true;
      }
    }
    
    // Apply custom theme
    if (customTheme) {
      console.log('Custom theme:', customTheme);
      dynamicStyles.customColors = customTheme;
    }
    
    console.log('Final dynamic styles:', dynamicStyles);
    return dynamicStyles;
  };

  // Update feedback service settings when app settings change
  useEffect(() => {
    feedbackService.updateSettings({
      soundEnabled: settings.soundEnabled,
      hapticEnabled: settings.vibrationEnabled,
      voiceEnabled: settings.soundEnabled, // Use sound setting for voice too
      volume: 0.8,
    });
  }, [settings.soundEnabled, settings.vibrationEnabled]);

  // Load offline queue stats
  useEffect(() => {
    loadSyncStatus();
  }, []);

  // Countdown timer for scanning readiness
  useEffect(() => {
    if (isScanning && !scanningReady) {
      setScanningCountdown(3); // Start with 3 second countdown
      
      const countdownInterval = setInterval(() => {
        setScanningCountdown(prev => {
          if (prev <= 1) {
            setScanningReady(true);
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    } else if (!isScanning) {
      setScanningReady(false);
      setScanningCountdown(0);
    }
  }, [isScanning, scanningReady]);

  const loadSyncStatus = async () => {
    const stats = await OfflineStorageService.getQueueStats();
    setSyncStatus({ pending: stats.pending, synced: stats.synced });
  };

  // Check if barcode is within scan rectangle bounds
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) return false;
    
    // Get screen dimensions
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    // Define scan rectangle bounds (center area)
    const scanAreaWidth = screenWidth * 0.7;
    const scanAreaHeight = screenHeight * 0.3;
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
    
    console.log('📍 Enhanced scan barcode position check:', {
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

  // Validate cylinder serial number format - ONLY 9 digits
  const validateCylinderSerial = (barcode: string): { isValid: boolean; error?: string; scannedValue?: string } => {
    if (!barcode || !barcode.trim()) {
      return { isValid: false, error: 'Empty barcode' };
    }

    const trimmed = barcode.trim();
    
    // Always return what was scanned for user feedback
    const result = { scannedValue: trimmed };
    
    // Cylinders are ONLY 9 digits - nothing else!
    const nineDigitPattern = /^[0-9]{9}$/;
    
    if (nineDigitPattern.test(trimmed)) {
      return { ...result, isValid: true };
    }
    
    return { 
      ...result,
      isValid: false, 
      error: `Invalid cylinder serial number. Expected: exactly 9 digits (e.g., 123456789)\nScanned: ${trimmed}` 
    };
  };

  // Validate barcode format - More flexible for scanner variations
  const validateBarcodeFormat = async (barcode: string): Promise<{ isValid: boolean; error?: string }> => {
    if (!barcode || !barcode.trim()) {
      return { isValid: false, error: 'Empty barcode' };
    }

    const trimmed = barcode.trim();
    
    // More flexible pattern to handle scanner variations
    // Accepts: % + 8 alphanumeric (case insensitive) + hyphen + 10 digits + optional letter
    // Examples: %800006B3-1611180703A, %800005ca-1579809606A
    const flexiblePattern = /^%[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/;
    
    if (!flexiblePattern.test(trimmed)) {
      // Try without the % prefix
      const withoutPrefix = trimmed.replace(/^%/, '');
      const patternWithoutPrefix = /^[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/;
      
      if (patternWithoutPrefix.test(withoutPrefix)) {
        return { isValid: true };
      }
      
      return { 
        isValid: false, 
        error: `Invalid format. Expected: %800006B3-1611180703A or similar\nGot: ${trimmed}` 
      };
    }

    return { isValid: true };
  };

  // Check if barcode is in scan frame region
  const isBarcodeInScanRegion = (barcode: string): boolean => {
    // For now, we'll assume all detected barcodes are in region
    // In a more advanced implementation, you could use the barcode's position
    // from the camera's detection results
    return true;
  };

  // Look up item details by barcode
  const lookupItemDetails = async (barcode: string) => {
    try {
      console.log('Looking up item details for barcode:', barcode);
      
      if (!organization?.id) {
        console.log('No organization ID, skipping item lookup');
        return null;
      }

      // Try to find the item in bottles table with basic columns only
      const { data: bottleData, error: bottleError } = await supabase
        .from('bottles')
        .select('barcode_number, product_code, description, status, location')
        .eq('barcode_number', barcode)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (bottleError) {
        console.error('Error looking up bottle:', bottleError);
        return null;
      }

      if (bottleData) {
        console.log('Found bottle details:', bottleData);
        return {
          type: 'bottle' as const,
          barcode: bottleData.barcode_number,
          productCode: bottleData.product_code,
          description: bottleData.description,
          gasType: bottleData.product_code, // Use product_code as gas type fallback
          size: 'Unknown', // Default since size column doesn't exist
          status: bottleData.status,
          location: bottleData.location
        };
      }

      console.log('No item found for barcode:', barcode);
      return null;
    } catch (error) {
      console.error('Error in lookupItemDetails:', error);
      return null;
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (data: string) => {
    console.log('📷 EnhancedScanScreen barcode detected:', data);
    console.log('📷 Scanning ready state:', scanningReady);
    console.log('📷 Countdown:', scanningCountdown);
    
    // Don't process scans until countdown is finished
    if (!scanningReady) {
      console.log('📷 Skipping scan - countdown still active');
      return;
    }
    
    if (!data || loading) {
      console.log('📷 Skipping scan - no data or loading');
      return;
    }

    // Show what was scanned for feedback
    setLastScanAttempt(data);
    
    // Validate cylinder serial number format first
    const serialValidation = validateCylinderSerial(data);
    if (!serialValidation.isValid) {
      console.log('📷 Barcode scanned but invalid format:', serialValidation.scannedValue);
      console.log('📷 Validation error:', serialValidation.error);
      setScanFeedback(`❌ ${serialValidation.error}`);
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setScanFeedback('');
        setLastScanAttempt('');
      }, 3000);
      
      // Provide error feedback
      await feedbackService.scanError(serialValidation.error || 'Invalid barcode format');
      return;
    }

    // Check if barcode is in scan region (future enhancement)
    if (!isBarcodeInScanRegion(data)) {
      console.log('📷 Barcode not in scan region');
      setScanFeedback('📍 Point camera directly at barcode');
      setTimeout(() => setScanFeedback(''), 2000);
      return;
    }

    // Clear any previous feedback
    setScanFeedback('✅ Valid barcode detected');
    setTimeout(() => setScanFeedback(''), 1000);
    
    const now = Date.now();
    
    // Batch mode rapid scanning protection
    if (batchMode) {
      const timeSinceLastScan = now - lastScanRef.current;
      const minInterval = scanSpeed === 'rapid' ? 300 : scanSpeed === 'fast' ? 500 : 800;
      
      if (timeSinceLastScan < minInterval) {
        return; // Too fast, ignore scan
      }
      
      // Check for duplicates in batch mode
      const isDuplicate = scannedItems.some(item => item.barcode === data);
      if (isDuplicate) {
        setDuplicates(prev => [...prev, data]);
        
        // Record duplicate statistic
        await statsService.recordScan({
          action: selectedAction,
          customer: customerName.trim() || undefined,
          location: location.trim() || undefined,
          isDuplicate: true,
          isBatchMode: batchMode,
          timestamp: Date.now(),
        });
        
        // Provide duplicate feedback
        await feedbackService.scanDuplicate(data);
        return;
      }
    }
    
    lastScanRef.current = now;
    
    if (!batchMode) {
      setLoading(true);
      setIsScanning(false);
    }

    try {
      // Format validation disabled - using basic validation only
      console.log('🔍 Using basic validation (FormatValidationService disabled)');
      
      // For cylinders, use the original 9-digit barcode directly
      console.log('📷 Using cylinder serial number for lookup:', data);
      
      await processScan(data);
      
      // Provide success feedback
      await feedbackService.scanSuccess(data);
      
      // Send notification for successful scan
      await notificationService.sendScanSuccessNotification(data);
      
      if (batchMode) {
        setScanCount(prev => prev + 1);
        // Continue scanning in batch mode
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      
      // Provide error feedback
      await feedbackService.scanError('Failed to process scan');
      
      // Send notification for scan error
      await notificationService.sendScanErrorNotification('Failed to process scan');
      
      if (!batchMode) {
        Alert.alert('Error', 'Failed to process scan. Please try again.');
      }
    } finally {
      if (!batchMode) {
        setLoading(false);
      }
    }
  };

  // Process scan (online or offline)
  const processScan = async (barcode: string) => {
    // Get current location data if available
    const locationData = fieldToolsService.getCurrentLocationData();
    
    // Look up item details
    const itemDetails = await lookupItemDetails(barcode);
    setLastScannedItemDetails(itemDetails);
    
    const scanResult: ScanResult = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode: barcode.trim(),
      timestamp: Date.now(),
      action: selectedAction,
      customerName: customerName.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      synced: false,
      offline: !isOnline,
      itemDetails: itemDetails || undefined, // Fix type issue
      // Add GPS coordinates if available
      ...(locationData && {
        gpsCoordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp,
        }
      })
    };

    // Add to auto-complete history
    if (customerName.trim()) {
      await autoCompleteService.addItem('customer', customerName.trim());
    }
    if (location.trim()) {
      await autoCompleteService.addItem('location', location.trim());
    }
    if (notes.trim()) {
      await autoCompleteService.addItem('note', notes.trim());
    }
    await autoCompleteService.addItem('barcode', barcode);

    // Record statistics
    await statsService.recordScan({
      action: selectedAction,
      customer: customerName.trim() || undefined,
      location: location.trim() || undefined,
      isDuplicate: false,
      isBatchMode: batchMode,
      timestamp: Date.now(),
    });

    // Add to local results immediately
    setScannedItems(prev => [scanResult, ...prev]);
    console.log('Added scan result to local items:', scanResult);
    console.log('Current scanned items count:', scannedItems.length + 1);

    if (isOnline) {
      try {
        // Try to sync immediately if online
        await syncScanToServer(scanResult);
        
        // Mark as synced
        scanResult.synced = true;
        setScannedItems(prev => 
          prev.map(item => item.id === scanResult.id ? { ...item, synced: true } : item)
        );
        console.log('Item synced successfully:', scanResult.barcode);

      } catch (error) {
        console.error('Failed to sync scan:', error);
        console.error('Sync error details:', {
          errorType: typeof error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          fullError: error
        });
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Scan will be saved offline: ${errorMessage}`);
        
        // Add to offline queue
        await OfflineStorageService.addToOfflineQueue({
          type: 'scan',
          data: {
            barcode_number: scanResult.barcode,
            action: scanResult.action,
            location: scanResult.location || null,
            notes: scanResult.notes || null,
            organization_id: organization?.id || null,
            user_id: user?.id || null
          },
          organizationId: organization?.id || '',
          userId: user?.id || ''
        });

        // Also store in offline mode service if enabled
        if (offlineModeService.isOfflineModeEnabled()) {
          await offlineModeService.storeScanOffline({
            barcode_number: scanResult.barcode,
            action: scanResult.action,
            location: scanResult.location || null,
            notes: scanResult.notes || null,
            organization_id: organization?.id || null,
            user_id: user?.id || null,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      // Add to offline queue
      await OfflineStorageService.addToOfflineQueue({
        type: 'scan',
        data: {
          barcode_number: scanResult.barcode,
          action: scanResult.action,
          location: scanResult.location || null,
          notes: scanResult.notes || null,
          organization_id: organization?.id || null,
          user_id: user?.id || null
        },
        organizationId: organization?.id || '',
        userId: user?.id || ''
      });

      // Also store in offline mode service if enabled
      if (offlineModeService.isOfflineModeEnabled()) {
        await offlineModeService.storeScanOffline({
          barcode_number: scanResult.barcode,
          action: scanResult.action,
          location: scanResult.location || null,
          notes: scanResult.notes || null,
          organization_id: organization?.id || null,
          user_id: user?.id || null,
          timestamp: new Date().toISOString(),
        });
      }
    }

    await loadSyncStatus();
  };

  // Sync scan to server
  const syncScanToServer = async (scanResult: ScanResult) => {
    try {
      // Debug logging
      console.log('Sync attempt - Organization:', organization?.id, 'User:', user?.id);
      console.log('Scan data:', {
        barcode: scanResult.barcode,
        action: scanResult.action,
        location: scanResult.location,
        // notes: scanResult.notes, // Removed - column doesn't exist in bottle_scans
        timestamp: scanResult.timestamp
      });
      
      if (!organization?.id) {
        throw new Error('No organization ID available');
      }
      
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      // Test database connection and table access
      console.log('Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('bottle_scans')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Database test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      console.log('Database connection test passed');

      // Debug: Log the exact data being inserted  
      const insertData = {
        organization_id: organization.id,
        bottle_barcode: scanResult.barcode, // Changed from barcode_number to bottle_barcode
        mode: scanResult.action === 'out' ? 'SHIP' : scanResult.action === 'in' ? 'RETURN' : scanResult.action.toUpperCase(), // Map to database expected values
        location: scanResult.location,
        // notes: scanResult.notes, // Removed - column doesn't exist in bottle_scans
        user_id: user.id, // Changed from scanned_by to user_id
        order_number: orderNumber || null,
        customer_name: routeCustomerName || null,
        customer_id: customerId || null,
        // scan_date: new Date().toISOString(), // Removed - column doesn't exist in bottle_scans
        timestamp: new Date().toISOString(), // Add timestamp
        created_at: new Date().toISOString() // Add created_at
      };
      
      console.log('Insert data for bottle_scans:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('bottle_scans')
        .insert([insertData]);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        // Log the full error object to see what properties it has
        console.error('Full error object keys:', Object.keys(error));
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.message || error.details || error.hint || error.code || 'Unknown database error';
        throw new Error(`Database error: ${errorMessage}`);
      }

      console.log('Scan synced successfully:', data);

      // Also update bottle status and location
      await updateBottleStatus(scanResult.barcode, scanResult.action);
    } catch (error) {
      console.error('Failed to sync scan to server:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error stack:', error?.stack);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      throw new Error(`Sync failed: ${errorMessage}`);
    }
  };

  // Update bottle status
  const updateBottleStatus = async (barcode: string, action: 'in' | 'out' | 'locate' | 'fill') => {
    let updateData: any = {
      last_scanned: new Date().toISOString()
    };
    
    switch (action) {
      case 'out':
        updateData.status = 'delivered';
        if (location) updateData.location = location;
        if (customerId) updateData.assigned_customer = customerId;
        if (routeCustomerName) updateData.customer_name = routeCustomerName;
        break;
      case 'in':
        updateData.status = 'returned';
        updateData.location = 'Warehouse';
        updateData.assigned_customer = null;
        updateData.customer_name = null;
        break;
      case 'locate':
        // Don't change status for locate, just update location and last scanned
        if (location) updateData.location = location;
        break;
      case 'fill':
        updateData.status = 'filled';
        break;
      default:
        updateData.status = action === 'in' ? 'available' : 'rented';
        break;
    }

    console.log('Updating bottle status:', { barcode, updateData });

    const { error } = await supabase
      .from('bottles')
      .update(updateData)
      .eq('barcode_number', barcode)
      .eq('organization_id', organization?.id);

    if (error) {
      console.error('Error updating bottle status:', error);
    } else {
      console.log(`Bottle ${barcode} status updated:`, updateData);
    }
  };

  // Manual barcode entry
  const handleManualScan = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      await feedbackService.scanError('Please enter a barcode');
      return;
    }

    try {
      // First validate that the barcode exists in the system
      const itemDetails = await lookupItemDetails(manualBarcode.trim());
      
      if (!itemDetails) {
        Alert.alert(
          'Barcode Not Found', 
          `The barcode "${manualBarcode.trim()}" is not in the system. Please check the barcode or contact your administrator.`,
          [{ text: 'OK' }]
        );
        await feedbackService.scanError('Barcode not found in system');
        return;
      }

      // Barcode exists, proceed with the scan
      await processScan(manualBarcode);
      await feedbackService.scanSuccess(manualBarcode);
      
      // Clear all input fields after successful scan
      setManualBarcode('');
      setCustomerName('');
      setLocation('');
      setNotes('');
    } catch (error) {
      await feedbackService.scanError('Manual scan failed');
      throw error;
    }
  };

  // Sync offline data
  const syncOfflineData = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await OfflineStorageService.syncOfflineOperations(supabase);
      
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${result.success} operations. ${result.failed} failed.`
      );

      // Clear synced operations
      await OfflineStorageService.clearSyncedOperations();
      
      // Update local scan results
      setScannedItems(prev => 
        prev.map(item => ({ ...item, synced: true, offline: false }))
      );

      await loadSyncStatus();

    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync offline data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Batch mode controls
  const startBatchMode = async () => {
    setBatchMode(true);
    setScanCount(0);
    setDuplicates([]);
    setIsScanning(true);
    
    // Provide start batch feedback
    await feedbackService.startBatch();
    
    Alert.alert(
      'Batch Mode Started', 
      `Rapid scanning enabled. Scan speed: ${scanSpeed.toUpperCase()}`,
      [{ text: 'OK' }]
    );
  };

  const stopBatchMode = async () => {
    const batchEndTime = Date.now();
    
    setBatchMode(false);
    setIsScanning(false);
    
    // Record batch statistics
    await statsService.recordBatch({
      scansInBatch: scanCount,
      duplicatesInBatch: duplicates.length,
      startTime: lastScanRef.current - (scanCount * 2000), // Approximate start time
      endTime: batchEndTime,
    });
    
    // Provide batch complete feedback
    await feedbackService.batchComplete(scanCount);
    
    setShowBatchSummary(true);
  };

  const clearBatch = () => {
    Alert.alert(
      'Clear Batch',
      `This will remove all ${scanCount} scanned items. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setScannedItems([]);
            setScanCount(0);
            setDuplicates([]);
          }
        }
      ]
    );
  };

  // Submit order for processing
  const submitOrder = async () => {
    try {
      console.log('Submitting order for processing...');
      
      if (!organization?.id) {
        Alert.alert('Error', 'No organization found. Please try again.');
        return;
      }

      if (!orderNumber) {
        Alert.alert('Error', 'No order number found. Please start scanning from the order selection screen.');
        return;
      }

      if (scannedItems.length === 0) {
        Alert.alert('Error', 'No scanned items to submit.');
        return;
      }

      // Show loading
      setLoading(true);

      // First, ensure all items are synced
      const pendingItems = scannedItems.filter(i => !i.synced);
      if (pendingItems.length > 0) {
        console.log(`Syncing ${pendingItems.length} pending items before submission...`);
        
        for (const item of pendingItems) {
          try {
            await syncScanToServer(item);
            // Mark as synced in the UI
            setScannedItems(prev => 
              prev.map(scannedItem => 
                scannedItem.id === item.id 
                  ? { ...scannedItem, synced: true } 
                  : scannedItem
              )
            );
            console.log(`Successfully synced item: ${item.barcode}`);
          } catch (error) {
            console.error(`Failed to sync item ${item.barcode}:`, error);
            throw new Error(`Failed to sync item ${item.barcode}. Please try again.`);
          }
        }
      }

      // Create or update order record in sales_orders table
      // Using minimal columns that are most likely to exist
      const orderData = {
        organization_id: organization.id,
        sales_order_number: orderNumber,
        customer_name: routeCustomerName || 'Mobile Scan Order',
        notes: `Mobile scan order submitted with ${scannedItems.length} scanned items`
      };

      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('sales_order_number', orderNumber)
        .eq('organization_id', organization.id)
        .single();

      let orderResult;
      if (existingOrder) {
        // Update existing order
        const { data, error } = await supabase
          .from('sales_orders')
          .update({
            notes: orderData.notes
          })
          .eq('id', existingOrder.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating sales order:', error);
          throw new Error(`Failed to update order: ${error.message}`);
        }
        orderResult = data;
        console.log('Updated existing sales order:', orderResult);
      } else {
        // Create new order
        const { data, error } = await supabase
          .from('sales_orders')
          .insert([orderData])
          .select()
          .single();

        if (error) {
          console.error('Error creating sales order:', error);
          throw new Error(`Failed to create order: ${error.message}`);
        }
        orderResult = data;
        console.log('Created new sales order:', orderResult);
      }

      // Mark all scanned items as submitted
      setScannedItems(prev => 
        prev.map(item => ({ ...item, submitted: true }))
      );

      // Show success message
      Alert.alert(
        'Order Submitted Successfully!',
        `Order ${orderNumber} has been submitted for processing with ${scannedItems.length} items.\n\nYou can find it on the website under Sales Orders or Import Approvals.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear scanned items and navigate to home
              setShowScannedItems(false);
              setScannedItems([]);
              navigation.navigate('Home');
            }
          }
        ]
      );

      console.log('Order submission completed successfully');

    } catch (error) {
      console.error('Error submitting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Error Submitting Order',
        `Failed to submit order: ${errorMessage}\n\nPlease try again or contact support.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Swipe action handlers
  const handleSwipeAction = async (item: ScanResult, action: 'edit' | 'locate' | 'delete' | 'mark_damaged') => {
    await feedbackService.quickAction(`${action} action`);
    
    switch (action) {
      case 'edit':
        // Navigate to edit screen or show edit modal
        Alert.alert('Edit Item', `Edit ${item.barcode}`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => console.log('Edit:', item.barcode) }
        ]);
        break;
        
      case 'locate':
        // Show location or navigate to locate screen
        Alert.alert('Locate Item', `Find ${item.barcode}`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Locate', onPress: () => console.log('Locate:', item.barcode) }
        ]);
        break;
        
      case 'delete':
        // Remove from scan results
        Alert.alert('Delete Item', `Remove ${item.barcode} from scan results?`, [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => {
              setScannedItems(prev => prev.filter(scanItem => scanItem.id !== item.id));
              setScanCount(prev => Math.max(0, prev - 1));
            }
          }
        ]);
        break;
        
      case 'mark_damaged':
        // Mark as damaged
        Alert.alert('Mark as Damaged', `Mark ${item.barcode} as damaged?`, [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Mark Damaged', 
            onPress: () => {
              // Update item with damaged status
              setScannedItems(prev => 
                prev.map(scanItem => 
                  scanItem.id === item.id 
                    ? { ...scanItem, notes: (scanItem.notes || '') + ' [DAMAGED]' }
                    : scanItem
                )
              );
            }
          }
        ]);
        break;
    }
  };

  // Swipeable scan item component
  const SwipeableScanItem = ({ item }: { item: ScanResult }) => {
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    const panGesture = Gesture.Pan()
      .onStart(() => {
        runOnJS(feedbackService.quickAction)('swipe start');
      })
      .onUpdate((event) => {
        translateX.value = event.translationX;
        
        // Fade out when swiping far
        if (Math.abs(event.translationX) > 100) {
          opacity.value = 0.7;
        } else {
          opacity.value = 1;
        }
      })
      .onEnd((event) => {
        const shouldDismiss = Math.abs(event.translationX) > 120;
        
        if (shouldDismiss) {
          // Determine swipe direction and action
          if (event.translationX > 120) {
            // Swipe right - Edit action
            runOnJS(handleSwipeAction)(item, 'edit');
          } else if (event.translationX < -120) {
            // Swipe left - Delete action
            runOnJS(handleSwipeAction)(item, 'delete');
          }
        }
        
        // Reset position
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
      };
    });

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedStyle]}>
          <View style={[styles.scanItem, !item.synced && styles.unsynced]}>
            {/* Swipe indicators */}
            <View style={styles.swipeIndicators}>
              <View style={[styles.swipeIndicator, styles.leftSwipeIndicator]}>
                <Text style={styles.swipeIndicatorText}>✏️ EDIT</Text>
              </View>
              <View style={[styles.swipeIndicator, styles.rightSwipeIndicator]}>
                <Text style={styles.swipeIndicatorText}>🗑️ DELETE</Text>
              </View>
            </View>
            
            {/* Original scan item content */}
            <View style={styles.scanContent}>
              <View style={styles.scanHeader}>
                <Text style={styles.barcode}>{item.barcode}</Text>
                <View style={styles.statusContainer}>
                  <StatusIndicator
                    status={item.synced ? 'synced' : 'pending'}
                    text={item.synced ? 'Synced' : 'Pending'}
                    size="small"
                    variant="badge"
                  />
                  <StatusIndicator
                    status={item.action === 'in' ? 'success' : item.action === 'out' ? 'error' : 'info'}
                    text={item.action.toUpperCase()}
                    size="small"
                    variant="pill"
                  />
                </View>
              </View>
              
              <View style={styles.scanDetails}>
                <Text style={styles.timestamp}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
                {item.customerName && (
                  <Text style={styles.customerName}>👤 {item.customerName}</Text>
                )}
                {item.location && (
                  <Text style={styles.location}>📍 {item.location}</Text>
                )}
                {item.notes && (
                  <Text style={styles.notes}>📝 {item.notes}</Text>
                )}
              </View>
              
              {/* Quick action buttons */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={[styles.quickActionButton, styles.locateButton]}
                  onPress={() => handleSwipeAction(item, 'locate')}
                >
                  <Text style={styles.quickActionText}>🔍 LOCATE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.quickActionButton, styles.damageButton]}
                  onPress={() => handleSwipeAction(item, 'mark_damaged')}
                >
                  <Text style={styles.quickActionText}>⚠️ DAMAGE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    );
  };

  // Helper function to get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'in': return '#10B981';
      case 'out': return '#EF4444';
      case 'locate': return '#8B5CF6';
      case 'fill': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Render scan item
  const renderScanItem = ({ item }: { item: ScanResult }) => (
    <SwipeableScanItem item={item} />
  );

  // Action buttons
  const actions = [
    { key: 'in', label: 'Check In', color: '#10B981', icon: '📥' },
    { key: 'out', label: 'Check Out', color: '#EF4444', icon: '📤' },
    { key: 'locate', label: 'Locate', color: '#8B5CF6', icon: '🔍' },
    { key: 'fill', label: 'Fill', color: '#F59E0B', icon: '⛽' }
  ];

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6B7280" style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan barcodes, Scanified needs access to your camera.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={async () => {
              // Request permission directly without pre-prompt
              const result = await requestPermission();
              if (!result.granted && result.canAskAgain === false) {
                // If permission is permanently denied, open settings
                Alert.alert(
                  'Camera Permission',
                  'Please enable camera access in your device settings to use the scanner.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                  ]
                );
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Purple Header Bar - Matching Image Design */}
      <View style={styles.purpleHeader}>
        <Text style={styles.headerTitle}>Scan Ships</Text>
        <View style={styles.headerRight}>
          <Text style={styles.timeText}>
            {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
          <TouchableOpacity 
            style={styles.customizationButton}
            onPress={() => setShowCustomization(true)}
          >
            <Text style={styles.customizationButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => {
              console.log('Done button pressed');
              // Show scanned items list
              setShowScannedItems(true);
            }}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Information */}
      {orderNumber && (
        <View style={[styles.orderInfoContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.orderInfoTitle, { color: theme.text }]}>
            📋 Current Order
          </Text>
          <Text style={[styles.orderInfoText, { color: theme.textSecondary }]}>
            Order: {orderNumber}
          </Text>
          {routeCustomerName && (
            <Text style={[styles.orderInfoText, { color: theme.textSecondary }]}>
              Customer: {routeCustomerName}
            </Text>
          )}
          <Text style={[styles.orderInfoSubtext, { color: theme.textSecondary }]}>
            Scans will be synced to this order
          </Text>
        </View>
      )}

      {/* Main Content - Simple Start Screen */}
      <View style={[styles.mainContent, getDynamicStyles().customColors && { backgroundColor: getDynamicStyles().customColors.backgroundColor }]}>
        {/* Loading State */}
        {authLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading organization data...
            </Text>
          </View>
        )}

        {/* Error State */}
        {organizationError && !authLoading && !organizationLoading && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorTitle, { color: theme.error }]}>
              ⚠️ Organization Error
            </Text>
            <Text style={[styles.errorMessage, { color: theme.text }]}>
              {organizationError}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setOrganizationError(null);
                // Clear error and let the useEffect handle reloading
                setOrganizationError(null);
              }}
            >
              <Text style={[styles.retryButtonText, { color: theme.surface }]}>
                🔄 Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Normal Content - Only show when organization is loaded */}
        {!authLoading && !organizationLoading && !organizationError && organization && (
          <>
            <View style={[
              styles.welcomeSection,
              getDynamicStyles().spacingMultiplier && { 
                marginBottom: styles.welcomeSection.marginBottom * getDynamicStyles().spacingMultiplier,
                paddingVertical: styles.welcomeSection.paddingVertical * getDynamicStyles().spacingMultiplier
              }
            ]}>
              <Text style={[styles.welcomeTitle,
                getDynamicStyles().fontSizeMultiplier && { fontSize: styles.welcomeTitle.fontSize * getDynamicStyles().fontSizeMultiplier },
                getDynamicStyles().fontWeight && { fontWeight: getDynamicStyles().fontWeight },
                getDynamicStyles().customColors && { color: getDynamicStyles().customColors.textColor },
                getDynamicStyles().spacingMultiplier && { 
                  marginBottom: styles.welcomeTitle.marginBottom * getDynamicStyles().spacingMultiplier,
                  lineHeight: styles.welcomeTitle.lineHeight * getDynamicStyles().spacingMultiplier
                }
              ]}>{organization?.app_name || organization?.name || 'Scanified'}</Text>
              <Text style={[
                styles.welcomeSubtitle,
                getDynamicStyles().fontSizeMultiplier && { fontSize: styles.welcomeSubtitle.fontSize * getDynamicStyles().fontSizeMultiplier },
                getDynamicStyles().customColors && { color: getDynamicStyles().customColors.textColor },
                getDynamicStyles().spacingMultiplier && { 
                  lineHeight: styles.welcomeSubtitle.lineHeight * getDynamicStyles().spacingMultiplier
                }
              ]}>
                Scan barcodes to track cylinder shipments
              </Text>
              
              {/* Organization Info */}
              <View style={styles.organizationInfo}>
                <Text style={[styles.organizationText, { color: theme.textSecondary }]}>
                  Organization: {organization.name}
                </Text>
              </View>
              
              {/* Last Scanned Item Details */}
              {lastScannedItemDetails && (
                <View style={[styles.lastScannedItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.lastScannedItemTitle, { color: theme.text }]}>
                    📦 Last Scanned Item
                  </Text>
                  <Text style={[styles.lastScannedItemBarcode, { color: theme.primary }]}>
                    {lastScannedItemDetails.barcode}
                  </Text>
                  <Text style={[styles.lastScannedItemType, { color: theme.textSecondary }]}>
                    Type: {lastScannedItemDetails.type === 'bottle' ? 'Gas Bottle' : 'Gas Cylinder'}
                  </Text>
                  {lastScannedItemDetails.description && (
                    <Text style={[styles.lastScannedItemDescription, { color: theme.textSecondary }]}>
                      {lastScannedItemDetails.description}
                    </Text>
                  )}
                  {lastScannedItemDetails.gasType && (
                    <Text style={[styles.lastScannedItemGasType, { color: theme.textSecondary }]}>
                      Gas: {lastScannedItemDetails.gasType}
                    </Text>
                  )}
                  {lastScannedItemDetails.size && (
                    <Text style={[styles.lastScannedItemSize, { color: theme.textSecondary }]}>
                      Size: {lastScannedItemDetails.size}
                    </Text>
                  )}
                  {lastScannedItemDetails.status && (
                    <Text style={[styles.lastScannedItemStatus, { color: theme.textSecondary }]}>
                      Status: {lastScannedItemDetails.status}
                    </Text>
                  )}
                  {lastScannedItemDetails.customerName && (
                    <Text style={[styles.lastScannedItemCustomer, { color: theme.textSecondary }]}>
                      Customer: {lastScannedItemDetails.customerName}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Customization Indicator */}
              {customizationSettings && (
                <View style={styles.customizationIndicator}>
                  <Text style={styles.customizationIndicatorText}>
                    🎨 Customization Active
                  </Text>
                </View>
              )}
            </View>

            {/* Continue Scanning Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                getDynamicStyles().buttonPadding && { paddingVertical: getDynamicStyles().buttonPadding },
                getDynamicStyles().customColors && { backgroundColor: getDynamicStyles().customColors.primaryColor },
                getDynamicStyles().spacingMultiplier && { 
                  marginBottom: styles.continueButton.marginBottom * getDynamicStyles().spacingMultiplier,
                  paddingHorizontal: styles.continueButton.paddingHorizontal * getDynamicStyles().spacingMultiplier
                }
              ]}
              onPress={() => {
                if (organization) {
                  setIsScanning(true);
                } else {
                  setOrganizationError('No organization available. Please try again.');
                }
              }}
            >
              <Text style={[
                styles.continueButtonText,
                getDynamicStyles().fontSizeMultiplier && { fontSize: styles.continueButtonText.fontSize * getDynamicStyles().fontSizeMultiplier },
                getDynamicStyles().fontWeight && { fontWeight: getDynamicStyles().fontWeight },
                getDynamicStyles().customColors && { color: getDynamicStyles().customColors.textColor }
              ]}>Continue Scanning</Text>
            </TouchableOpacity>

            {/* Manual Entry Option */}
            <TouchableOpacity
              style={[
                styles.manualEntryButton,
                getDynamicStyles().buttonPadding && { paddingVertical: getDynamicStyles().buttonPadding },
                getDynamicStyles().customColors && { backgroundColor: getDynamicStyles().customColors.secondaryColor }
              ]}
              onPress={() => setShowManualEntry(true)}
            >
              <Text style={[
                styles.manualEntryButtonText,
                getDynamicStyles().fontSizeMultiplier && { fontSize: styles.manualEntryButtonText.fontSize * getDynamicStyles().fontSizeMultiplier },
                getDynamicStyles().fontWeight && { fontWeight: getDynamicStyles().fontWeight },
                getDynamicStyles().customColors && { color: getDynamicStyles().customColors.textColor }
              ]}>Enter Barcode Manually</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Camera Modal */}
      <Modal visible={isScanning} animationType="slide">
        <View style={styles.cameraModal}>
          <CameraView
            style={styles.camera}
            barcodeScannerEnabled={true}
            onBarcodeScanned={({ data, bounds }) => {
              console.log('📷 CameraView onBarcodeScanned triggered!');
              console.log('📷 Raw barcode data:', data, 'bounds:', bounds);
              
              // Check if barcode is within scan area (if bounds are available)
              if (bounds && !isBarcodeInScanArea(bounds)) {
                console.log('📷 Enhanced scan barcode outside scan area, ignoring');
                return;
              }
              
              handleBarcodeScan(data);
            }}
            onCameraReady={() => {
              console.log('📷 Camera is ready and active');
              console.log('📷 Camera ready - should be detecting barcodes now');
            }}
            onMountError={(error) => {
              console.error('❌ Camera mount error:', error);
              Alert.alert('Camera Error', 'Failed to start camera: ' + error.message);
            }}
          />
          
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} pointerEvents="none" />
            {(
              <>
                <Text style={styles.scanInstructions} pointerEvents="none">
                  Point camera at gas cylinder barcode
                </Text>
                
                {/* Scan Feedback */}
                {scanFeedback && (
                  <View style={styles.scanFeedbackContainer}>
                    <Text style={styles.scanFeedbackText}>{scanFeedback}</Text>
                    {lastScanAttempt && (
                      <Text style={styles.lastScanText}>
                        Scanned: {lastScanAttempt}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Close Button - Separate from overlay to ensure it works */}
          <TouchableOpacity
            style={styles.closeCameraButton}
            onPress={() => {
              console.log('Close button pressed');
              setIsScanning(false);
            }}
          >
            <Text style={styles.closeCameraText}>✕ Close</Text>
          </TouchableOpacity>

          {/* Bottom Action Buttons - Matching Image Design */}
          <View style={[styles.cameraBottomActions, { zIndex: 1000 }]}>
            {/* Action Selection Indicator */}
            <View style={styles.actionIndicator}>
              <Text style={styles.actionIndicatorText}>
                {selectedAction === 'in' ? '🔄 RETURN Mode' : '📦 SHIP Mode'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.cameraActionButton,
                selectedAction === 'in' && styles.cameraActionButtonSelected
              ]}
              onPress={() => {
                console.log('RETURN button pressed');
                setSelectedAction('in');
                // Provide haptic feedback
                feedbackService.quickAction('return selected');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cameraActionButtonContent}>
                <Text style={[
                  styles.cameraActionButtonLabel,
                  selectedAction === 'in' && styles.cameraActionButtonLabelSelected
                ]}>RETURN</Text>
                <Text style={[
                  styles.cameraActionButtonCount,
                  selectedAction === 'in' && styles.cameraActionButtonCountSelected
                ]}>0</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.cameraActionButton, 
                styles.cameraShipButton,
                selectedAction === 'out' && styles.cameraActionButtonSelected
              ]}
              onPress={() => {
                console.log('SHIP button pressed');
                setSelectedAction('out');
                // Provide haptic feedback
                feedbackService.quickAction('ship selected');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cameraActionButtonContent}>
                <Text style={[
                  styles.cameraActionButtonLabel,
                  selectedAction === 'out' && styles.cameraActionButtonLabelSelected
                ]}>SHIP</Text>
                <Text style={[
                  styles.cameraActionButtonCount,
                  selectedAction === 'out' && styles.cameraActionButtonCountSelected
                ]}>{scanCount}</Text>
                <Text style={styles.cameraActionButtonIcon}>📦</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Test Feedback Button - Remove in production */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              console.log('🔊 Testing feedback...');
              try {
                await feedbackService.scanSuccess('TEST123');
                console.log('🔊 Success feedback test completed');
              } catch (error) {
                console.error('❌ Feedback test failed:', error);
              }
            }}
          >
            <Text style={styles.testButtonText}>Test Feedback</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scanned Items Modal */}
      <Modal visible={showScannedItems} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Scanned Items ({scannedItems.length})
            </Text>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowScannedItems(false)}
            >
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scanned Items List */}
          <ScrollView style={styles.scannedItemsList}>
            {scannedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No items scanned yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Start scanning to see items here
                </Text>
              </View>
            ) : (
              scannedItems.map((item, index) => (
                <View key={index} style={[styles.scannedItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.scannedItemHeader}>
                    <Text style={[styles.scannedItemBarcode, { color: theme.text }]}>
                      {item.barcode}
                    </Text>
                    <View style={[
                      styles.scannedItemStatus,
                      { backgroundColor: item.synced ? '#10B981' : '#F59E0B' }
                    ]}>
                      <Text style={styles.scannedItemStatusText}>
                        {item.synced ? '✓ Synced' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.scannedItemAction, { color: theme.textSecondary }]}>
                    Action: {item.action}
                  </Text>
                  {item.itemDetails && (
                    <Text style={[styles.scannedItemDetails, { color: theme.textSecondary }]}>
                      {item.itemDetails.type === 'bottle' ? 'Gas Bottle' : 'Gas Cylinder'} - {item.itemDetails.description || item.itemDetails.gasType || 'Unknown'}
                    </Text>
                  )}
                  {item.location && (
                    <Text style={[styles.scannedItemLocation, { color: theme.textSecondary }]}>
                      Location: {item.location}
                    </Text>
                  )}
                  {item.notes && (
                    <Text style={[styles.scannedItemNotes, { color: theme.textSecondary }]}>
                      Notes: {item.notes}
                    </Text>
                  )}
                  <Text style={[styles.scannedItemTime, { color: theme.textSecondary }]}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { backgroundColor: theme.surface }]}>
            {/* Submit Order Button */}
            {scannedItems.length > 0 && orderNumber && (
              <TouchableOpacity 
                style={[styles.submitOrderButton, { backgroundColor: '#059669' }]}
                onPress={async () => {
                  console.log('Submit Order button pressed');
                  await submitOrder();
                }}
              >
                <Text style={[styles.submitOrderButtonText, { color: 'white' }]}>
                  🚀 Submit Order ({scannedItems.length} items)
                </Text>
                <Text style={[styles.submitOrderSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
                  Finalize order and send to processing
                </Text>
              </TouchableOpacity>
            )}

            {/* Sync All Button */}
            <TouchableOpacity 
              style={[styles.syncButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                console.log('Sync All button pressed');
                const pendingItems = scannedItems.filter(i => !i.synced);
                console.log(`Syncing ${pendingItems.length} pending items`);
                
                // Sync all pending items
                for (const item of pendingItems) {
                  try {
                    await syncScanToServer(item);
                    // Mark as synced in the UI
                    setScannedItems(prev => 
                      prev.map(scannedItem => 
                        scannedItem.id === item.id 
                          ? { ...scannedItem, synced: true } 
                          : scannedItem
                      )
                    );
                    console.log(`Successfully synced item: ${item.barcode}`);
                  } catch (error) {
                    console.error(`Failed to sync item ${item.barcode}:`, error);
                  }
                }
                
                await loadSyncStatus();
                console.log('Sync All completed');
              }}
            >
              <Text style={[styles.syncButtonText, { color: theme.surface }]}>
                🔄 Sync All ({scannedItems.filter(i => !i.synced).length})
              </Text>
              {/* Debug info */}
              <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                Total: {scannedItems.length} | Synced: {scannedItems.filter(i => i.synced).length} | Pending: {scannedItems.filter(i => !i.synced).length}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal visible={showManualEntry} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.manualEntryModal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Enter Barcode Manually</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowManualEntry(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.manualEntryContent}>
              <TextInput
                style={[styles.manualBarcodeInput, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Enter barcode number"
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoFocus={true}
              />
              
              {/* Action Selection for Manual Entry */}
              <View style={styles.manualActionSelection}>
                <Text style={[styles.manualActionLabel, { color: theme.text }]}>
                  Select Action:
                </Text>
                <View style={styles.manualActionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.manualActionButton,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      selectedAction === 'in' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSelectedAction('in')}
                  >
                    <Text style={[
                      styles.manualActionButtonText,
                      { color: theme.text },
                      selectedAction === 'in' && { color: theme.surface }
                    ]}>
                      🔄 RETURN
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.manualActionButton,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      selectedAction === 'out' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSelectedAction('out')}
                  >
                    <Text style={[
                      styles.manualActionButtonText,
                      { color: theme.text },
                      selectedAction === 'out' && { color: theme.surface }
                    ]}>
                      📦 SHIP
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.manualEntryActions}>
                <TouchableOpacity
                  style={[styles.manualEntryActionButton, { backgroundColor: theme.error }]}
                  onPress={() => {
                    setManualBarcode('');
                    setShowManualEntry(false);
                  }}
                >
                  <Text style={styles.manualEntryActionButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.manualEntryActionButton, { backgroundColor: theme.primary }]}
                  onPress={async () => {
                    if (manualBarcode.trim()) {
                      await handleManualScan();
                      setShowManualEntry(false);
                    }
                  }}
                  disabled={!manualBarcode.trim()}
                >
                  <Text style={styles.manualEntryActionButtonText}>Add Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Batch Summary Modal */}
      <Modal visible={showBatchSummary} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.batchSummaryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 Batch Complete!</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowBatchSummary(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{scanCount}</Text>
                <Text style={styles.statLabel}>Items Scanned</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{duplicates.length}</Text>
                <Text style={styles.statLabel}>Duplicates Detected</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{scannedItems.filter(item => !item.synced).length}</Text>
                <Text style={styles.statLabel}>Pending Sync</Text>
              </View>
            </View>
            
            <View style={styles.summaryActions}>
              <TouchableOpacity 
                style={[styles.summaryButton, styles.newBatchButton]}
                onPress={() => {
                  setShowBatchSummary(false);
                  startBatchMode();
                }}
              >
                <Text style={styles.summaryButtonText}>🔄 New Batch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.summaryButton, styles.syncButton]}
                onPress={() => {
                  setShowBatchSummary(false);
                  syncOfflineData();
                }}
              >
                <Text style={styles.summaryButtonText}>📤 Sync Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {/* Field Tools Panel */}
      <FieldToolsPanel
        visible={showFieldTools}
        onClose={() => setShowFieldTools(false)}
        currentScanLocation={location}
        onLocationTagged={(locationData) => {
          setCurrentLocationData(locationData);
          // Optionally auto-fill the location field with GPS coordinates
          if (!location.trim()) {
            setLocation(fieldToolsService.formatCoordinates(locationData.latitude, locationData.longitude));
          }
        }}
      />


      {/* Screen Reader Announcements */}
      {customizationSettings?.accessibility?.speakScanResults && (
        <ScreenReaderAnnouncement
          text={`Scanner ready. Current barcode: ${manualBarcode || scannedItems[0]?.barcode || 'No barcode'}`}
          priority="normal"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Purple Header - Matching Image Design
  purpleHeader: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  customizationButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  customizationButtonText: {
    fontSize: 16,
  },
  
  // Main Scan Area - Matching Image Design
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  barcodeDisplay: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  barcodeNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  scanInstructions: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  cameraButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Bottom Action Buttons - Matching Image Design
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shipButton: {
    backgroundColor: '#E0E7FF',
    borderColor: '#8B5CF6',
  },
  actionButtonContent: {
    alignItems: 'center',
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  actionButtonCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginTop: 4,
  },
  
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  manualContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  manualButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  manualButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  scannerButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scannerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  resultsList: {
    flex: 1,
  },
  scanItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  unsynced: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#fef3c7',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barcode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  offlineLabel: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  syncStatus: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  scanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    fontSize: 14,
    color: '#6b7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cameraModal: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120, // Leave space for bottom action buttons
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 4,
  },
  formatHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 4,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  scanFeedbackContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: '90%',
  },
  scanFeedbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  lastScanText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
    opacity: 0.8,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#111827',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  
  // Batch Mode Styles
  batchContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  batchStats: {
    flexDirection: 'row',
    gap: 12,
  },
  scanCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  duplicateCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batchControls: {
    gap: 12,
  },
  batchButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  startBatchButton: {
    backgroundColor: '#10B981',
  },
  stopBatchButton: {
    backgroundColor: '#EF4444',
  },
  clearBatchButton: {
    backgroundColor: '#6B7280',
  },
  batchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  speedSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  selectedSpeedButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  selectedSpeedButtonText: {
    color: '#fff',
  },
  batchActiveControls: {
    flexDirection: 'row',
    gap: 12,
  },
  
  // Batch Summary Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  batchSummaryModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  newBatchButton: {
    backgroundColor: '#10B981',
  },
  summaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Swipe Gesture Styles
  swipeIndicators: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: -1,
  },
  swipeIndicator: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  leftSwipeIndicator: {
    backgroundColor: '#10B981',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  rightSwipeIndicator: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeIndicatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scanContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  barcode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  offlineIndicator: {
    fontSize: 14,
  },
  scanDetails: {
    marginBottom: 12,
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  location: {
    fontSize: 12,
    color: '#374151',
  },
  notes: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  locateButton: {
    backgroundColor: '#8B5CF6',
  },
  damageButton: {
    backgroundColor: '#F59E0B',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Smart Input Styles
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  smartInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1F2937',
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  enhancedAddButton: {
    backgroundColor: '#2563EB',
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Enhanced Visual Styles
  titleSection: {
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    marginLeft: 4,
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  syncMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Batch Progress Styles
  batchProgressContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  batchProgressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  batchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  batchStatItem: {
    alignItems: 'center',
  },
  batchStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  batchStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  batchProgressBar: {
    marginTop: 8,
  },
  
  // Field Tools Styles
  fieldToolsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fieldToolsButtonText: {
    fontSize: 16,
  },
  
  // Camera Info Styles
  cameraInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraInfoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  reopenCameraButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reopenCameraButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Main Content - Simple Start Screen
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 34,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  organizationInfo: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  organizationText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  lastScannedItem: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  lastScannedItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastScannedItemBarcode: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 8,
  },
  lastScannedItemType: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastScannedItemDescription: {
    fontSize: 14,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  lastScannedItemGasType: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastScannedItemSize: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastScannedItemStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastScannedItemCustomer: {
    fontSize: 14,
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Scanned Items Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeModalButton: {
    padding: 8,
  },
  closeModalText: {
    fontSize: 18,
    color: '#6B7280',
  },
  scannedItemsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  scannedItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  scannedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannedItemBarcode: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  scannedItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scannedItemStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scannedItemAction: {
    fontSize: 14,
    marginBottom: 4,
  },
  scannedItemDetails: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  scannedItemLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  scannedItemNotes: {
    fontSize: 14,
    marginBottom: 4,
  },
  scannedItemTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  syncButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  createOrderButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createOrderSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  submitOrderButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitOrderSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  orderInfoContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderInfoText: {
    fontSize: 14,
    marginBottom: 2,
  },
  orderInfoSubtext: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  customizationIndicator: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  customizationIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualEntryButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  manualEntryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Camera Bottom Actions
  cameraBottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  actionIndicator: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  actionIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  cameraActionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cameraActionButtonSelected: {
    backgroundColor: '#E0E7FF',
    borderColor: '#8B5CF6',
    borderWidth: 3,
  },
  cameraShipButton: {
    backgroundColor: '#E0E7FF',
    borderColor: '#8B5CF6',
  },
  cameraActionButtonContent: {
    alignItems: 'center',
  },
  cameraActionButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  cameraActionButtonLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '900',
  },
  cameraActionButtonCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cameraActionButtonCountSelected: {
    color: '#8B5CF6',
    fontWeight: '900',
  },
  cameraActionButtonIcon: {
    fontSize: 16,
    marginTop: 4,
  },
  
  // Manual Entry Modal
  manualEntryModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  manualEntryContent: {
    marginTop: 20,
  },
  manualBarcodeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  manualActionSelection: {
    marginBottom: 20,
  },
  manualActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  manualActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  manualActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  manualActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manualEntryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  manualEntryActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualEntryActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
