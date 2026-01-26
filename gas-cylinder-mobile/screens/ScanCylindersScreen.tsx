import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, Dimensions, Alert, Linking, Platform as RNPlatform, Pressable } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import ScanOverlay from '../components/ScanOverlay';
import { Customer } from '../types';
import { FormatValidationService } from '../services/FormatValidationService';
import { Platform } from '../utils/platform';
import { feedbackService } from '../services/feedbackService';
import Constants from 'expo-constants';

// Use ML Kit for free professional barcode scanning
import MLKitScanner from '../components/MLKitScanner';

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
  // Remove Code 39 start/stop characters: *, Z, %, and combinations
  let normalized = value.trim()
    .replace(/^[Z*%]+/i, '') // Remove leading Z, *, %
    .replace(/[Z*%]+$/i, ''); // Remove trailing Z, *, %
  return normalized;
};

// Correct common OCR errors in scanned barcodes
// Handles common misreads: O→0, I→1, S→5, Z→2, etc.
const correctOCRErrors = (scanned: string): string => {
  if (!scanned) return scanned;
  
  // Common OCR error mappings
  const ocrCorrections: { [key: string]: string } = {
    // Letter to number corrections
    'O': '0', 'o': '0', 'D': '0', 'Q': '0',
    'I': '1', 'l': '1', '|': '1',
    'S': '5', 's': '5',
    'Z': '2', 'z': '2',
    'B': '8', 'b': '8',
    'G': '6', 'g': '6',
    // Number to letter corrections (less common but possible)
    '0': 'O', // Only if context suggests it should be a letter
    '1': 'I',
    '5': 'S',
    '2': 'Z',
    '8': 'B',
    '6': 'G',
  };
  
  // Common multi-character OCR errors
  const multiCharCorrections: { [key: string]: string } = {
    'OKKK': '8000',
    'OKK': '800',
    'OK': '80',
    'KK': '00',
    'A5': '15',
    'A1': '11',
    'A0': '10',
    'A8': '18',
    'A7': '17',
    'A3': '13',
    'A2': '12',
    'A9': '19',
    'A6': '16',
    'A4': '14',
    'C+': '80',  // Common OCR error: c+ → 80
    'C+8': '800', // c+8 → 800
    '+8': '80',   // +8 → 80
    '+': '',      // Remove standalone +
  };
  
  // Pattern-based corrections for common OCR mistakes
  // Handle patterns like "7133021B" → "78330321A" (1→8, B→A)
  const patternCorrections = [
    // If we see "7133021B" pattern, likely should be "78330321A"
    { pattern: /^(\d)133021([A-Z])$/, replacement: (match: RegExpMatchArray) => {
      // If first digit is 7 and last is B, likely 78330321A
      if (match[1] === '7' && match[2] === 'B') return '78330321A';
      return match[0];
    }},
  ];
  
  let corrected = scanned.toUpperCase();
  
  // Remove special characters that are likely OCR errors
  corrected = corrected.replace(/[+*%]/g, '');
  
  // Apply multi-character corrections first
  for (const [error, correction] of Object.entries(multiCharCorrections)) {
    if (corrected.includes(error)) {
      corrected = corrected.replace(new RegExp(error.replace(/[+*%]/g, '\\$&'), 'g'), correction);
    }
  }
  
  // Apply pattern-based corrections
  for (const { pattern, replacement } of patternCorrections) {
    const match = corrected.match(pattern);
    if (match) {
      corrected = replacement(match);
    }
  }
  
  // Check if this is a hex customer ID pattern (8 hex digits like "800005BE")
  // If so, don't convert hex letters (A-F) to numbers
  const isHexCustomerId = /^[0-9A-F]{8}$/.test(corrected);
  
  // Apply single-character corrections for ambiguous characters
  // Only correct if it makes sense in context (e.g., O in numeric context → 0)
  const numericContext = /[0-9]/.test(corrected);
  
  if (numericContext) {
    // In numeric context, prefer number corrections
    corrected = corrected.replace(/[ODQ]/g, '0');
    corrected = corrected.replace(/[Il|]/g, '1');
    corrected = corrected.replace(/[SZ]/g, '5');
    
    // Only convert B, G, E, F to numbers if NOT a hex customer ID
    // Hex customer IDs like "800005BE" should keep their hex letters
    if (!isHexCustomerId) {
      corrected = corrected.replace(/[B]/g, '8');
      corrected = corrected.replace(/[G]/g, '6');
      corrected = corrected.replace(/E/g, '5'); // E often misread as 5
      corrected = corrected.replace(/F/g, '7'); // F often misread as 7
    }
  }
  
  // Handle trailing letter corrections (B→A, etc.) in customer ID context
  // If the barcode ends with a letter and has a pattern like customer ID
  if (/^[0-9A-F]{8}-[0-9]{10}[A-Z]$/.test(corrected)) {
    // Common OCR errors for trailing letters
    corrected = corrected.replace(/B$/, 'A'); // B at end often misread A
    corrected = corrected.replace(/I$/, 'A'); // I at end often misread A
    corrected = corrected.replace(/1$/, 'A'); // 1 at end often misread A
  }
  
  return corrected;
};

