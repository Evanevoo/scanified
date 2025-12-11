import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, FlatList, 
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
  const { orderNumber, customerName: routeCustomerName, customerId, autoStartScanning } = route?.params || {};
  
  // Generate a unique scan session ID if no order number is provided
  // This ensures all scans from the same session are grouped together on the website
  const [scanSessionId] = useState(() => {
    if (orderNumber) return orderNumber;
    // Generate unique session ID: SCAN_YYYYMMDD_HHMMSS_randomid
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `SCAN_${dateStr}_${randomId}`;
  });
  
  const { user, organization, loading: authLoading, organizationLoading, authError } = useAuth();
  
  // Force component to re-render when organization changes
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Debug organization data and force re-render
  useEffect(() => {
    if (organization) {
      logger.log('🔍 EnhancedScanScreen - Organization data:', {
        id: organization.id,
        name: organization.name,
        app_name: organization.app_name,
        allFields: organization,
        displayAppName: organization?.app_name || organization?.name || 'Scanified'
      });
      
      // Force component re-render when organization data changes
      setRefreshKey(prev => prev + 1);
      logger.log('🔄 Forcing component refresh due to organization data change');
    } else {
      logger.log('🔍 EnhancedScanScreen - No organization data available');
    }
  }, [organization]);
  const { settings } = useSettings();
  
  // State
  const [scannedItems, setScannedItems] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningReady, setScanningReady] = useState(false);
  const [scanningCountdown, setScanningCountdown] = useState(0);
  
  // Track currently processing barcodes to prevent race conditions
  const processingBarcodesRef = useRef<Set<string>>(new Set());
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
  const [showCustomization, setShowCustomization] = useState(false);
  const [currentLocationData, setCurrentLocationData] = useState<LocationData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customizationSettings, setCustomizationSettings] = useState<any>(null);
  const [lastScannedItemDetails, setLastScannedItemDetails] = useState<any>(null);
  const lastScanRef = useRef<number>(0);
  const cameraContainerRef = useRef<any>(null);
  const scanFrameRef = useRef<any>(null);
  const [scanFrameRect, setScanFrameRect] = useState<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    cameraWidth: number;
    cameraHeight: number;
  } | null>(null);
  // Debounce refs to prevent repeated scans of the same barcode
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  const updateScanFrameRect = useCallback(() => {
    const cameraNode = cameraContainerRef.current;
    const frameNode = scanFrameRef.current;

    if (!cameraNode || !frameNode || !cameraNode.measureInWindow || !frameNode.measureInWindow) {
      return;
    }

    cameraNode.measureInWindow((cameraX, cameraY, cameraWidth, cameraHeight) => {
      frameNode.measureInWindow((frameX, frameY, frameWidth, frameHeight) => {
        const rect = {
          left: frameX - cameraX,
          top: frameY - cameraY,
          right: frameX - cameraX + frameWidth,
          bottom: frameY - cameraY + frameHeight,
          width: frameWidth,
          height: frameHeight,
          cameraWidth,
          cameraHeight,
        };

        setScanFrameRect(prev => {
          if (
            prev &&
            Math.abs(prev.left - rect.left) < 0.5 &&
            Math.abs(prev.top - rect.top) < 0.5 &&
            Math.abs(prev.width - rect.width) < 0.5 &&
            Math.abs(prev.height - rect.height) < 0.5 &&
            Math.abs(prev.cameraWidth - rect.cameraWidth) < 0.5 &&
            Math.abs(prev.cameraHeight - rect.cameraHeight) < 0.5
          ) {
            return prev;
          }
          return rect;
        });
      });
    });
  }, []);

  // Handle organization loading and errors
  useEffect(() => {
    if (authLoading || organizationLoading) {
      logger.log('Auth or organization still loading, waiting...');
      setOrganizationError(null); // Clear any existing error while loading
      return;
    }
    
    // Check for auth errors first (e.g., deleted organization)
    if (authError) {
      logger.error('Auth error detected:', authError);
      setOrganizationError(authError);
      return;
    }
    
    if (!user) {
      setOrganizationError('Please log in to use the scanner');
    } else if (!organization) {
      logger.log('No organization found after auth completed');
      setOrganizationError('No organization associated with your account. Please contact your administrator.');
    } else {
      // Double-check organization is not deleted (safety check)
      if (organization.deleted_at) {
        const errorMsg = 'Your organization has been deleted. Please contact your administrator to update your account.';
        logger.error('❌ Organization is deleted:', organization);
        setOrganizationError(errorMsg);
        return;
      }
      
      logger.log('Organization loaded successfully:', organization.name);
      setOrganizationError(null);
      
      // Auto-start scanning if requested
      if (autoStartScanning && organization) {
        setIsScanning(true);
      }
    }
  }, [authLoading, organizationLoading, user, organization, autoStartScanning, authError]);

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
        logger.log('Applying customization settings:', settings);
        
        // Apply layout settings
        if (settings.layout) {
          logger.log('Layout settings:', settings.layout);
        }
        
        // Apply accessibility settings
        if (settings.accessibility) {
          logger.log('Accessibility settings:', settings.accessibility);
        }
        
        // Apply custom theme if available
        if (settings.customTheme) {
          logger.log('Custom theme:', settings.customTheme);
        }
      }
    } catch (error) {
      logger.error('Failed to load customization settings:', error);
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
      logger.log('Customization settings saved:', newSettings);
    } catch (error) {
      logger.error('Failed to save customization settings:', error);
    }
  };

  // Get dynamic styles based on customization settings
  const getDynamicStyles = () => {
    if (!customizationSettings) {
      logger.log('No customization settings available');
      return {};
    }
    
    const { layout, accessibility, customTheme } = customizationSettings;
    const dynamicStyles: any = {};
    
    logger.log('Applying customization settings:', {
      layout: layout ? 'Available' : 'Not available',
      accessibility: accessibility ? 'Available' : 'Not available',
      customTheme: customTheme ? 'Available' : 'Not available'
    });
    
    // Apply layout settings
    if (layout) {
      logger.log('Layout settings:', layout);
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
      logger.log('Accessibility settings:', accessibility);
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
      logger.log('Custom theme:', customTheme);
      dynamicStyles.customColors = customTheme;
    }
    
    logger.log('Final dynamic styles:', dynamicStyles);
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

  // Update scan frame rectangle when scanning starts
  useEffect(() => {
    if (!isScanning) {
      return;
    }

    const timeout = setTimeout(() => {
      updateScanFrameRect();
    }, 300);

    return () => clearTimeout(timeout);
  }, [isScanning, updateScanFrameRect]);

  // Update scan frame rectangle when dimensions change
  useEffect(() => {
    const handler = () => updateScanFrameRect();
    const subscription = Dimensions.addEventListener('change', handler);

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else if (typeof (Dimensions as any).removeEventListener === 'function') {
        (Dimensions as any).removeEventListener('change', handler);
      }
    };
  }, [updateScanFrameRect]);

  const loadSyncStatus = async () => {
    const stats = await OfflineStorageService.getQueueStats();
    setSyncStatus({ pending: stats.pending, synced: stats.synced });
  };

  // Check if barcode is within scan rectangle bounds
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) return false;

    const barcodeX = bounds.origin?.x + (bounds.size?.width / 2) || 0;
    const barcodeY = bounds.origin?.y + (bounds.size?.height / 2) || 0;

    if (scanFrameRect) {
      const toleranceX = scanFrameRect.width * 0.2;
      const toleranceY = scanFrameRect.height * 0.2;

      const left = scanFrameRect.left - toleranceX;
      const right = scanFrameRect.right + toleranceX;
      const top = scanFrameRect.top - toleranceY;
      const bottom = scanFrameRect.bottom + toleranceY;

      const isInMeasuredArea = (
        barcodeX >= left &&
        barcodeX <= right &&
        barcodeY >= top &&
        barcodeY <= bottom
      );

      logger.log('📍 Enhanced scan barcode position check:', {
        source: 'measured',
        barcodeX,
        barcodeY,
        left,
        top,
        right,
        bottom,
        toleranceX,
        toleranceY,
        cameraWidth: scanFrameRect.cameraWidth,
        cameraHeight: scanFrameRect.cameraHeight,
        isInArea: isInMeasuredArea
      });

      return isInMeasuredArea;
    }

    // Fallback: approximate based on screen dimensions if layout not ready yet
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    const scanFrameWidth = 320;
    const scanFrameHeight = 150;
    const overlayBottomOffset = 120;
    const overlayHeight = screenHeight - overlayBottomOffset;

    const scanAreaLeft = (screenWidth - scanFrameWidth) / 2;
    const scanAreaRight = scanAreaLeft + scanFrameWidth;
    const scanAreaTop = (overlayHeight - scanFrameHeight) / 2;
    const scanAreaBottom = scanAreaTop + scanFrameHeight;

    const toleranceX = scanFrameWidth * 0.2;
    const toleranceY = scanFrameHeight * 0.2;

    const isInFallbackArea = (
      barcodeX >= (scanAreaLeft - toleranceX) &&
      barcodeX <= (scanAreaRight + toleranceX) &&
      barcodeY >= (scanAreaTop - toleranceY) &&
      barcodeY <= (scanAreaBottom + toleranceY)
    );

    logger.log('📍 Enhanced scan barcode position check:', {
      source: 'fallback',
      barcodeX,
      barcodeY,
      scanAreaLeft: scanAreaLeft - toleranceX,
      scanAreaTop: scanAreaTop - toleranceY,
      scanAreaRight: scanAreaRight + toleranceX,
      scanAreaBottom: scanAreaBottom + toleranceY,
      toleranceX,
      toleranceY,
      screenWidth,
      screenHeight,
      overlayHeight,
      isInArea: isInFallbackArea
    });

    return isInFallbackArea;
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
      logger.log('Looking up item details for barcode:', barcode);
      
      if (!organization?.id) {
        logger.log('No organization ID, skipping item lookup');
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
        logger.error('Error looking up bottle:', bottleError);
        return null;
      }

      if (bottleData) {
        logger.log('Found bottle details:', bottleData);
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

      logger.log('No item found for barcode:', barcode);
      return null;
    } catch (error) {
      logger.error('Error in lookupItemDetails:', error);
      return null;
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (data: string) => {
    logger.log('📷 EnhancedScanScreen barcode detected:', data);
    logger.log('📷 Scanning ready state:', scanningReady);
    logger.log('📷 Countdown:', scanningCountdown);
    
    // Don't process scans until countdown is finished
    if (!scanningReady) {
      logger.log('📷 Skipping scan - countdown still active');
      return;
    }
    
    if (!data || loading) {
      logger.log('📷 Skipping scan - no data or loading');
      return;
    }
    
    // Check if this barcode is already being processed (prevents rapid duplicate scans)
    if (processingBarcodesRef.current.has(data)) {
      logger.log('⚠️ Barcode already being processed, ignoring duplicate scan:', data);
      return;
    }
    
    // Mark this barcode as being processed IMMEDIATELY (before any async operations)
    // Note: We don't check lastScannedBarcodeRef here because the debounce in onBarcodeScanned
    // already handles that. This check is for preventing concurrent processing of the same barcode.
    processingBarcodesRef.current.add(data);

    // Show what was scanned for feedback
    setLastScanAttempt(data);
    
    // Validate cylinder serial number format first
    const serialValidation = validateCylinderSerial(data);
    if (!serialValidation.isValid) {
      logger.log('📷 Barcode scanned but invalid format:', serialValidation.scannedValue);
      logger.log('📷 Validation error:', serialValidation.error);
      setScanFeedback(`❌ ${serialValidation.error}`);
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setScanFeedback('');
        setLastScanAttempt('');
      }, 3000);
      
      // Provide error feedback
      await feedbackService.scanError(serialValidation.error || 'Invalid barcode format');
      processingBarcodesRef.current.delete(data);
      return;
    }

    // Check if barcode is in scan region (future enhancement)
    if (!isBarcodeInScanRegion(data)) {
      logger.log('📷 Barcode not in scan region');
      setScanFeedback('📍 Point camera directly at barcode');
      setTimeout(() => setScanFeedback(''), 2000);
      processingBarcodesRef.current.delete(data);
      return;
    }

    // Show processing feedback
    setScanFeedback('🔍 Processing barcode...');
    
    const now = Date.now();
    
    // Check if barcode was already scanned in this session
    const existingScanIndex = scannedItems.findIndex(item => item.barcode === data);
    if (existingScanIndex !== -1) {
      const existingScan = scannedItems[existingScanIndex];
      
      // If scanning with the same action, it's a duplicate
      if (existingScan.action === selectedAction) {
        logger.log('⚠️ Duplicate scan detected in current session:', data);
        setScanFeedback(`⚠️ Already scanned as ${selectedAction === 'out' ? 'SHIP' : 'RETURN'}: ${data}`);
        setDuplicates(prev => [...prev, data]);
        
        // Clear feedback after 5 seconds
        setTimeout(() => {
          setScanFeedback('');
          setLastScanAttempt('');
        }, 5000);
        
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
        
        // Show alert for duplicate
        Alert.alert(
          'Duplicate Scan',
          `Barcode ${data} was already scanned as ${selectedAction === 'out' ? 'SHIP' : 'RETURN'} in this session.`,
          [{ text: 'OK' }]
        );
        
        // Clear processing flag
        processingBarcodesRef.current.delete(data);
        return;
      } else {
        // Different action - update the existing scan instead of adding duplicate
        logger.log(`🔄 Switching scan action from ${existingScan.action} to ${selectedAction} for barcode: ${data}`);
        
        // Remove the old scan and add new one with updated action
        setScannedItems(prev => {
          const updated = [...prev];
          updated.splice(existingScanIndex, 1); // Remove old scan
          
          // Create new scan with updated action
          const updatedScan: ScanResult = {
            ...existingScan,
            action: selectedAction,
            timestamp: Date.now(),
            id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // New ID
          };
          
          const final = [updatedScan, ...updated];
          
          // Update feedback
          const actionLabel = selectedAction === 'out' ? 'SHIP' : 'RETURN';
          const count = final.filter(item => item.action === selectedAction).length;
          const bottleText = count === 1 ? 'bottle' : 'bottles';
          setScanFeedback(`🔄 Switched to ${actionLabel}: ${count} ${bottleText} scanned (${actionLabel})`);
          
          // No alert needed - feedback message is sufficient
          
          return final;
        });
        
        // Clear processing flag
        processingBarcodesRef.current.delete(data);
        return;
      }
    }
    
    // Check if barcode exists in the system
    try {
      logger.log('🔍 Checking if barcode exists in system:', data);
      const { data: existingBottle, error: bottleError } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, type, description, status')
        .or(`barcode_number.eq.${data},serial_number.eq.${data}`)
        .eq('organization_id', organization?.id)
        .maybeSingle();
      
      if (bottleError) {
        logger.error('Error checking if bottle exists:', bottleError);
        throw new Error('Failed to verify barcode in system');
      }
      
      if (!existingBottle) {
        logger.log('❌ Barcode not found in system:', data);
        setScanFeedback(`❌ Not in system: ${data}`);
        
        // Clear feedback after 5 seconds
        setTimeout(() => {
          setScanFeedback('');
          setLastScanAttempt('');
        }, 5000);
        
        // Provide error feedback
        await feedbackService.scanError('Barcode not found in system');
        
        // Show detailed alert
        Alert.alert(
          'Barcode Not Found',
          `Barcode ${data} is not registered in the system.\n\nPlease verify the barcode or add it to the system before scanning.`,
          [{ text: 'OK' }]
        );
        processingBarcodesRef.current.delete(data);
        return;
      }
      
      logger.log('✅ Barcode found in system:', existingBottle);
    } catch (error) {
      logger.error('Error verifying barcode in system:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify barcode';
      
      setScanFeedback(`❌ ${errorMessage}`);
      setTimeout(() => {
        setScanFeedback('');
        setLastScanAttempt('');
      }, 5000);
      
      await feedbackService.scanError(errorMessage);
      Alert.alert('Verification Error', errorMessage);
      processingBarcodesRef.current.delete(data);
      return;
    }
    
    // Note: Removed duplicate SHIP check - allow re-shipping even if previously shipped
    // The Verification Center page on the website will show warnings about bottle location/status
    
    // Batch mode rapid scanning protection
    if (batchMode) {
      const timeSinceLastScan = now - lastScanRef.current;
      const minInterval = scanSpeed === 'rapid' ? 300 : scanSpeed === 'fast' ? 500 : 800;
      
      if (timeSinceLastScan < minInterval) {
        return; // Too fast, ignore scan
      }
    }
    
    lastScanRef.current = now;
    
    if (!batchMode) {
      setLoading(true);
      // Keep camera open - don't close it after scanning
      // setIsScanning(false); // Removed to keep camera open for multiple scans
    }

    try {
      // Format validation disabled - using basic validation only
      logger.log('🔍 Using basic validation (FormatValidationService disabled)');
      
      // For cylinders, use the original 9-digit barcode directly
      logger.log('📷 Using cylinder serial number for lookup:', data);
      
      logger.log('🔍 Calling processScan...');
      await processScan(data);
      logger.log('🔍 processScan completed');
      
      // Note: Scan feedback with count is now set inside processScan's setScannedItems callback
      // This ensures we have the accurate count after the item is added
      
      // Don't clear feedback immediately - wait longer to ensure user sees it
      // setTimeout(() => {
      //   setScanFeedback('');
      //   setLastScanAttempt('');
      // }, 3000);
      
      // Keep feedback visible for debugging
      logger.log('🔍 Keeping scan feedback visible for debugging');
      
      // Provide haptic/audio success feedback
      await feedbackService.scanSuccess(data);
      
      // Send local notification for successful scan (Expo Go/dev build)
      await notificationService.sendLocalNotification({
        title: 'Scan successful',
        body: `Barcode ${data} processed`,
        categoryId: 'scan_complete',
        data: { barcode: data }
      });
      
      // Don't show alert in non-batch mode - just show feedback to keep camera open
      // Removed Alert.alert to keep camera open and allow continuous scanning
      
      if (batchMode) {
        setScanCount(prev => prev + 1);
        // Continue scanning in batch mode
        setIsScanning(true);
      } else {
        // Keep camera open for next scan
        setIsScanning(true);
      }
    } catch (error) {
      logger.error('❌ Error in handleBarcodeScan:', error);
      logger.error('Error type:', typeof error);
      logger.error('Error stack:', error?.stack);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to process scan';
      
      // Force update the UI to show at least an error
      // Add a dummy scan to show something happened
      const failedScan: ScanResult = {
        id: `failed_${Date.now()}`,
        barcode: data,
        timestamp: Date.now(),
        action: selectedAction,
        synced: false,
        offline: true,
        notes: `ERROR: ${errorMessage}`
      };
      
      // Add the failed scan to show something
      setScannedItems(prev => {
        const updated = [failedScan, ...prev];
        logger.log('❌ Added failed scan to list, count:', updated.length);
        
        // Still show count even for errors
        const actionLabel = selectedAction === 'out' ? 'SHIP' : 'RETURN';
        const bottleText = updated.length === 1 ? 'bottle' : 'bottles';
        const errorFeedback = `❌ Error but added: ${updated.length} ${bottleText} (${actionLabel})`;
        setScanFeedback(errorFeedback);
        
        // Show alert with error details
        Alert.alert(
          '⚠️ Scan Error',
          `Error: ${errorMessage}\n\nBut scan was added to list.\n\nCount: ${updated.length} ${bottleText} (${actionLabel})`,
          [{ text: 'OK' }]
        );
        
        return updated;
      });
      
      // Provide error feedback
      await feedbackService.scanError(errorMessage);
      
      // Send local notification for scan error (Expo Go/dev build)
      await notificationService.sendLocalNotification({
        title: 'Scan failed',
        body: errorMessage,
        categoryId: 'sync_status',
        data: { reason: 'processing_error' }
      });
      
      // Keep camera open even on error - don't show blocking alert
      // Removed Alert.alert to keep camera open
    } finally {
      if (!batchMode) {
        setLoading(false);
        // Ensure camera stays open
        setIsScanning(true);
      }
      
      // Clear processing flag
      processingBarcodesRef.current.delete(data);
    }
  };

  // Process scan (online or offline)
  const processScan = async (barcode: string) => {
    try {
      logger.log('📦 processScan called for barcode:', barcode);
      logger.log('📦 Current scannedItems count:', scannedItems.length);
      logger.log('📦 Selected action:', selectedAction);
      
      // Get current location data if available
      const locationData = fieldToolsService.getCurrentLocationData();
      
      // Look up item details
      logger.log('📦 Looking up item details...');
      const itemDetails = await lookupItemDetails(barcode);
      setLastScannedItemDetails(itemDetails);
      logger.log('📦 Item details found:', itemDetails ? 'Yes' : 'No');
      
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
      
      logger.log('📦 Created scanResult:', {
        id: scanResult.id,
        barcode: scanResult.barcode,
        action: scanResult.action,
        hasItemDetails: !!scanResult.itemDetails
      });

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
      logger.log('📦 Adding scan to scannedItems...');
      setScannedItems(prev => {
        const updated = [scanResult, ...prev];
        logger.log('📦 ✅ Added scan result to local items');
        logger.log('📦 Previous count:', prev.length, '→ New count:', updated.length);
        
        // Update scan feedback with count (only for ship/return actions)
        if (selectedAction === 'out' || selectedAction === 'in') {
          const actionLabel = selectedAction === 'out' ? 'SHIP' : 'RETURN';
          const bottleText = updated.length === 1 ? 'bottle' : 'bottles';
          const feedbackMsg = `✅ ${updated.length} ${bottleText} scanned (${actionLabel})`;
          logger.log('📦 Setting feedback:', feedbackMsg);
          setScanFeedback(feedbackMsg);
        } else {
          setScanFeedback(`✅ Scanned: ${scanResult.barcode}`);
        }
        
        return updated;
      });
      
      logger.log('📦 Scan successfully added to local state');
    
    // DISABLED: Don't sync immediately - wait for "Submit Order" button
    // Scans are now stored locally and only synced when user explicitly submits the order
    logger.log('✅ Scan saved locally. Will sync when you click "Submit Order"');
    
    // Store in offline queue for backup (will be synced on submit)
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

      // Try to load sync status but don't fail if it errors
      try {
        await loadSyncStatus();
      } catch (syncError) {
        logger.warn('Failed to load sync status (non-critical):', syncError);
      }
      
      logger.log('📦 processScan completed successfully');
    } catch (error) {
      logger.error('❌ processScan failed:', error);
      logger.error('Error type:', typeof error);
      logger.error('Error details:', error);
      // Don't throw - we already added the scan to local state
      // throw error; // Re-throw to be caught by handleBarcodeScan
    }
  };

  // Sync scan to server
  const syncScanToServer = async (scanResult: ScanResult) => {
    try {
      // Debug logging
      logger.log('Sync attempt - Organization:', organization?.id, 'User:', user?.id);
      logger.log('Scan data:', {
        barcode: scanResult.barcode,
        action: scanResult.action,
        location: scanResult.location,
        // notes: scanResult.notes, // Removed - column doesn't exist in bottle_scans
        timestamp: scanResult.timestamp
      });
      
      if (!organization?.id) {
        throw new Error('No organization ID available');
      }

      // CRITICAL: Prevent scans from being saved to deleted organizations
      if (organization.deleted_at) {
        const errorMsg = 'Cannot save scans: Your organization has been deleted. Please contact your administrator.';
        logger.error('❌ BLOCKED: Attempted to save scan to deleted organization:', {
          organization_id: organization.id,
          organization_name: organization.name,
          deleted_at: organization.deleted_at
        });
        throw new Error(errorMsg);
      }
      
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      // Test database connection and table access
      logger.log('Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('bottle_scans')
        .select('id')
        .limit(1);
      
      if (testError) {
        logger.error('Database test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      logger.log('Database connection test passed');

      // Debug: Log the exact data being inserted  
      // Get itemDetails from scanResult (stored during processScan)
      const itemDetails = scanResult.itemDetails;
      
      const insertData: any = {
        organization_id: organization.id,
        bottle_barcode: scanResult.barcode, // Changed from barcode_number to bottle_barcode
        // product_code: removed - column doesn't exist in bottle_scans table
        mode: scanResult.action === 'out' ? 'SHIP' : scanResult.action === 'in' ? 'RETURN' : scanResult.action.toUpperCase(), // Map to database expected values
        location: scanResult.location,
        // notes: scanResult.notes, // Removed - column doesn't exist in bottle_scans
        user_id: user.id, // Changed from scanned_by to user_id
        order_number: orderNumber || scanSessionId, // Use orderNumber from route params, fallback to scanSessionId
        customer_name: routeCustomerName || null,
        customer_id: customerId || null,
        // scan_date: new Date().toISOString(), // Removed - column doesn't exist in bottle_scans
        timestamp: new Date().toISOString(), // Add timestamp
        created_at: new Date().toISOString() // Add created_at
      };
      
      logger.log('Insert data for bottle_scans:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('bottle_scans')
        .insert([insertData])
        .select(); // Add .select() to ensure we get data back

      if (error) {
        logger.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        // Log the full error object to see what properties it has
        logger.error('Full error object keys:', Object.keys(error));
        logger.error('Full error object:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.message || error.details || error.hint || error.code || 'Unknown database error';
        throw new Error(`Database error: ${errorMessage}`);
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        logger.warn('Insert succeeded but no data returned. This is unusual but not critical.');
        logger.log('Scan synced successfully to bottle_scans (no data returned)');
      } else {
        logger.log('Scan synced successfully to bottle_scans:', data);
      }

      // Also save to scans table for backup/recovery and history purposes
      // This is critical for verified orders to display bottles after approval
      const scansInsertData = {
        organization_id: organization.id,
        barcode_number: scanResult.barcode,
        product_code: itemDetails?.product_code || itemDetails?.productCode || null,
        action: scanResult.action,
        mode: scanResult.action === 'out' ? 'SHIP' : scanResult.action === 'in' ? 'RETURN' : scanResult.action.toUpperCase(),
        location: scanResult.location,
        scanned_by: user.id,
        order_number: orderNumber || scanSessionId,
        customer_name: routeCustomerName || null,
        customer_id: customerId || null,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      logger.log('Inserting into scans table:', JSON.stringify(scansInsertData, null, 2));

      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .insert([scansInsertData])
        .select(); // Add .select() to ensure we get data back

      if (scansError) {
        logger.warn('Warning: Failed to save to scans table (non-critical):', scansError);
        // Don't throw - this is a backup, bottle_scans is the primary record
      } else if (!scansData || !Array.isArray(scansData) || scansData.length === 0) {
        logger.warn('Scans table insert succeeded but no data returned (non-critical)');
      } else {
        logger.log('Scan also saved to scans table successfully:', scansData);
      }

      logger.log('Customer info from route params:', { customerId, customerName: routeCustomerName });

      // Also update bottle status and location with customer info
      // Wrap in try-catch so it doesn't fail the entire sync if bottle update fails
      try {
        await updateBottleStatus(scanResult.barcode, scanResult.action);
      } catch (bottleError) {
        logger.warn('Bottle status update failed (non-critical):', bottleError);
        // Don't throw - scan was already saved successfully
      }
    } catch (error) {
      logger.error('Failed to sync scan to server:', error);
      logger.error('Error type:', typeof error);
      logger.error('Error constructor:', error?.constructor?.name);
      logger.error('Error stack:', error?.stack);
      
      // Provide more detailed error message
      let errorMessage = 'Unknown sync error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for common error patterns
        if (error.message.includes('property') && error.message.includes('data')) {
          errorMessage = 'Database error: Invalid response from server. Please check your connection and try again.';
        } else if (error.message.includes('organization')) {
          errorMessage = 'Organization error: Please log out and log back in.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(`Sync failed: ${errorMessage}`);
    }
  };

  // Update bottle status
  const updateBottleStatus = async (barcode: string, action: 'in' | 'out' | 'locate' | 'fill', itemDetails?: any) => {
    // First, check current bottle status
    const { data: currentBottle, error: fetchError } = await supabase
      .from('bottles')
      .select('status')
      .eq('barcode_number', barcode)
      .eq('organization_id', organization?.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching current bottle status:', fetchError);
      // If bottle doesn't exist, that's okay - we'll still try to update/create it
      logger.warn('Bottle may not exist in database, continuing with update attempt');
    }

    // Only check status if we got data back
    if (currentBottle) {
      logger.log('Current bottle status:', { barcode, currentStatus: currentBottle.status, action });

      // Business logic: Allow re-shipping in case previous scan was rejected
      // Only log a warning instead of throwing an error
      if (action === 'out' && currentBottle.status === 'delivered') {
        logger.log('⚠️ Warning: Bottle already marked as shipped. Allowing re-scan (previous scan may have been rejected).');
        // Don't throw error - allow the scan to proceed
      }
    } else {
      logger.log('No existing bottle found, will create/update with new status');
    }

    let updateData: any = {};
    
    switch (action) {
      case 'out':
        // NOTE: Bottles should NOT be assigned here - this bypasses verification
        // Bottle assignment should ONLY happen during approval/verification via assignBottlesToCustomer()
        // This function should only update location/status, not assign bottles
        // Only update location if provided, don't change status or assign customer
        if (location) {
          updateData.location = location;
        }
        // Don't set status to 'delivered' or assign customer - verification will handle that
        logger.log('Scan recorded - bottle assignment will happen during verification:', { 
          barcode, 
          customerId, 
          customerName: routeCustomerName,
          note: 'Bottle not assigned - waiting for verification'
        });
        // If no location update, don't update anything
        if (!location) {
          logger.log('No location provided and no assignment - skipping bottle update');
          return; // Don't update bottle at all
        }
        break;
      case 'in':
        // NOTE: Bottle unassignment should also happen during verification
        // For now, we'll still mark as empty and update location, but not unassign customer
        // The verification process will handle customer unassignment
        updateData.status = 'empty';
        if (location) {
          updateData.location = location;
        } else {
          updateData.location = 'Warehouse';
        }
        // Don't unassign customer here - verification will handle that
        logger.log('Return scan recorded - customer unassignment will happen during verification');
        break;
      case 'locate':
        // Don't change status for locate, just update location
        if (location) updateData.location = location;
        break;
      case 'fill':
        updateData.status = 'filled';
        break;
      default:
        updateData.status = action === 'in' ? 'available' : 'rented';
        break;
    }

    logger.log('Updating bottle status:', { barcode, updateData, organizationId: organization?.id });

    const { data: updatedBottle, error } = await supabase
      .from('bottles')
      .update(updateData)
      .eq('barcode_number', barcode)
      .eq('organization_id', organization?.id)
      .select();

    if (error) {
      logger.error('Error updating bottle status:', error);
      logger.error('Update failed for barcode:', barcode, 'with data:', updateData);
      // Don't throw - this is non-critical, scan was already saved
      logger.warn('Bottle status update failed, but scan was saved successfully');
      return;
    } else if (updatedBottle) {
      logger.log(`✅ Bottle ${barcode} status updated successfully:`, updateData);
      logger.log('Updated bottle record:', updatedBottle);
    } else {
      logger.warn('Bottle update succeeded but no data returned');
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
      logger.error('Sync error:', error);
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
      logger.log('Submitting order for processing...');
      
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

      // Track all errors throughout the process
      const allErrors: string[] = [];
      let scansUpdated = false;
      let orderCreated = false;

      // First, ensure all items are synced AND update order numbers
      const pendingItems = scannedItems.filter(i => !i.synced);
      if (pendingItems.length > 0) {
        logger.log(`Syncing ${pendingItems.length} pending items before submission...`);
        
        const syncErrors: string[] = [];
        
        for (const item of pendingItems) {
          try {
            logger.log(`Attempting to sync item: ${item.barcode}...`);
            await syncScanToServer(item);
            // Mark as synced in the UI
            setScannedItems(prev => 
              prev.map(scannedItem => 
                scannedItem.id === item.id 
                  ? { ...scannedItem, synced: true } 
                  : scannedItem
              )
            );
            logger.log(`✅ Successfully synced item: ${item.barcode}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Failed to sync item ${item.barcode}:`, error);
            logger.error('Error details:', {
              message: errorMessage,
              errorType: typeof error,
              errorObject: error
            });
            syncErrors.push(`${item.barcode}: ${errorMessage}`);
            allErrors.push(`Failed to sync ${item.barcode}: ${errorMessage}`);
            // Continue with other items instead of stopping
          }
        }
        
        // If there were any sync errors, track them
        if (syncErrors.length > 0) {
          const errorCount = syncErrors.length;
          const successCount = pendingItems.length - errorCount;
          logger.warn(`⚠️ ${errorCount} item(s) failed to sync, ${successCount} succeeded`);
        }
      }

      // CRITICAL: Update order_number on all scans (both synced and pending)
      // This ensures scans with null or scanSessionId get the correct order_number
      logger.log(`Updating order_number to "${orderNumber}" for all scans in this session...`);
      
      const allBarcodes = scannedItems.map(item => item.barcode);
      if (allBarcodes.length > 0) {
        // Update bottle_scans table - update ALL scans for these barcodes to ensure correct order_number
        const { data: bottleScansUpdate, error: updateBottleScansError } = await supabase
          .from('bottle_scans')
          .update({ order_number: orderNumber })
          .in('bottle_barcode', allBarcodes)
          .eq('organization_id', organization.id)
          .select('id');
        
        if (updateBottleScansError) {
          logger.error('❌ Failed to update order_number in bottle_scans:', updateBottleScansError);
          allErrors.push(`Failed to update bottle_scans: ${updateBottleScansError.message}`);
        } else {
          const updatedCount = bottleScansUpdate?.length || 0;
          logger.log(`✅ Updated order_number in bottle_scans for ${updatedCount} records`);
          if (updatedCount > 0) scansUpdated = true;
          if (updatedCount === 0) {
            logger.warn('⚠️ No bottle_scans records were updated - scans may not exist yet');
            allErrors.push('Warning: No bottle_scans records found to update');
          }
        }

        // Also update scans table if it has order_number column
        // Note: Some database schemas may not have order_number in scans table
        try {
          const { data: scansUpdate, error: updateScansError } = await supabase
            .from('scans')
            .update({ order_number: orderNumber })
            .in('barcode_number', allBarcodes)
            .eq('organization_id', organization.id)
            .or(`order_number.is.null,order_number.eq.${scanSessionId}`)
            .select('id'); // Update null or scanSessionId
          
          if (updateScansError) {
            // Check if error is due to missing column
            if (updateScansError.message?.includes('does not exist') || updateScansError.message?.includes('column')) {
              logger.warn('⚠️ scans table does not have order_number column, skipping update');
              // Don't add to errors - this is expected for some schemas
            } else {
              logger.error('❌ Failed to update order_number in scans:', updateScansError);
              allErrors.push(`Failed to update scans table: ${updateScansError.message}`);
            }
          } else {
            const updatedCount = scansUpdate?.length || 0;
            logger.log(`✅ Updated order_number in scans table for ${updatedCount} records`);
            if (updatedCount > 0) scansUpdated = true;
          }
        } catch (err) {
          logger.warn('⚠️ Error updating scans table (may not have order_number column):', err);
          // Don't add to errors - this is expected for some schemas
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
      const { data: existingOrder, error: checkError } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('sales_order_number', orderNumber)
        .eq('organization_id', organization.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle null gracefully

      let orderResult;
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is okay
        logger.error('Error checking for existing order:', checkError);
        // Continue anyway - we'll try to create it
      }

      if (existingOrder && existingOrder.id) {
        // Update existing order
        const { data, error } = await supabase
          .from('sales_orders')
          .update({
            notes: orderData.notes
          })
          .eq('id', existingOrder.id)
          .select()
          .maybeSingle(); // Use maybeSingle for safety

        if (error) {
          logger.error('❌ Error updating sales order:', error);
          allErrors.push(`Failed to update sales order: ${error.message || 'Unknown error'}`);
        } else if (data) {
          orderResult = data;
          orderCreated = true;
          logger.log('✅ Updated existing sales order:', orderResult);
        } else {
          logger.warn('⚠️ Order update succeeded but no data returned');
          allErrors.push('Order update completed but no confirmation received');
        }
      } else {
        // Create new order
        const { data, error } = await supabase
          .from('sales_orders')
          .insert([orderData])
          .select()
          .maybeSingle(); // Use maybeSingle for safety

        if (error) {
          logger.error('❌ Error creating sales order:', error);
          allErrors.push(`Failed to create sales order: ${error.message || 'Unknown error'}`);
        } else if (data) {
          orderResult = data;
          orderCreated = true;
          logger.log('✅ Created new sales order:', orderResult);
        } else {
          logger.warn('⚠️ Order creation succeeded but no data returned');
          allErrors.push('Order creation completed but no confirmation received');
        }
      }

      // Determine final status
      const hasErrors = allErrors.length > 0;
      const hasPartialSuccess = scansUpdated || orderCreated;
      const hasFullSuccess = scansUpdated && orderCreated && allErrors.length === 0;

      // Mark all scanned items as submitted
      setScannedItems(prev => 
        prev.map(item => ({ ...item, submitted: true }))
      );

      // Show appropriate message based on results
      if (hasFullSuccess) {
        // Play success sound
        await feedbackService.provideFeedback('batch_complete', { count: scannedItems.length });
        
        // Show success message
        Alert.alert(
          'Order Submitted Successfully!',
          `Order ${orderNumber} has been submitted for processing with ${scannedItems.length} items.\n\nYou can find it on the website under Sales Orders or Verification Center.`,
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
        logger.log('✅ Order submission completed successfully');
      } else if (hasPartialSuccess) {
        // Partial success - show warning with details
        const errorSummary = allErrors.slice(0, 5).join('\n• ');
        const moreErrors = allErrors.length > 5 ? `\n...and ${allErrors.length - 5} more errors` : '';
        
        Alert.alert(
          'Order Submission Completed with Warnings',
          `Order ${orderNumber} was processed but some issues occurred:\n\n• ${errorSummary}${moreErrors}\n\n${scansUpdated ? '✅ Scans were updated' : '❌ Scans were NOT updated'}\n${orderCreated ? '✅ Order was created' : '❌ Order was NOT created'}\n\nPlease check the logs and verify the order on the website.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowScannedItems(false);
                setScannedItems([]);
                navigation.navigate('Home');
              }
            }
          ]
        );
        logger.warn('⚠️ Order submission completed with errors:', allErrors);
      } else {
        // Complete failure
        const errorSummary = allErrors.slice(0, 5).join('\n• ');
        const moreErrors = allErrors.length > 5 ? `\n...and ${allErrors.length - 5} more errors` : '';
        
        Alert.alert(
          'Order Submission Failed',
          `Failed to submit order ${orderNumber}:\n\n• ${errorSummary}${moreErrors}\n\nPlease try again or contact support. Your scans may still be saved but not linked to an order.`,
          [{ text: 'OK' }]
        );
        logger.error('❌ Order submission failed:', allErrors);
      }

    } catch (error) {
      logger.error('Error submitting order:', error);
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
          { text: 'Edit', onPress: () => logger.log('Edit:', item.barcode) }
        ]);
        break;
        
      case 'locate':
        // Show location or navigate to locate screen
        Alert.alert('Locate Item', `Find ${item.barcode}`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Locate', onPress: () => logger.log('Locate:', item.barcode) }
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

  // Remove individual scanned item
  const removeScannedItem = async (index: number) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove this scanned item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const itemToRemove = scannedItems[index];
            
            // Remove from local state
            setScannedItems(prev => prev.filter((_, i) => i !== index));
            
            // Update scan count
            setScanCount(prev => Math.max(0, prev - 1));
            
            // Remove from duplicates if it was there
            setDuplicates(prev => prev.filter(dup => dup !== itemToRemove.barcode));
            
            logger.log(`Removed scanned item from local state: ${itemToRemove.barcode}`);
            
            // Delete from database if it was synced
            if (itemToRemove.synced && isOnline) {
              try {
                logger.log(`Attempting to delete scan from database: ${itemToRemove.barcode}`);
                
                // Delete ALL scans with this barcode from bottle_scans table (to handle duplicates)
                const { error: deleteError } = await supabase
                  .from('bottle_scans')
                  .delete()
                  .eq('bottle_barcode', itemToRemove.barcode)
                  .eq('organization_id', organization?.id)
                  .gte('timestamp', new Date(itemToRemove.timestamp - 60000).toISOString()) // Within 1 minute window
                  .lte('timestamp', new Date(itemToRemove.timestamp + 60000).toISOString());
                
                if (deleteError) {
                  logger.error('Error deleting scan from database:', deleteError);
                  Alert.alert(
                    'Warning',
                    'Item removed from app but may still appear on website. Please check import records.',
                    [{ text: 'OK' }]
                  );
                } else {
                  logger.log(`Successfully deleted scan(s) from database: ${itemToRemove.barcode}`);
                }
              } catch (error) {
                logger.error('Exception deleting scan from database:', error);
              }
            } else if (!isOnline) {
              logger.log('Offline - scan deletion will not sync to server');
              Alert.alert(
                'Offline Mode',
                'Item removed from app. This change will not sync to the server while offline.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
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
      case 'locate': return '#40B5AD';
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
    { key: 'in', label: 'Check In', color: theme.success, icon: '📥' },
    { key: 'out', label: 'Check Out', color: theme.error, icon: '📤' },
    { key: 'locate', label: 'Locate', color: theme.primary, icon: '🔍' },
    { key: 'fill', label: 'Fill', color: theme.warning, icon: '⛽' }
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
        <Text style={styles.headerTitle}>Enhanced Scan</Text>
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
              logger.log('Done button pressed');
              // Show scanned items list
              setShowScannedItems(true);
            }}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Information - REMOVED */}
      {/* Order box has been removed for a clean screen */}

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
      <Modal visible={isScanning} animationType="slide" transparent={true}>
        <View style={styles.cameraModal}>
          <View
            style={styles.cameraWrapper}
            ref={cameraContainerRef}
            onLayout={updateScanFrameRect}
          >
            <CameraView
              style={[StyleSheet.absoluteFill, styles.camera]}
              onBarcodeScanned={({ data, bounds }: BarcodeScanningResult) => {
                const now = Date.now();
                
                if (!data || typeof data !== 'string') {
                  return;
                }
                
                // Debounce: Ignore if same barcode scanned within last 2 seconds
                if (data === lastScannedBarcodeRef.current && (now - lastScannedTimeRef.current) < 2000) {
                  logger.log('📷 Ignoring duplicate scan (debounce):', data);
                  return;
                }
                
                // Check if barcode is within scan area (if bounds are available)
                if (bounds && !isBarcodeInScanArea(bounds)) {
                  logger.log('📷 Enhanced scan barcode outside scan area, ignoring');
                  return;
                }
                
                // Update last scanned info immediately to prevent rapid re-scans
                // This prevents the camera from triggering multiple times
                lastScannedBarcodeRef.current = data;
                lastScannedTimeRef.current = now;
                
                // Clear any existing cooldown timer
                if (scanCooldownRef.current) {
                  clearTimeout(scanCooldownRef.current);
                }
                
                // Set cooldown to prevent re-scanning for 2 seconds
                scanCooldownRef.current = setTimeout(() => {
                  lastScannedBarcodeRef.current = '';
                  lastScannedTimeRef.current = 0;
                }, 2000);
                
                logger.log('📷 Processing barcode scan:', data);
                // Call handleBarcodeScan - it will check processingBarcodesRef to prevent duplicates
                handleBarcodeScan(data);
              }}
              onCameraReady={() => {
                logger.log('📷 Camera is ready and active');
                logger.log('📷 Camera ready - should be detecting barcodes now');
                updateScanFrameRect();
              }}
              onMountError={(error) => {
                logger.error('❌ Camera mount error:', error);
                Alert.alert('Camera Error', 'Failed to start camera: ' + error.message);
              }}
            />
            
            <View
              style={styles.cameraOverlay}
              pointerEvents="none"
              onLayout={updateScanFrameRect}
            >
              <View
                ref={scanFrameRef}
                style={styles.scanFrame}
                pointerEvents="none"
                onLayout={updateScanFrameRect}
              />
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
          </View>
          
          {/* Close Button - Separate from overlay to ensure it works */}
          <TouchableOpacity
            style={styles.closeCameraButton}
            onPress={() => {
              logger.log('Close button pressed');
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
            
            <Pressable 
              style={({ pressed }) => [
                styles.cameraActionButton,
                selectedAction === 'in' && styles.cameraActionButtonSelected,
                { backgroundColor: 'transparent' },
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                logger.log('RETURN button pressed');
                setSelectedAction('in');
                // Provide haptic feedback
                feedbackService.quickAction('return selected');
              }}
              android_ripple={{ color: 'transparent' }}
            >
              <View style={styles.cameraActionButtonContent}>
                <Text style={[
                  styles.cameraActionButtonLabel,
                  selectedAction === 'in' && styles.cameraActionButtonLabelSelected
                ]}>RETURN</Text>
                <Text style={[
                  styles.cameraActionButtonCount,
                  selectedAction === 'in' && styles.cameraActionButtonCountSelected
                ]}>{scannedItems.filter(item => item.action === 'in').length}</Text>
              </View>
            </Pressable>
            
            <Pressable 
              style={({ pressed }) => [
                styles.cameraActionButton, 
                styles.cameraShipButton,
                selectedAction === 'out' && styles.cameraActionButtonSelected,
                { backgroundColor: 'transparent' },
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                logger.log('SHIP button pressed');
                setSelectedAction('out');
                // Provide haptic feedback
                feedbackService.quickAction('ship selected');
              }}
              android_ripple={{ color: 'transparent' }}
            >
              <View style={styles.cameraActionButtonContent}>
                <Text style={[
                  styles.cameraActionButtonLabel,
                  selectedAction === 'out' && styles.cameraActionButtonLabelSelected
                ]}>SHIP</Text>
                <Text style={[
                  styles.cameraActionButtonCount,
                  selectedAction === 'out' && styles.cameraActionButtonCountSelected
                ]}>{scannedItems.filter(item => item.action === 'out').length}</Text>
                <Text style={styles.cameraActionButtonIcon}>📦</Text>
              </View>
            </Pressable>
          </View>

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
                    <View style={styles.scannedItemHeaderRight}>
                      <View style={[
                        styles.scannedItemStatus,
                        { backgroundColor: item.synced ? '#10B981' : '#F59E0B' }
                      ]}>
                        <Text style={styles.scannedItemStatusText}>
                          {item.synced ? '✓ Synced' : '⏳ Pending'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => removeScannedItem(index)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
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
                  logger.log('Submit Order button pressed');
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
                      { backgroundColor: 'transparent', borderColor: theme.border },
                      selectedAction === 'in' && { backgroundColor: 'transparent', borderColor: theme.primary }
                    ]}
                    onPress={() => setSelectedAction('in')}
                  >
                    <Text style={[
                      styles.manualActionButtonText,
                      { color: theme.text },
                      selectedAction === 'in' && { color: theme.primary }
                    ]}>
                      🔄 RETURN
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.manualActionButton,
                      { backgroundColor: 'transparent', borderColor: theme.border },
                      selectedAction === 'out' && { backgroundColor: 'transparent', borderColor: theme.primary }
                    ]}
                    onPress={() => setSelectedAction('out')}
                  >
                    <Text style={[
                      styles.manualActionButtonText,
                      { color: theme.text },
                      selectedAction === 'out' && { color: theme.primary }
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
          <ActivityIndicator size="large" color="#40B5AD" />
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shipButton: {
    backgroundColor: 'transparent',
    borderColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: 'transparent',
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
    width: 320,
    height: 150,
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
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: '95%',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  scanFeedbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
    backgroundColor: '#40B5AD',
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
  scannedItemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
    backgroundColor: '#E8F7F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#40B5AD',
  },
  customizationIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#40B5AD',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#40B5AD',
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
    backgroundColor: 'transparent',
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
    color: '#40B5AD',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#40B5AD',
  },
  cameraActionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cameraActionButtonSelected: {
    backgroundColor: 'transparent',
    borderColor: '#40B5AD',
    borderWidth: 3,
  },
  cameraShipButton: {
    backgroundColor: 'transparent',
    borderColor: '#40B5AD',
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
    color: '#40B5AD',
    fontWeight: '900',
  },
  cameraActionButtonCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cameraActionButtonCountSelected: {
    color: '#40B5AD',
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
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
});
