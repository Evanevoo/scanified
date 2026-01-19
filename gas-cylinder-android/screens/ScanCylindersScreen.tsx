import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, Dimensions, Alert, Linking } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import SimpleCameraTest from '../SimpleCameraTest';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import ScanOverlay from '../components/ScanOverlay';
import { Customer } from '../types';
import { FormatValidationService } from '../services/FormatValidationService';
import { Platform } from '../utils/platform';
import { feedbackService } from '../services/feedbackService';

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
  
  // Apply single-character corrections for ambiguous characters
  // Only correct if it makes sense in context (e.g., O in numeric context → 0)
  const numericContext = /[0-9]/.test(corrected);
  
  if (numericContext) {
    // In numeric context, prefer number corrections
    corrected = corrected.replace(/[ODQ]/g, '0');
    corrected = corrected.replace(/[Il|]/g, '1');
    corrected = corrected.replace(/[SZ]/g, '5');
    corrected = corrected.replace(/[B]/g, '8');
    corrected = corrected.replace(/[G]/g, '6');
    // Additional OCR errors for hex-like patterns
    corrected = corrected.replace(/E/g, '5'); // E often misread as 5
    corrected = corrected.replace(/F/g, '7'); // F often misread as 7
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

// Check if barcode is within scan rectangle bounds - More lenient
const isBarcodeInScanArea = (bounds: any): boolean => {
  if (!bounds) {
    logger.log('📍 No bounds provided, allowing scan');
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
  
  logger.log('📍 Barcode position check:', {
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
    // FormatValidationService is disabled - using basic validation only
    logger.log('🔍 Using basic validation (FormatValidationService disabled)');
    
    // Basic validation fallback
    const basicPattern = /^[A-Za-z0-9\-_*%\.\s]+$/;
    if (!basicPattern.test(trimmedBarcode)) {
      logger.log('❌ Basic pattern validation failed');
      return { 
        isValid: false, 
        error: 'Barcode contains invalid characters. Only letters, numbers, and basic symbols are allowed.' 
      };
    }
    logger.log('✅ Basic validation passed');
    return { isValid: true };
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
    // Use FormatValidationService to validate against organization format configuration
    return await FormatValidationService.validateOrderNumber(trimmedOrder, organizationId);
  } catch (error) {
    logger.error('Error validating order number:', error);
    // Fallback to basic validation if FormatValidationService fails
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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const scanDelay = 1500; // ms
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [showCustomerScan, setShowCustomerScan] = useState(false);
  const [showOrderScan, setShowOrderScan] = useState(false);
  const [showSimpleTest, setShowSimpleTest] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  
  // Track last scanned barcode and timestamp to prevent rapid duplicate scans
  const lastScannedBarcodeRef = React.useRef<string | null>(null);
  const lastScanTimeRef = React.useRef<number>(0);
  const scanCooldownRef = React.useRef<NodeJS.Timeout | null>(null);
  const [cameraZoom, setCameraZoom] = useState(0);


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
    if (scannerVisible) {
      setScanned(false);
    }
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
    
    logger.log('🔍 Barcode scanned:', { type, data, scanned, scannerTarget });
    logger.log('🔍 Full event object:', event);
    
    if (!data || typeof data !== 'string') {
      logger.log('❌ Invalid barcode data:', data);
      return;
    }
    
    // Prevent duplicate scans of the same barcode
    const barcode = data.trim();
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    const MIN_SCAN_INTERVAL = 2000; // Minimum 2 seconds between scans
    
    if (barcode === lastScannedBarcodeRef.current && timeSinceLastScan < MIN_SCAN_INTERVAL) {
      logger.log('⚠️ Duplicate scan detected, ignoring (too soon)');
      return;
    }
    
    if (scanned) {
      logger.log('⚠️ Already processing scan, ignoring');
      return;
    }
    
    if (!scannerTarget) {
      logger.log('❌ No scanner target set');
      return;
    }
    
    // Clear any existing cooldown
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
    }
    
    // Set scanned immediately to prevent duplicate scans
    setScanned(true);
    setScannerEnabled(false); // Disable scanner temporarily
    lastScannedBarcodeRef.current = barcode;
    lastScanTimeRef.current = now;
    
    // Reset scanned state and re-enable scanner after cooldown period
    scanCooldownRef.current = setTimeout(() => {
      setScanned(false);
      setScannerEnabled(true);
      // Clear the last scanned barcode after a longer period to allow re-scanning the same barcode
      setTimeout(() => {
        lastScannedBarcodeRef.current = null;
      }, 5000); // Allow same barcode to be scanned again after 5 seconds
    }, MIN_SCAN_INTERVAL);
    
    // Add a small delay to allow the UI to update
    setTimeout(async () => {
    
    try {
      // Skip validation for now - accept any barcode format
      logger.log('✅ Skipping validation - accepting barcode:', data);

      // Apply the scanned data based on target
      if (scannerTarget === 'customer') {
        logger.log('👤 Setting customer search:', data);
        
        // Check if the scanned barcode matches any existing customer
        let scannedBarcode = normalizeBarcode(data);
        
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
        
        // Debug logging (only in development)
        if (__DEV__) {
          logger.debug('🔍 CUSTOMER BARCODE SCAN DEBUG');
          logger.debug('📱 Raw scanned data:', data);
          logger.debug('🧹 After normalization:', scannedBarcode);
          logger.debug('🔢 Fully normalized (no special chars):', scannedNormalized);
          logger.debug('➖ With dashes preserved:', scannedWithDashes);
          logger.debug('🧩 Loose normalized:', scannedLoose);
          logger.debug('👥 Total customers to search:', customers.length);
          logger.debug('🏢 Current organization:', customers[0]?.organization_id || 'N/A');
          
          // First, log ALL customer barcodes for reference
          logger.debug('📋 ALL CUSTOMER BARCODES IN SYSTEM:');
          customers.forEach((customer, index) => {
            if (customer.CustomerListID) {
              logger.debug(`  ${index + 1}. "${customer.name}": "${customer.CustomerListID}" → Normalized: "${normalizeForMatching(customer.CustomerListID)}"`);
            }
          });
        }
        
        // Collect all potential matches with their match quality scores
        // This prevents always returning the first customer in the array
        const potentialMatches: Array<{ customer: any; score: number; strategy: string }> = [];
        
        customers.forEach(customer => {
          if (!customer.CustomerListID) {
            if (__DEV__) logger.debug(`⏭️ Skipping customer "${customer.name}" - no CustomerListID`);
            return;
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
          
          // Log each customer barcode for debugging (only in development)
          if (__DEV__) {
            logger.debug(`\n🔍 Checking customer "${customer.name}"`);
            logger.debug(`   📱 Stored CustomerListID: "${customer.CustomerListID}"`);
            logger.debug(`   🧹 After normalization: "${customerBarcode}"`);
            logger.debug(`   🔢 Fully normalized: "${customerNormalized}"`);
            logger.debug(`   ➖ With dashes: "${customerWithDashes}"`);
            logger.debug(`   🧩 Loose: "${customerLoose}"`);
            if (storedBarcode) {
              logger.debug(`   📦 Stored barcode: "${storedBarcode}"`);
              logger.debug(`   📦 Stored normalized: "${storedBarcodeNormalized}"`);
            }
            logger.debug(`   📊 Comparing to scanned: "${scannedNormalized}"`);
          }
          
          // Strategy 1: Exact match (case insensitive) - Highest priority (score: 100)
          if (customerBarcode.toLowerCase() === scannedBarcode.toLowerCase()) {
            if (__DEV__) logger.debug('✅ Match found: Exact match (CustomerListID)');
            potentialMatches.push({ customer, score: 100, strategy: 'exact' });
            return;
          }
          
          // Strategy 1b: Match against stored barcode field (if exists)
          if (storedBarcode && storedBarcode.toLowerCase() === scannedBarcode.toLowerCase()) {
            if (__DEV__) logger.debug('✅ Match found: Exact match (stored barcode)');
            potentialMatches.push({ customer, score: 100, strategy: 'exact_stored' });
            return;
          }
          
          // Strategy 2: Fully normalized match (removes ALL special characters) - High priority (score: 90)
          if (customerNormalized === scannedNormalized) {
            if (__DEV__) logger.debug('✅ Match found: Normalized match (CustomerListID)');
            potentialMatches.push({ customer, score: 90, strategy: 'normalized' });
            return;
          }
          
          if (storedBarcodeNormalized && storedBarcodeNormalized === scannedNormalized) {
            if (__DEV__) logger.debug('✅ Match found: Normalized match (stored barcode)');
            potentialMatches.push({ customer, score: 90, strategy: 'normalized_stored' });
            return;
          }
          
          // Strategy 3: Match with dashes preserved - High priority (score: 85)
          if (customerWithDashes === scannedWithDashes) {
            if (__DEV__) logger.debug('✅ Match found: Dashes match (CustomerListID)');
            potentialMatches.push({ customer, score: 85, strategy: 'dashes' });
            return;
          }
          
          if (storedBarcodeWithDashes && storedBarcodeWithDashes === scannedWithDashes) {
            if (__DEV__) logger.debug('✅ Match found: Dashes match (stored barcode)');
            potentialMatches.push({ customer, score: 85, strategy: 'dashes_stored' });
            return;
          }
          
          // Strategy 4: Loose match (removes spaces, dashes, underscores) - Medium priority (score: 80)
          if (customerLoose === scannedLoose) {
            if (__DEV__) logger.debug('✅ Match found: Loose match (CustomerListID)');
            potentialMatches.push({ customer, score: 80, strategy: 'loose' });
            return;
          }
          
          if (storedBarcodeLoose && storedBarcodeLoose === scannedLoose) {
            if (__DEV__) logger.debug('✅ Match found: Loose match (stored barcode)');
            potentialMatches.push({ customer, score: 80, strategy: 'loose_stored' });
            return;
          }
          
          // Strategy 5: Handle common barcode variations (A/a endings) - Medium priority (score: 75)
          if (scannedBarcode.length > 1 && customerBarcode.length > 1) {
            const baseScanned = scannedBarcode.slice(0, -1);
            const baseCustomer = customerBarcode.slice(0, -1);
            
            if (baseScanned.toLowerCase() === baseCustomer.toLowerCase()) {
              if (__DEV__) logger.debug('✅ Match found: Base match (without last character)');
              potentialMatches.push({ customer, score: 75, strategy: 'base' });
              return;
            }
          }
          
          // Strategy 6: Strict partial match - Only if lengths are similar and match is substantial (score: 50)
          // Only match if the shorter string is at least 80% of the longer string's length
          const minLength = Math.min(customerNormalized.length, scannedNormalized.length);
          const maxLength = Math.max(customerNormalized.length, scannedNormalized.length);
          const lengthRatio = minLength / maxLength;
          
          if (lengthRatio >= 0.8 && minLength >= 4) {
            if (customerNormalized.includes(scannedNormalized) || scannedNormalized.includes(customerNormalized)) {
              if (__DEV__) logger.debug('✅ Match found: Strict partial match (length ratio >= 0.8)');
              potentialMatches.push({ customer, score: 50, strategy: 'partial' });
              return;
            }
          }
          
          // Strategy 7: Substring match - Check if scanned barcode is a significant substring of customer ID (score: 40)
          // Useful for partial barcodes like "8ef0321A" matching "1578330321A"
          if (scannedNormalized.length >= 6) { // At least 6 characters for substring match
            // Check if scanned is contained in customer ID
            // Check if scanned is contained in customer ID (anywhere)
            if (customerNormalized.includes(scannedNormalized)) {
              const matchRatio = scannedNormalized.length / customerNormalized.length;
              if (matchRatio >= 0.3) { // At least 30% of the customer ID (lowered for better matching)
                if (__DEV__) logger.debug(`✅ Match found: Substring match (${Math.round(matchRatio * 100)}% of customer ID)`);
                potentialMatches.push({ customer, score: 40, strategy: 'substring' });
                return;
              }
            }
            // Check if scanned matches the END of customer ID (common for partial scans) - Higher priority
            const customerEnd = customerNormalized.slice(-scannedNormalized.length);
            if (customerEnd === scannedNormalized) {
              if (__DEV__) logger.debug('✅ Match found: End substring match (scanned matches end of customer ID)');
              potentialMatches.push({ customer, score: 45, strategy: 'end_substring' });
              return;
            }
            // Check if scanned matches the START of customer ID
            const customerStart = customerNormalized.slice(0, scannedNormalized.length);
            if (customerStart === scannedNormalized) {
              if (__DEV__) logger.debug('✅ Match found: Start substring match (scanned matches start of customer ID)');
              potentialMatches.push({ customer, score: 45, strategy: 'start_substring' });
              return;
            }
            // Check if scanned is a substring of stored barcode
            if (storedBarcodeNormalized && storedBarcodeNormalized.includes(scannedNormalized)) {
              const matchRatio = scannedNormalized.length / storedBarcodeNormalized.length;
              if (matchRatio >= 0.3) {
                if (__DEV__) logger.debug(`✅ Match found: Substring match in stored barcode (${Math.round(matchRatio * 100)}%)`);
                potentialMatches.push({ customer, score: 40, strategy: 'substring_stored' });
                return;
              }
            }
            // Check if scanned matches end of stored barcode
            if (storedBarcodeNormalized) {
              const storedEnd = storedBarcodeNormalized.slice(-scannedNormalized.length);
              if (storedEnd === scannedNormalized) {
                if (__DEV__) logger.debug('✅ Match found: End substring match in stored barcode');
                potentialMatches.push({ customer, score: 45, strategy: 'end_substring_stored' });
                return;
              }
              // Check if scanned matches start of stored barcode
              const storedStart = storedBarcodeNormalized.slice(0, scannedNormalized.length);
              if (storedStart === scannedNormalized) {
                if (__DEV__) logger.debug('✅ Match found: Start substring match in stored barcode');
                potentialMatches.push({ customer, score: 45, strategy: 'start_substring_stored' });
                return;
              }
            }
          }
        });
        
        // Sort matches by score (highest first) and return the best match
        potentialMatches.sort((a, b) => b.score - a.score);
        const matchingCustomer = potentialMatches.length > 0 ? potentialMatches[0].customer : null;

        if (__DEV__ && potentialMatches.length > 1) {
          logger.debug(`⚠️ Multiple matches found (${potentialMatches.length}). Using highest score: ${potentialMatches[0].strategy} (score: ${potentialMatches[0].score})`);
          logger.debug('All matches:', potentialMatches.map(m => `${m.customer.name} (${m.strategy}, score: ${m.score})`));
        }
        
        if (!matchingCustomer) {
          logger.log('⚠️ Scanned barcode does not match any existing customer');
          
          // Find similar customers with their full info for selection
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
          
          setScanned(false);
          return;
        }
        
        // Customer found, proceed normally
        logger.log('✅ Customer found:', matchingCustomer.name);
        setSearch(normalizeBarcode(matchingCustomer.CustomerListID || data));
        setSelectedCustomer(matchingCustomer);
        setShowCustomerScan(false);
        setScannerVisible(false);
        setScannerTarget(null);
        
        // No sound feedback for customer scanning
        
        // Show success feedback
        Alert.alert(
          'Customer Found!',
          `Successfully scanned customer: ${matchingCustomer.name}`,
          [{ text: 'OK' }]
        );
      } else if (scannerTarget === 'order') {
        logger.log('📦 Setting order number:', data);
        setOrderNumber(data);
        setShowOrderScan(false);
        setScannerVisible(false);
        setScannerTarget(null);
      }
      
      // Reset scanned state after a delay
      setTimeout(() => setScanned(false), 2000);
      
    } catch (error) {
      logger.error('❌ Error processing barcode scan:', error);
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
    logger.log('📷 Opening scanner for target:', target);
    logger.log('📷 Current permission status:', permission?.granted);
    
    try {
      // Check if permission is still loading
      if (!permission) {
        logger.log('📷 Permission still loading, waiting...');
        Alert.alert(
          'Camera Loading',
          'Camera permissions are still loading. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (!permission.granted) {
        logger.log('📷 Requesting camera permission...');
        const result = await requestPermission();
        logger.log('📷 Permission request result:', result);
        if (!result.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to scan barcodes.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      logger.log('📷 Setting up scanner for target:', target);
      
      // Clear any existing errors
      setCustomerBarcodeError('');
      setOrderError('');
      
      // Reset states
      setScanned(false);
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
      
    } catch (error) {
      logger.error('❌ Error opening scanner:', error);
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
                maxLength={orderNumberMaxLength}
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
                Tap the camera button to grant permission
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
                  logger.log('📷 Customer scan button pressed');
                  logger.log('📷 Permission granted:', permission?.granted);
                  logger.log('📷 Scanner target:', scannerTarget);
                  openScanner('customer');
                }}
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
                Tap the camera button to grant permission
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

      {/* Camera Scanner - Customer */}
      {showCustomerScan && (
        <View style={styles.fullscreenWrapper}>
          {logger.log('📷 RENDERING CAMERA VIEW - showCustomerScan is true')}
          <CameraView
            style={styles.fullscreenCamera}
            facing="back"
            enableTorch={flashEnabled}
            barcodeScannerEnabled={scannerEnabled}
            autofocus="on"
            zoom={cameraZoom}
            mode="picture"
            barcodeScannerSettings={{}}
            onBarcodeScanned={({ data, bounds }) => {
              // Check if barcode is within scan area (if bounds are available)
              if (bounds && !isBarcodeInScanArea(bounds)) {
                logger.log('📷 Customer barcode outside scan area, ignoring');
                return;
              }
              
              // Don't process if scanner is disabled or already processing
              if (!scannerEnabled || scanned) {
                return;
              }
              
              const barcode = data.trim();
              if (barcode) {
                logger.log('📷 BARCODE DETECTED:', barcode);
                logger.log('📷 Available customers:', customers.length);
                // Use the main handleBarcodeScanned function to prevent duplicates
                handleBarcodeScanned({ data: barcode, type: 'camera' });
              }
            }}
          />
          
          {/* Camera Overlay - Matching EnhancedScanScreen */}
          <View
            style={styles.cameraOverlay}
            pointerEvents="none"
          >
            <View
              style={styles.scanFrame}
              pointerEvents="none"
            />
            <Text style={styles.scanInstructions} pointerEvents="none">
              Point camera at customer barcode on receipt
            </Text>
            <Text style={styles.scanHint} pointerEvents="none">
              Hold steady, ensure good lighting
            </Text>
          </View>
          
          {/* Close Button - Separate from overlay to ensure it works */}
          <TouchableOpacity
            style={styles.closeCameraButton}
            onPress={() => {
              setShowCustomerScan(false);
            }}
          >
            <Text style={styles.closeCameraText}>✕ Close</Text>
          </TouchableOpacity>

          {/* Flash Toggle Button */}
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => {
              setFlashEnabled(!flashEnabled);
              feedbackService.quickAction('flash toggled');
            }}
          >
            <Ionicons 
              name={flashEnabled ? 'flash' : 'flash-off'} 
              size={28} 
              color={flashEnabled ? '#FFD700' : '#FFFFFF'} 
            />
          </TouchableOpacity>

          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                setCameraZoom(Math.max(0, cameraZoom - 0.1));
                feedbackService.quickAction('zoom out');
              }}
            >
              <Ionicons name="remove-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{Math.round(cameraZoom * 100)}%</Text>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                setCameraZoom(Math.min(1, cameraZoom + 0.1));
                feedbackService.quickAction('zoom in');
              }}
            >
              <Ionicons name="add-outline" size={24} color="#FFFFFF" />
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
            enableTorch={flashEnabled}
            barcodeScannerEnabled={scannerEnabled}
            barcodeScannerSettings={{}}
            onBarcodeScanned={({ data, bounds }) => {
              logger.log('📷 Raw order barcode event:', data, 'bounds:', bounds);
              
              // Check if barcode is within scan area (if bounds are available)
              if (bounds && !isBarcodeInScanArea(bounds)) {
                logger.log('📷 Order barcode outside scan area, ignoring');
                return;
              }
              
              const barcode = data.trim();
              if (barcode) {
                logger.log('📷 Order barcode detected:', barcode);
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
          
          {/* Flash Toggle Button */}
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => {
              setFlashEnabled(!flashEnabled);
              feedbackService.quickAction('flash toggled');
            }}
          >
            <Ionicons 
              name={flashEnabled ? 'flash' : 'flash-off'} 
              size={28} 
              color={flashEnabled ? '#FFD700' : '#FFFFFF'} 
            />
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
  zoomControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'center',
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
    fontWeight: '600',
  },
  scanHint: {
    color: '#fff',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 4,
    fontStyle: 'italic',
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
}); 