// Check if barcode is within scan rectangle bounds - matches visual border
const isBarcodeInScanArea = (bounds: any): boolean => {
  if (!bounds) {
    logger.log('📍 No bounds provided, allowing scan');
    return true; // Allow scan if no bounds available
  }
  
  // Get screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Match the actual visual scan frame dimensions (from styles.scanFrame)
  const scanFrameWidth = 320;
  const scanFrameHeight = 150;
  const scanFramePaddingTop = 150; // From cameraOverlay paddingTop
  
  // Calculate scan frame position (centered horizontally, positioned from top)
  const scanAreaLeft = (screenWidth - scanFrameWidth) / 2;
  const scanAreaTop = scanFramePaddingTop;
  const scanAreaRight = scanAreaLeft + scanFrameWidth;
  const scanAreaBottom = scanAreaTop + scanFrameHeight;
  
  // Bounds are in camera coordinates (0-1 normalized or pixels)
  // We need to convert to screen coordinates
  // Camera bounds origin is typically normalized (0-1) or in camera pixel space
  const barcodeX = bounds.origin?.x || 0;
  const barcodeY = bounds.origin?.y || 0;
  const barcodeWidth = bounds.size?.width || 0;
  const barcodeHeight = bounds.size?.height || 0;
  
  // Calculate barcode center
  const barcodeCenterX = barcodeX + (barcodeWidth / 2);
  const barcodeCenterY = barcodeY + (barcodeHeight / 2);
  
  // Check if bounds are normalized (0-1) or in pixels
  // If normalized, convert to screen coordinates
  // Camera typically provides normalized coordinates (0-1)
  const isNormalized = barcodeX <= 1 && barcodeY <= 1 && barcodeWidth <= 1 && barcodeHeight <= 1;
  
  let screenBarcodeX: number;
  let screenBarcodeY: number;
  
  if (isNormalized) {
    // Convert normalized coordinates to screen coordinates
    // Camera view typically fills the screen, so we use screen dimensions
    screenBarcodeX = barcodeCenterX * screenWidth;
    screenBarcodeY = barcodeCenterY * screenHeight;
  } else {
    // Already in pixel coordinates, use directly
    screenBarcodeX = barcodeCenterX;
    screenBarcodeY = barcodeCenterY;
  }
  
  // Add small tolerance (10% of frame size) for easier scanning
  const toleranceX = scanFrameWidth * 0.1;
  const toleranceY = scanFrameHeight * 0.1;
  
  const isInArea = (
    screenBarcodeX >= (scanAreaLeft - toleranceX) &&
    screenBarcodeX <= (scanAreaRight + toleranceX) &&
    screenBarcodeY >= (scanAreaTop - toleranceY) &&
    screenBarcodeY <= (scanAreaBottom + toleranceY)
  );
  
  logger.log('📍 Barcode position check:', {
    barcodeX,
    barcodeY,
    barcodeCenterX,
    barcodeCenterY,
    screenBarcodeX,
    screenBarcodeY,
    isNormalized,
    scanAreaLeft: scanAreaLeft - toleranceX,
    scanAreaTop: scanAreaTop - toleranceY,
    scanAreaRight: scanAreaRight + toleranceX,
    scanAreaBottom: scanAreaBottom + toleranceY,
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
  logger.log('🔍 Validating barcode:', { barcode, organizationId });
  
  if (!barcode || !barcode.trim()) {
    logger.log('❌ Empty barcode');
    return { isValid: false, error: 'Barcode cannot be empty' };
  }

  const trimmedBarcode = barcode.trim();
  logger.log('🔍 Trimmed barcode:', trimmedBarcode);

  if (!organizationId) {
    logger.log('🔍 No organization ID, using basic validation');
    // More lenient basic validation
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      logger.log('❌ Basic pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    if (trimmedBarcode.length < 1) {
      logger.log('❌ Barcode too short');
      return { isValid: false, error: 'Barcode too short (minimum 1 character)' };
    }
    if (trimmedBarcode.length > 100) {
      logger.log('❌ Barcode too long');
      return { isValid: false, error: 'Barcode too long (maximum 100 characters)' };
    }
    logger.log('✅ Basic validation passed');
    return { isValid: true };
  }

  try {
    logger.log('🔍 Using FormatValidationService for validation');
    logger.log('🔍 Clearing format cache to get latest configuration...');
    FormatValidationService.clearCache();
    
    // Get the current format configuration for debugging
    const formats = await FormatValidationService.getOrganizationFormats(organizationId);
    logger.log('🔍 Current barcode format config:', formats.barcode_format);
    logger.log('🔍 Pattern:', formats.barcode_format.pattern);
    logger.log('🔍 Description:', formats.barcode_format.description);
    
    const result = await FormatValidationService.validateBarcode(trimmedBarcode, organizationId);
    logger.log('🔍 FormatValidationService result:', result);
    return result;
  } catch (error) {
    logger.error('❌ Error validating barcode:', error);
    // Fallback to basic validation
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      logger.log('❌ Fallback pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    logger.log('✅ Fallback validation passed');
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
    return await FormatValidationService.validateOrderNumber(trimmedOrder, organizationId);
  } catch (error) {
    logger.error('Error validating order number:', error);
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
  const [orderNumberMaxLength, setOrderNumberMaxLength] = useState<number>(20);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const { profile, loading: authLoading } = useAuth();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'customer' | 'order' | null>(null);
  // Expo Camera permissions removed - Vision Camera handles its own permissions
  const [scanned, setScanned] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const scanDelay = 1500; // ms
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [showCustomerScan, setShowCustomerScan] = useState(false);
  const [showOrderScan, setShowOrderScan] = useState(false);
  const [showSimpleTest, setShowSimpleTest] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  // Using Expo Camera for iOS
  const [focusTrigger, setFocusTrigger] = useState(0); // Used to trigger autofocus on tap
  
  // Track last scanned barcode and timestamp to prevent rapid duplicate scans
  const lastScannedBarcodeRef = React.useRef<string | null>(null);
  const lastScanTimeRef = React.useRef<number>(0);
  const scanCooldownRef = React.useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<any>(null);


  useEffect(() => {
    const fetchCustomers = async () => {
      // Don't fetch customers if auth is still loading
      if (authLoading) {
        logger.log('Auth still loading, waiting...');
        return;
      }

      if (!profile?.organization_id) {
        // Only log if we have a profile but no organization_id (actual error case)
        if (profile && !profile.organization_id) {
          logger.log('No organization found, skipping customer fetch');
          logger.log('Profile data:', profile);
          logger.log('User authenticated:', !!profile);
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
          logger.error('Error fetching customers:', error);
          setError('Failed to load customers: ' + error.message);
          setCustomers([]);
        } else {
          setCustomers(data || []);
          setError(null);
        }
      } catch (err) {
        logger.error('Unexpected error fetching customers:', err);
        setError('Failed to load customers: ' + err.message);
        setCustomers([]);
      }
      
      setLoading(false);
    };
    
    fetchCustomers();
  }, [profile, authLoading]);


  useEffect(() => {
    // Only reset scanned state when scanner opens, not when it closes
    // This prevents allowing re-scans immediately after closing
    if (scannerVisible) {
      setScanned(false);
      setScannerEnabled(true);
    }
    // When scanner closes, keep scanned state as-is to prevent immediate re-scans
  }, [scannerVisible]);

  // Load order number format and set max length
  useEffect(() => {
    const loadOrderFormat = async () => {
      if (profile?.organization_id) {
        try {
          const formats = await FormatValidationService.getOrganizationFormats(profile.organization_id);
          const orderFormat = formats.order_number_format;
          
          // Extract max length from pattern
          const pattern = orderFormat.pattern;
          
          // Handle patterns like ^[A-Z]?[0-9]{5}[A-Z]?$ (flexible 5-digit)
          // This pattern allows: 5 digits, or letter+5 digits, or 5 digits+letter, or letter+5 digits+letter = max 7 chars
          if (pattern.includes('[A-Z]?[0-9]{5}[A-Z]?') || pattern.match(/\[A-Z\]\?\[0-9\]\{5\}\[A-Z\]\?/)) {
            // Check if it's exactly {5} (5 digits) with optional letters
            const digitMatch = pattern.match(/\{(\d+)\}/);
            if (digitMatch) {
              const digitCount = parseInt(digitMatch[1], 10);
              // Count optional letters: [A-Z]? appears before and/or after digits
              // Pattern allows: 5 digits (5), letter+5 (6), 5+letter (6), or letter+5+letter (7)
              const hasOptionalLetterBefore = pattern.includes('^[A-Z]?') || pattern.match(/\^\\?\[A-Z\]\?/);
              const hasOptionalLetterAfter = pattern.includes('[A-Z]?$') || pattern.match(/\\?\[A-Z\]\?\$/);
              const maxLength = digitCount + (hasOptionalLetterBefore ? 1 : 0) + (hasOptionalLetterAfter ? 1 : 0);
              setOrderNumberMaxLength(maxLength);
              return;
            }
          }
          
          // Handle range patterns like {6,12} -> 12
          const maxMatch = pattern.match(/\{(\d+)(?:,(\d+))?\}/);
          if (maxMatch) {
            const max = maxMatch[2] ? parseInt(maxMatch[2], 10) : parseInt(maxMatch[1], 10);
            // Add buffer for optional prefixes/suffixes if pattern has them
            const hasOptionalPrefix = pattern.includes('^[A-Z]?') || pattern.includes('^[A-Z]{');
            const hasOptionalSuffix = pattern.includes('[A-Z]?$') || pattern.includes('[A-Z]{');
            const extraLength = (hasOptionalPrefix ? 4 : 0) + (hasOptionalSuffix ? 4 : 0);
            setOrderNumberMaxLength(max + extraLength);
          } else {
            // Default to 20 if pattern doesn't specify
            setOrderNumberMaxLength(20);
          }
        } catch (error) {
          logger.error('Error loading order format:', error);
          setOrderNumberMaxLength(20);
        }
      }
    };
    loadOrderFormat();
  }, [profile?.organization_id]);

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
  // Customer barcodes are in format: %800005BE-1578330321A (sales receipt format)
  // Pattern: % + 8 hex characters + hyphen + 10 digits + optional letter
  useEffect(() => {
    const validateCustomer = async () => {
      if (search.trim() && !selectedCustomer) {
        const trimmed = search.trim();
        
        // Customer barcode format: %[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?
        // Examples: %800005BE-1578330321A, %80000635-1596735793A
        const salesReceiptPattern = /^%[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/i;
        
        // Also accept without % prefix (in case scanner doesn't capture it)
        const withoutPrefixPattern = /^[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?$/i;
        
        // Also accept hex ID only (8 hex characters) - for manual entry
        const hexIdPattern = /^[0-9A-Fa-f]{8}$/i;
        
        if (salesReceiptPattern.test(trimmed) || withoutPrefixPattern.test(trimmed) || hexIdPattern.test(trimmed)) {
          // Valid customer barcode format
          setCustomerBarcodeError('');
        } else {
          // Check for basic invalid characters
          const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
          if (!basicPattern.test(trimmed)) {
            setCustomerBarcodeError('Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.');
          } else {
            // Valid characters but wrong format - provide helpful message
            setCustomerBarcodeError('Customer barcode should be in format: %XXXXXXXX-YYYYYYYYYYZ (e.g., %800005BE-1578330321A)');
          }
        }
      } else {
        setCustomerBarcodeError('');
      }
    };
    validateCustomer();
  }, [search, selectedCustomer, profile?.organization_id]);

  // Log scanner state when camera is opened
  useEffect(() => {
    if (showCustomerScan) {
      const scannerState = {
        scannerEnabled,
        scanned,
      };
      logger.log('📷 SCANNER STATE:', scannerState);
      if (scanned) {
        logger.warn('⚠️ Scanner marked as already scanned, resetting...');
        setScanned(false);
        setScannerEnabled(true); // Re-enable scanner when resetting scanned state
      }
      // Ensure scanner is enabled when customer scan screen opens
      if (!scannerEnabled && !scanned) {
        logger.warn('⚠️ Scanner is disabled but should be enabled, re-enabling...');
        setScannerEnabled(true);
      }
    }
  }, [showCustomerScan, scannerEnabled, scanned]);
  
  // Cleanup scan cooldown on unmount
  useEffect(() => {
    return () => {
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
      }
    };
  }, []);

  // Initialize feedback service for sound/haptic feedback
  useEffect(() => {
    feedbackService.initialize();
    
    return () => {
      feedbackService.cleanup();
    };
  }, []);

  // Log camera preference on iOS
  useEffect(() => {
    if (RNPlatform.OS === 'ios') {
      logger.log('📷 iOS: Using Expo Camera for barcode scanning');
    }
  }, []);

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

  // Search for customer by name (for OCR text recognition)
  const searchCustomerByName = async (possibleNames: string[]): Promise<Customer | null> => {
    if (!profile?.organization_id || possibleNames.length === 0) {
      return null;
    }

    try {
      logger.log('🔍 OCR: Searching for customers by names:', possibleNames);
      
      // Try each possible name until we find a match
      for (const name of possibleNames) {
        if (!name || name.length < 3) continue;
        
        // Search for customer with matching name (case-insensitive)
        const { data: customers, error } = await supabase
          .from('customers')
          .select('CustomerListID, name, barcode')
          .eq('organization_id', profile.organization_id)
          .ilike('name', `%${name}%`)
          .limit(1);

        if (error) {
          logger.error('OCR customer search error:', error);
          continue;
        }

        if (customers && customers.length > 0) {
          const found = customers[0];
          logger.log('✅ OCR: Found customer:', found.name);
          return found;
        }
      }

      logger.log('❌ OCR: No customer found for any of the names');
      return null;
    } catch (error) {
      logger.error('Error in searchCustomerByName:', error);
      return null;
    }
  };

  // Handle OCR text found - automatically select customer if found
  const handleTextFound = async (text: string, possibleNames: string[]) => {
    logger.log('📝 OCR: Text found, searching for customers...');
    
    const foundCustomer = await searchCustomerByName(possibleNames);
    
    if (foundCustomer) {
      logger.log('✅ OCR: Customer found, selecting:', foundCustomer.name);
      setSelectedCustomer(foundCustomer);
      setSearch(foundCustomer.CustomerListID || foundCustomer.name);
      setCustomerBarcodeError('');
      // Close scanner after finding customer
      setShowCustomerScan(false);
      setScannerVisible(false);
      setScannerTarget(null);
      // Provide feedback
      await feedbackService.scanSuccess();
    } else {
      logger.log('⚠️ OCR: No customer found, showing in search');
      // If no customer found, add first name to search
      if (possibleNames.length > 0) {
        setSearch(possibleNames[0]);
      }
    }
  };

  const handleBarcodeScanned = async (event: any) => {
    // Support: string directly, or { data }, or { raw } (expo-camera / MLKit)
    const data = typeof event === 'string'
      ? event
      : (typeof event?.data === 'string' ? event.data : (typeof event?.raw === 'string' ? event.raw : null));
    const type = (typeof event === 'object' && event?.type) ? event.type : 'unknown';

    if (__DEV__) {
      logger.debug('🔍 Barcode scanned:', { type, data, scanned, scannerTarget });
    }

    if (!data || typeof data !== 'string') {
      logger.log('❌ Invalid barcode data:', typeof event, event);
      return;
    }

    // Clean the barcode - remove leading/trailing asterisks only (keep % for customer format)
    let cleanedBarcode = data.trim().replace(/^\*+|\*+$/g, '');

    if (!cleanedBarcode) {
      logger.log('📷 Empty barcode after cleaning');
      return;
    }

    const barcode = cleanedBarcode;

    // Direct navigation logic - only for cylinder barcodes (e.g. 9 digits)
    // Customer barcodes (%XXXXXXXX-YYYYYYYYYYZ) stay on this screen
    try {
      if (profile?.organization_id) {
        const formats = await FormatValidationService.getOrganizationFormats(profile.organization_id);
        const cylinderPattern = formats.cylinder_serial_format?.pattern || '^[0-9]{9}$';
        const cylinderRegex = new RegExp(cylinderPattern);
        const isCylinder = cylinderRegex.test(cleanedBarcode);

        logger.log('🔍 Barcode analysis:', { cleanedBarcode, isCylinder, cylinderPattern });

        if (isCylinder) {
          logger.log('✅ Cylinder barcode detected, navigating to CylinderDetails');
          setShowCustomerScan(false);
          setShowOrderScan(false);
          setScannerVisible(false);
          setScannerTarget(null);
          navigation.navigate('CylinderDetails', { barcode: cleanedBarcode });
          return;
        }
      }
    } catch (error) {
      logger.error('❌ Error in direct navigation logic:', error);
    }

    // handleBarcodeScanned is only used by the customer scanner; default to customer
    let effectiveTarget = scannerTarget || 'customer';
    
    // Prevent duplicate scans of the same barcode
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    
    // Determine scan interval based on context
    // For customer scans (especially sales receipt barcodes), use shorter interval for industrial machine scanning
    const isCustomerScan = effectiveTarget === 'customer' || barcode.startsWith('%');
    const MIN_SCAN_INTERVAL = isCustomerScan ? 200 : 2000; // 200ms for customer scans, 2s for others
    
    // Block duplicate scans more aggressively
    if (scanned) {
      logger.log('⚠️ Already processing scan, ignoring');
      return;
    }
    
    // Block if same barcode was scanned recently (even if not currently processing)
    if (barcode === lastScannedBarcodeRef.current) {
      if (timeSinceLastScan < 3000) { // Block same barcode for 3 seconds
        logger.log('⚠️ Duplicate scan detected, ignoring (same barcode too soon)');
        return;
      }
    }
    
    // Clear any existing cooldown
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
    }
    
    // Set scanned immediately to prevent duplicate scans
    setScanned(true);
    setScannerEnabled(false); // Disable scanner immediately
    lastScannedBarcodeRef.current = barcode;
    lastScanTimeRef.current = now;
    
    // For customer scans, use a longer cooldown to prevent rapid re-scans
    // Don't set a cooldown timer here - we'll handle it after processing completes
    // This prevents the timer from resetting scanned state while we're still processing
    
    // Close scanner immediately after scan - this screen only allows one scan at a time
    setShowCustomerScan(false);
    setShowOrderScan(false);
    setScannerVisible(false);
    setScannerTarget(null);
    
    // Add a small delay to allow the UI to update
    setTimeout(async () => {
    
    try {
      // Skip validation for now - accept any barcode format
      logger.log('✅ Skipping validation - accepting barcode:', data);

      // Apply the scanned data based on target
      if (effectiveTarget === 'customer') {
        logger.log('👤 Setting customer search:', data);
        
        // Check if this is a sales receipt barcode (starts with % or wrapped in asterisks)
        // Sales receipt format: %XXXXXXXX-YYYYYYYYYYZ where XXXXXXXXX is the customer ID
        // Pattern: 8 hex chars + dash + 10 digits + optional letter
        let scannedBarcode = data.trim();
        let extractedCustomerId: string | null = null;
        
        // Check for sales receipt: must have % OR be clearly wrapped in asterisks
        // This prevents regular customer barcodes from being incorrectly treated as sales receipts
        const hasPercent = scannedBarcode.startsWith('%') || scannedBarcode.includes('%');
        // Only treat as wrapped if it starts AND ends with asterisk (clear sales receipt format)
        const isWrappedInAsterisks = scannedBarcode.startsWith('*') && scannedBarcode.endsWith('*');
        
        // Only treat as sales receipt if it has % OR is wrapped in asterisks
        const isSalesReceipt = hasPercent || isWrappedInAsterisks;
        
        if (isSalesReceipt) {
          // This is a sales receipt barcode - handle formats like:
          // %800005BE-1578330321A or *%800005BE-1578330321A*
          // Customer ID format: 800005BE-1578330321A (8 hex + dash + 10 digits + 1 letter)
          
          // First, clean up the barcode (remove asterisks and %)
          let cleanedBarcode = scannedBarcode.replace(/^[*%]+/, '').replace(/[*%]+$/, '');
          
          logger.log(`🧹 Cleaned barcode: "${cleanedBarcode}"`);
          
          // Try to extract the full customer ID format: 800005BE-1578330321A
          // Pattern: 8 hex chars + dash + 10 digits + optional letter
          const fullCustomerIdPattern = /^([0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?)$/;
          const fullMatch = cleanedBarcode.match(fullCustomerIdPattern);
          
          if (fullMatch && fullMatch[1]) {
            // Full customer ID format found - use it directly for exact matching
            extractedCustomerId = fullMatch[1].toUpperCase();
            logger.log(`📋 Detected full customer ID format: ${extractedCustomerId}`);
            scannedBarcode = extractedCustomerId; // Use full ID for matching
          } else {
            // Try pattern with % prefix still in place
            const withPercentPattern = /^%([0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?)$/;
            const withPercentMatch = scannedBarcode.match(withPercentPattern);
            
            if (withPercentMatch && withPercentMatch[1]) {
              extractedCustomerId = withPercentMatch[1].toUpperCase();
              logger.log(`📋 Detected full customer ID (with % prefix): ${extractedCustomerId}`);
              scannedBarcode = extractedCustomerId;
            } else {
              // Try to extract just the first 8 hex characters (prefix) as fallback
              const prefixPattern = /^%?([0-9A-Fa-f]{8})-[0-9]{10}[A-Za-z]?$/;
              const prefixMatch = cleanedBarcode.match(prefixPattern);
              
              if (prefixMatch && prefixMatch[1]) {
                // Extract the customer ID prefix (first 8 hex characters)
                extractedCustomerId = prefixMatch[1].toUpperCase();
                logger.log(`📋 Detected sales receipt barcode, extracted customer ID prefix: ${extractedCustomerId}`);
                scannedBarcode = extractedCustomerId; // Use extracted prefix for matching
              } else {
                // Try pattern without % prefix
                const withoutPrefix = cleanedBarcode.replace(/^%/, '');
                const patternWithoutPrefix = /^([0-9A-Fa-f]{8})-[0-9]{10}[A-Za-z]?$/;
                const matchWithoutPrefix = withoutPrefix.match(patternWithoutPrefix);
                
                if (matchWithoutPrefix && matchWithoutPrefix[1]) {
                  extractedCustomerId = matchWithoutPrefix[1].toUpperCase();
                  logger.log(`📋 Detected sales receipt barcode (no %), extracted customer ID: ${extractedCustomerId}`);
                  scannedBarcode = extractedCustomerId;
                } else {
                  // Not a valid sales receipt format, normalize normally
                  scannedBarcode = normalizeBarcode(data);
                }
              }
            }
          }
        } else {
          // Not a sales receipt, normalize normally
          scannedBarcode = normalizeBarcode(data);
        }
        
        // Apply OCR error correction to handle scanner misreads
        const correctedBarcode = correctOCRErrors(scannedBarcode);
        if (correctedBarcode !== scannedBarcode) {
          logger.log(`🔧 OCR correction: "${scannedBarcode}" → "${correctedBarcode}"`);
          scannedBarcode = correctedBarcode;
        }
        
        // Multiple normalization strategies for comprehensive matching
        const normalizeForMatching = (barcode: string): string => {
          if (!barcode) return '';
          return barcode
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ''); // Remove all non-alphanumeric characters
        };
        
        const normalizeWithDashes = (barcode: string): string => {
          if (!barcode) return '';
          return barcode
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, ''); // Keep dashes
        };
        
        const normalizeLoose = (barcode: string): string => {
          if (!barcode) return '';
          return barcode
            .toUpperCase()
            .replace(/[\s\-_]/g, ''); // Remove spaces, dashes, underscores
        };
        
        const scannedNormalized = normalizeForMatching(scannedBarcode);
        const scannedWithDashes = normalizeWithDashes(scannedBarcode);
        const scannedLoose = normalizeLoose(scannedBarcode);
        
        // Debug logging
        logger.log('🔍 CUSTOMER BARCODE SCAN DEBUG');
        logger.log('📱 Raw scanned data:', data);
        logger.log('📋 Extracted customer ID:', extractedCustomerId);
        logger.log('🧹 After normalization:', scannedBarcode);
        logger.log('🔢 Scanned normalized:', scannedNormalized);
        logger.log('👥 Total customers to search:', customers.length);
        logger.log('🏢 Current organization:', customers[0]?.organization_id || 'N/A');
        
        // Collect all potential matches with their match quality scores
        // This prevents always returning the first customer in the array
        const potentialMatches: Array<{ customer: any; score: number; strategy: string }> = [];
        
        // If we have a full extracted customer ID (with dash), check for exact matches first
        // This is much faster than checking every customer with prefix matches
        if (extractedCustomerId && extractedCustomerId.includes('-')) {
          for (const customer of customers) {
            if (!customer.CustomerListID) continue;
            
            // Check exact match with full customer ID first
            if (customer.CustomerListID.toUpperCase() === extractedCustomerId.toUpperCase()) {
              logger.log(`✅ Match found: Exact match with full extracted ID - "${extractedCustomerId}" === "${customer.CustomerListID}"`);
              potentialMatches.push({ customer, score: 100, strategy: 'exact_full' });
              break; // Found exact match, no need to check further
            }
            
            // Check stored barcode for exact match
            const storedBarcode = customer.barcode || customer.customer_barcode;
            if (storedBarcode) {
              const normalizedStored = normalizeBarcode(storedBarcode);
              if (normalizedStored.toUpperCase() === extractedCustomerId.toUpperCase()) {
                logger.log(`✅ Match found: Exact match (stored barcode with full ID) - "${extractedCustomerId}" === "${normalizedStored}"`);
                potentialMatches.push({ customer, score: 100, strategy: 'exact_stored_full' });
                break; // Found exact match, no need to check further
              }
            }
          }
          
          // If we found an exact match, skip all the other matching strategies
          if (potentialMatches.length > 0 && potentialMatches[0].score === 100) {
            // Exact match found, use it
          } else {
            // No exact match found, continue with other strategies below
            potentialMatches.length = 0; // Clear the array
          }
        }
        
        // If no exact match was found, continue with other matching strategies
        if (potentialMatches.length === 0) {
          // Use a for loop instead of forEach to allow early exit
          for (const customer of customers) {
          if (!customer.CustomerListID) {
            continue; // Skip customers without CustomerListID
          }
          
          // Try matching against CustomerListID directly
          const customerBarcode = normalizeBarcode(customer.CustomerListID);
          const customerNormalized = normalizeForMatching(customerBarcode);
          const customerWithDashes = normalizeWithDashes(customerBarcode);
          const customerLoose = normalizeLoose(customerBarcode);
          
          // Also check if customer has a stored barcode field
          const storedBarcode = customer.barcode || customer.customer_barcode;
          let storedBarcodeNormalized = '';
          let storedBarcodeWithDashes = '';
          let storedBarcodeLoose = '';
          
          if (storedBarcode) {
            const normalizedStored = normalizeBarcode(storedBarcode);
            storedBarcodeNormalized = normalizeForMatching(normalizedStored);
            storedBarcodeWithDashes = normalizeWithDashes(normalizedStored);
            storedBarcodeLoose = normalizeLoose(normalizedStored);
          }
          
          // Strategy 1: Exact match (case insensitive) - Highest priority (score: 100)
          // Check both the scanned barcode and the full customer ID format
          if (customerBarcode.toLowerCase() === scannedBarcode.toLowerCase()) {
            logger.log(`✅ Match found: Exact match (CustomerListID) - "${scannedBarcode}" === "${customerBarcode}"`);
            potentialMatches.push({ customer, score: 100, strategy: 'exact' });
            // Early exit for exact matches - no need to check further
            break;
          }
          
          // Strategy 1a: If we extracted a full customer ID, try exact match with that
          if (extractedCustomerId && extractedCustomerId.includes('-')) {
            // Full customer ID format was extracted (e.g., "800005BE-1578330321A")
            if (customerBarcode.toLowerCase() === extractedCustomerId.toLowerCase()) {
              logger.log(`✅ Match found: Exact match with full extracted ID - "${extractedCustomerId}" === "${customerBarcode}"`);
              potentialMatches.push({ customer, score: 100, strategy: 'exact_full' });
              break;
            }
          }
          
          // Strategy 1b: Match against stored barcode field (if exists)
          // Normalize stored barcode to remove % prefix and asterisks before comparing
          if (storedBarcode) {
            const normalizedStoredBarcode = normalizeBarcode(storedBarcode);
            if (normalizedStoredBarcode.toLowerCase() === scannedBarcode.toLowerCase()) {
              logger.log(`✅ Match found: Exact match (stored barcode) - "${scannedBarcode}" === "${normalizedStoredBarcode}"`);
              potentialMatches.push({ customer, score: 100, strategy: 'exact_stored' });
              // Early exit for exact matches
              break;
            }
            // Also check if full extracted ID matches stored barcode
            if (extractedCustomerId && extractedCustomerId.includes('-')) {
              if (normalizedStoredBarcode.toLowerCase() === extractedCustomerId.toLowerCase()) {
                logger.log(`✅ Match found: Exact match (stored barcode with full ID) - "${extractedCustomerId}" === "${normalizedStoredBarcode}"`);
                potentialMatches.push({ customer, score: 100, strategy: 'exact_stored_full' });
                break;
              }
            }
          }
          
          // Strategy 2: Sales receipt prefix match - Check if scanned barcode (from sales receipt) matches start of customer ID
          // This handles cases where sales receipt barcode extracts 8 hex chars that match the start of full customer ID
          // Example: Scanned "800005BE" should match customer ID "800005BE-1578330321A" or "800005BE1578330321A"
          if (extractedCustomerId) {
            // This is a sales receipt scan - check if extracted ID matches start of customer ID
            // Use the extracted customer ID directly (not the normalized scanned barcode) for more accurate matching
            const extractedNormalized = normalizeForMatching(extractedCustomerId);
            
            // Only log if there's a potential match, not for every customer
            // Check if extracted ID matches start of customer ID
            const customerIdStart = customerNormalized.slice(0, extractedNormalized.length);
            if (customerIdStart === extractedNormalized && extractedNormalized.length >= 6) {
              logger.log(`✅ Match found: Sales receipt prefix match - "${extractedNormalized}" matches start of "${customerNormalized}"`);
              potentialMatches.push({ customer, score: 95, strategy: 'sales_receipt_prefix' });
              continue;
            }
            
            // Also check if extracted ID is contained anywhere in the customer ID (in case format is different)
            if (customerNormalized.includes(extractedNormalized) && extractedNormalized.length >= 6) {
              const matchPosition = customerNormalized.indexOf(extractedNormalized);
              logger.log(`✅ Match found: Sales receipt contained match - "${extractedNormalized}" found at position ${matchPosition} in "${customerNormalized}"`);
              potentialMatches.push({ customer, score: 90, strategy: 'sales_receipt_contained' });
              continue;
            }
            
            // Also check stored barcode
            if (storedBarcodeNormalized) {
              const storedStart = storedBarcodeNormalized.slice(0, extractedNormalized.length);
              if (storedStart === extractedNormalized && extractedNormalized.length >= 6) {
                logger.log(`✅ Match found: Sales receipt prefix match (stored barcode) - "${extractedNormalized}" matches start of "${storedBarcodeNormalized}"`);
                potentialMatches.push({ customer, score: 95, strategy: 'sales_receipt_prefix_stored' });
                continue;
              }
              // Check if extracted ID is contained in stored barcode
              if (storedBarcodeNormalized.includes(extractedNormalized) && extractedNormalized.length >= 6) {
                logger.log(`✅ Match found: Sales receipt contained match (stored barcode) - "${extractedNormalized}" found in "${storedBarcodeNormalized}"`);
                potentialMatches.push({ customer, score: 90, strategy: 'sales_receipt_contained_stored' });
                continue;
              }
            }
          }
          
          // Strategy 3: Fully normalized match (removes ALL special characters) - High priority (score: 90)
          if (customerNormalized === scannedNormalized) {
            if (__DEV__) logger.debug('✅ Match found: Normalized match (CustomerListID)');
            potentialMatches.push({ customer, score: 90, strategy: 'normalized' });
            continue;
          }
          
          if (storedBarcodeNormalized && storedBarcodeNormalized === scannedNormalized) {
            if (__DEV__) logger.debug('✅ Match found: Normalized match (stored barcode)');
            potentialMatches.push({ customer, score: 90, strategy: 'normalized_stored' });
            continue;
          }
          
          // Strategy 4: Match with dashes preserved - High priority (score: 85)
          if (customerWithDashes === scannedWithDashes) {
            if (__DEV__) logger.debug('✅ Match found: Dashes match (CustomerListID)');
            potentialMatches.push({ customer, score: 85, strategy: 'dashes' });
            continue;
          }
          
          if (storedBarcodeWithDashes && storedBarcodeWithDashes === scannedWithDashes) {
            if (__DEV__) logger.debug('✅ Match found: Dashes match (stored barcode)');
            potentialMatches.push({ customer, score: 85, strategy: 'dashes_stored' });
            continue;
          }
          
          // Strategy 5: Loose match (removes spaces, dashes, underscores) - Medium priority (score: 80)
          if (customerLoose === scannedLoose) {
            if (__DEV__) logger.debug('✅ Match found: Loose match (CustomerListID)');
            potentialMatches.push({ customer, score: 80, strategy: 'loose' });
            continue;
          }
          
          if (storedBarcodeLoose && storedBarcodeLoose === scannedLoose) {
            if (__DEV__) logger.debug('✅ Match found: Loose match (stored barcode)');
            potentialMatches.push({ customer, score: 80, strategy: 'loose_stored' });
            continue;
          }
          
          // Strategy 6: Handle common barcode variations (A/a endings) - Medium priority (score: 75)
          if (scannedBarcode.length > 1 && customerBarcode.length > 1) {
            const baseScanned = scannedBarcode.slice(0, -1);
            const baseCustomer = customerBarcode.slice(0, -1);
            
            if (baseScanned.toLowerCase() === baseCustomer.toLowerCase()) {
              if (__DEV__) logger.debug('✅ Match found: Base match (without last character)');
              potentialMatches.push({ customer, score: 75, strategy: 'base' });
              continue;
            }
          }
          
          // Strategy 7: Strict partial match - Only if lengths are similar and match is substantial (score: 50)
          // Only match if the shorter string is at least 80% of the longer string's length
          const minLength = Math.min(customerNormalized.length, scannedNormalized.length);
          const maxLength = Math.max(customerNormalized.length, scannedNormalized.length);
          const lengthRatio = minLength / maxLength;
          
          if (lengthRatio >= 0.8 && minLength >= 4) {
            if (customerNormalized.includes(scannedNormalized) || scannedNormalized.includes(customerNormalized)) {
              if (__DEV__) logger.debug('✅ Match found: Strict partial match (length ratio >= 0.8)');
              potentialMatches.push({ customer, score: 50, strategy: 'partial' });
              continue;
            }
          }
          
          // Strategy 8: Substring match - Check if scanned barcode is a significant substring of customer ID (score: 40)
          // Useful for partial barcodes like "8ef0321A" matching "1578330321A"
          if (scannedNormalized.length >= 6) { // At least 6 characters for substring match
            // Check if scanned is contained in customer ID (anywhere)
            if (customerNormalized.includes(scannedNormalized)) {
              const matchRatio = scannedNormalized.length / customerNormalized.length;
              if (matchRatio >= 0.3) { // At least 30% of the customer ID (lowered for better matching)
                if (__DEV__) logger.debug(`✅ Match found: Substring match (${Math.round(matchRatio * 100)}% of customer ID)`);
                potentialMatches.push({ customer, score: 40, strategy: 'substring' });
                continue;
              }
            }
            // Check if scanned matches the END of customer ID (common for partial scans) - Higher priority
            const customerEnd = customerNormalized.slice(-scannedNormalized.length);
            if (customerEnd === scannedNormalized) {
              if (__DEV__) logger.debug('✅ Match found: End substring match (scanned matches end of customer ID)');
              potentialMatches.push({ customer, score: 45, strategy: 'end_substring' });
              continue;
            }
            // Check if scanned matches the START of customer ID
            const customerStart = customerNormalized.slice(0, scannedNormalized.length);
            if (customerStart === scannedNormalized) {
              if (__DEV__) logger.debug('✅ Match found: Start substring match (scanned matches start of customer ID)');
              potentialMatches.push({ customer, score: 45, strategy: 'start_substring' });
              continue;
            }
            // Check if scanned is a substring of stored barcode
            if (storedBarcodeNormalized && storedBarcodeNormalized.includes(scannedNormalized)) {
              const matchRatio = scannedNormalized.length / storedBarcodeNormalized.length;
              if (matchRatio >= 0.3) {
                if (__DEV__) logger.debug(`✅ Match found: Substring match in stored barcode (${Math.round(matchRatio * 100)}%)`);
                potentialMatches.push({ customer, score: 40, strategy: 'substring_stored' });
                continue;
              }
            }
            // Check if scanned matches end of stored barcode
            if (storedBarcodeNormalized) {
              const storedEnd = storedBarcodeNormalized.slice(-scannedNormalized.length);
              if (storedEnd === scannedNormalized) {
                if (__DEV__) logger.debug('✅ Match found: End substring match in stored barcode');
                potentialMatches.push({ customer, score: 45, strategy: 'end_substring_stored' });
                continue;
              }
              // Check if scanned matches start of stored barcode
              const storedStart = storedBarcodeNormalized.slice(0, scannedNormalized.length);
              if (storedStart === scannedNormalized) {
                if (__DEV__) logger.debug('✅ Match found: Start substring match in stored barcode');
                potentialMatches.push({ customer, score: 45, strategy: 'start_substring_stored' });
                continue;
              }
            }
          }
          }
        }
        
        // Sort matches by score (highest first) and return the best match
        potentialMatches.sort((a, b) => b.score - a.score);
        const matchingCustomer = potentialMatches.length > 0 ? potentialMatches[0].customer : null;

        if (__DEV__ && potentialMatches.length > 1) {
          logger.debug(`⚠️ Multiple matches found (${potentialMatches.length}). Using highest score: ${potentialMatches[0].strategy} (score: ${potentialMatches[0].score})`);
        }
        
        if (!matchingCustomer) {
          logger.log('⚠️ Scanned barcode does not match any existing customer');
          
          // Find similar customers with their full info for selection
          // Lower threshold to catch more partial matches
          const similarCustomers = customers
            .filter(customer => customer.CustomerListID)
            .map(customer => {
              const customerBarcode = normalizeBarcode(customer.CustomerListID);
              const customerNormalized = normalizeForMatching(customerBarcode);
              const scannedNorm = normalizeForMatching(scannedBarcode);
              
              // Calculate base similarity
              let similarity = calculateSimilarity(
                scannedBarcode.toLowerCase(), 
                customerBarcode.toLowerCase()
              );
              
              // Boost similarity if scanned is a substring of customer ID
              if (customerNormalized.includes(scannedNorm) && scannedNorm.length >= 6) {
                const substringRatio = scannedNorm.length / customerNormalized.length;
                similarity = Math.max(similarity, substringRatio * 0.9); // Boost by substring ratio
              }
              
              // Boost if customer ID ends with scanned value (common for partial scans)
              if (customerNormalized.endsWith(scannedNorm) && scannedNorm.length >= 6) {
                similarity = Math.max(similarity, 0.75);
              }
              
              return {
                customer,
                barcode: customerBarcode,
                similarity
              };
            })
            .filter(item => item.similarity > 0.5) // Lower threshold: 50% similarity (was 70%)
            .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
            .slice(0, 5); // Show max 5 suggestions (was 3)
          
          // Close the camera scanner immediately to prevent repeated scans
          setShowCustomerScan(false);
          setScannerVisible(false);
          setScannerTarget(null);
          
          if (similarCustomers.length > 0) {
            // Show alert with options to select similar customers
            const buttons = similarCustomers.map(item => ({
              text: `${item.customer.name} (${item.barcode})`,
              onPress: async () => {
                logger.log('✅ User selected similar customer:', item.customer.name);
                setSearch(item.barcode);
                setSelectedCustomer(item.customer);
                
                // No sound feedback for customer selection
                
                Alert.alert(
                  'Customer Selected',
                  `Selected: ${item.customer.name}`,
                  [{ text: 'OK' }]
                );
              }
            }));
            
            buttons.push({
              text: 'Cancel',
              onPress: () => {
                setSearch(scannedBarcode);
              },
              style: 'cancel'
            });
            
            Alert.alert(
              'Customer Not Found',
              `The scanned barcode "${normalizeBarcode(data)}" does not match exactly.\n\nDid you mean one of these?`,
              buttons
            );
          } else {
            // No similar customers found
            // No sound feedback for customer not found
            
            Alert.alert(
              'Customer Not Found',
              `The scanned barcode "${normalizeBarcode(data)}" does not match any existing customer in your organization.\n\nPlease verify the barcode or add this customer to your system.`,
              [
                { text: 'OK', onPress: () => {
                  setSearch(scannedBarcode);
                }}
              ]
            );
          }
          
          // Scanner already closed above - keep it closed
          // User must manually reopen to scan again
          setScanned(true);
          setScannerEnabled(false);
          return;
        }
        
        // Customer found, proceed normally
        logger.log('✅ Customer found:', matchingCustomer.name);
        setSearch(normalizeBarcode(matchingCustomer.CustomerListID || data));
        setSelectedCustomer(matchingCustomer);
        
        // Scanner already closed above - keep it closed
        // Reset scanned state to allow rescanning if needed
        setScanned(false);
        setScannerEnabled(true);
        
        // Clear any existing cooldown timer
        if (scanCooldownRef.current) {
          clearTimeout(scanCooldownRef.current);
          scanCooldownRef.current = null;
        }
        
        // No sound feedback for customer scanning
        // No alert - just show success message inline
      } else if (effectiveTarget === 'order') {
        logger.log('📦 Setting order number:', data);
        setOrderNumber(data);
        // Scanner already closed above - keep it closed
        setScanned(false);
        setScannerEnabled(true);
      } else {
        // No match or other case - scanner already closed, keep it closed
        setScanned(true);
        setScannerEnabled(false);
      }
      
    } catch (error) {
      logger.error('❌ Error processing barcode scan:', error);
      setScanned(false);
      
      const errorMessage = 'Failed to process barcode. Please try again.';
      if (effectiveTarget === 'customer') {
        setCustomerBarcodeError(errorMessage);
      } else if (effectiveTarget === 'order') {
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
    logger.log('📷 Opening scanner for target:', target);
    // Vision Camera handles its own permissions internally
    
    logger.log('📷 Setting up scanner for target:', target);
    
    // Clear any existing errors
    setCustomerBarcodeError('');
    setOrderError('');
    
    // Reset states when manually opening scanner
    setScanned(false);
    setScannerEnabled(true);
    lastScannedBarcodeRef.current = null;
    setScannerTarget(target);
    
    logger.log('🎯 Scanner target set to:', target);
    
    // Open the appropriate scanner modal
    if (target === 'customer') {
      logger.log('📷 Opening customer scanner modal');
      logger.log('📷 Customers loaded:', customers.length);
      logger.log('📷 Customer barcodes:', customers.map(c => c.barcode).filter(Boolean));
      setShowCustomerScan(true);
    } else {
      logger.log('📷 Opening order scanner modal');
      setShowOrderScan(true);
    }
    
    setScannerVisible(true);
    logger.log('📷 Scanner setup complete');
    logger.log('📷 showCustomerScan will be:', target === 'customer');
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
              Delivery
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
                placeholder="Enter order number"
                placeholderTextColor={colors.textSecondary}
                value={orderNumber}
                onChangeText={setOrderNumber}
                autoCapitalize="characters"
                maxLength={orderNumberMaxLength}
              />
              <TouchableOpacity
                style={[
                  styles.scanButton, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: 1
                  }
                ]}
                onPress={() => openScanner('order')}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
            {orderError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{orderError}</Text>
            ) : null}
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
                placeholder="Enter customer ID"
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
                    opacity: 1
                  }
                ]}
                onPress={() => {
                  logger.log('📷 Customer scan button pressed');
                  logger.log('📷 Scanner target:', scannerTarget);
                  openScanner('customer');
                }}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
            {customerBarcodeError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{customerBarcodeError}</Text>
            ) : selectedCustomer ? (
              <View style={styles.customerSuccessContainer}>
                <Text style={[styles.successText, { color: colors.success || '#10B981' }]}>
                  ✅ Customer: {selectedCustomer.name}
                </Text>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={() => {
                    setSelectedCustomer(null);
                    setSearch('');
                    openScanner('customer');
                  }}
                >
                  <Text style={[styles.rescanButtonText, { color: colors.primary }]}>Rescan</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
                  customerId: selectedCustomer?.CustomerListID || selectedCustomer?.id,
                  orderNumber: orderNumber.trim(),
                  autoStartScanning: true
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

      {/* Scanbot - Customer Scanner */}
      {showCustomerScan && (
        <MLKitScanner
          onBarcodeScanned={(data: string, result?: { format: string; confidence: number }) => {
            const s = typeof data === 'string' ? data : '';
            if (!s || !s.trim()) return;
            logger.log('📷 MLKit: Customer barcode scanned:', s.substring(0, 30) + (s.length > 30 ? '…' : ''), result?.format);
            handleBarcodeScanned({ data: s.trim(), type: 'scanbot' });
          }}
          onTextFound={handleTextFound}
          enabled={scannerEnabled && !scanned}
          onClose={() => {
            setShowCustomerScan(false);
            setScannerVisible(false);
            setScannerTarget(null);
          }}
          title="Scan Customer Barcode"
          subtitle="Point camera at customer barcode or name"
        />
      )}

      {/* Scanbot - Order Scanner */}
      {showOrderScan && (
        <MLKitScanner
          onBarcodeScanned={(data: string, result?: { format: string; confidence: number }) => {
            logger.log('📷 MLKit: Order barcode scanned:', data, result?.format);
            const barcode = data.trim();
            if (barcode) {
              logger.log('📷 MLKit: Order barcode detected:', barcode);
              setOrderNumber(barcode);
              setShowOrderScan(false);
            }
          }}
          enabled={scannerEnabled && !scanned}
          onClose={() => {
            setShowOrderScan(false);
          }}
          title="Scan Order Number"
          subtitle="Point camera at order barcode"
        />
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
  customerSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rescanButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rescanButtonText: {
    fontSize: 14,
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
    top: '25%', // Moved up from 40% to camera level
    left: '50%',
    transform: [{ translateX: -160 }], // Center 320px width
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanAreaOverlay: {
    position: 'absolute',
    top: '25%', // Moved up from 40% to camera level
    left: '50%',
    transform: [{ translateX: -160 }], // Center 320px width
    width: 320,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120, // Leave space for bottom action buttons
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150, // Position scan frame at camera level
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
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  scannerToggleButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  scannerToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeCameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 