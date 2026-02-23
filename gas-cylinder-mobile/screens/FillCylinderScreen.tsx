import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Modal, Alert, ScrollView, SafeAreaView, Linking, Vibration, TextInput, Pressable, Platform, Dimensions 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { feedbackService } from '../services/feedbackService';

import ScanArea from '../components/ScanArea';

const { width, height } = Dimensions.get('window');

interface Location {
  id: string;
  name: string;
}

interface ScannedBottle {
  id: string;
  barcode_number: string;
  serial_number?: string;
  gas_type?: string;
  group_name?: string;
  previousStatus?: string;
  previousLocation?: string;
  scannedAt: Date;
  targetStatus: 'full' | 'empty'; // Track what status we're scanning as
}

type StatusType = 'empty' | 'full';

// Helper function to display user-friendly status text
// Status is either Full, Empty, or Rented (Available = Full)
const getStatusDisplayText = (status?: string): string => {
  if (!status) return 'N/A';
  switch (status.toLowerCase()) {
    case 'filled':
    case 'available': // Available means Full (in stock, ready to go out)
      return 'Full';
    case 'empty':
      return 'Empty';
    case 'rented':
      return 'Rented';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export default function FillCylinderScreen() {
  const themeContext = useTheme();
  const assetContext = useAssetConfig();
  const authContext = useAuth();
  const settingsContext = useSettings();
  const navigation = useNavigation();
  
  const colors = themeContext?.colors || {};
  const assetConfig = assetContext?.config || null;
  const profile = authContext?.profile || null;
  const settings = settingsContext?.settings || {};
  
  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Location selection
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  
  // Step 2: Status selection
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  
  // Step 3: Scanning
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  // Using Expo Camera for iOS - no toggle needed
  const [focusTrigger, setFocusTrigger] = useState(0); // Used to trigger autofocus on tap
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedBarcodeRef = useRef<string>('');
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const scannerActiveRef = useRef(false); // true only while scanner modal is open – avoids callbacks after close (camera crash)
  const hasScannedBottlesRef = useRef(false); // tracks if bottles were scanned this session (avoids stale state when closing)
  const isMountedRef = useRef(true); // false after unmount – avoid setState/Alert after Save (crash fix)
  const processingBarcodesRef = useRef<Set<string>>(new Set()); // block duplicate scan callbacks while one is in flight
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualEntryBarcode, setManualEntryBarcode] = useState('');
  const [lastScannedBottleDetails, setLastScannedBottleDetails] = useState<ScannedBottle | null>(null);
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    scannerActiveRef.current = false;
    setScannerVisible(false);
    navigation.navigate('CustomerDetails', { customerId: customer.id });
  };

  // Fetch locations on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocations = async () => {
      if (!profile?.organization_id) {
        if (isMounted) setLoadingLocations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', profile.organization_id)
          .order('name');

        if (!isMounted) return; // Component unmounted, don't update state

        if (error) {
          logger.error('Error fetching locations:', error);
          setLocations([]);
        } else {
          setLocations(data || []);
        }
      } catch (err) {
        logger.error('Error fetching locations:', err);
        if (isMounted) setLocations([]);
      } finally {
        if (isMounted) setLoadingLocations(false);
      }
    };

    fetchLocations();
    
    return () => {
      isMounted = false;
    };
  }, [profile?.organization_id]);

  // Initialize feedback service
  useEffect(() => {
    try {
      feedbackService.initialize();
    } catch (e) {
      logger.warn('Failed to initialize feedback service:', e);
    }
    return () => {
      try {
        feedbackService.cleanup();
      } catch (e) {
        logger.warn('Failed to cleanup feedback service:', e);
      }
    };
  }, []);

  // Update feedback service settings when app settings change
  useEffect(() => {
    try {
      if (settings) {
        feedbackService.updateSettings({
          soundEnabled: settings.soundEnabled ?? true,
          hapticEnabled: settings.vibrationEnabled ?? true,
          voiceEnabled: settings.soundEnabled ?? true, // Use sound setting for voice too
          volume: 0.8,
        });
      }
    } catch (e) {
      logger.warn('Failed to update feedback settings:', e);
    }
  }, [settings?.soundEnabled, settings?.vibrationEnabled]);

  // Close camera when screen loses focus (e.g. user navigates away) to prevent crashes
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        scannerActiveRef.current = false;
        setScannerVisible(false);
      };
    }, [])
  );

  // Mark unmounted so submit success path doesn't setState/Alert after unmount (prevents crash)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    const location = locations.find(l => l.id === locationId);
    setSelectedLocationName(location?.name || '');
    setError('');
  };

  const handleStatusSelect = (status: StatusType) => {
    setSelectedStatus(status);
    setError('');
  };

  const goToNextStep = async () => {
    if (currentStep === 1) {
      if (!selectedLocation) {
        setError('Please select a location');
        return;
      }
      setCurrentStep(2);
      setError('');
    } else if (currentStep === 2) {
      if (!selectedStatus) {
        setError('Please select a status');
        return;
      }
      setCurrentStep(3);
      setError('');
      // On iOS, don't auto-open scanner so "Enter Barcode Manually" is visible; on Android, auto-open
      if (Platform.OS !== 'ios') {
        await openScanner();
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setScannerVisible(false); // Close scanner when going back
      setCurrentStep(2);
    }
    setError('');
  };

  const resetAll = () => {
    setCurrentStep(1);
    setSelectedLocation('');
    setSelectedLocationName('');
    setSelectedStatus(null);
    setScannedBottles([]);
    setError('');
    setSuccess('');
    setLastScannedBarcode('');
    lastScannedBarcodeRef.current = '';
    lastScanTimeRef.current = 0;
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
      scanCooldownRef.current = null;
    }
  };

  const handleBarcodeScanned = async (event: any) => {
    // Allow manual entry to add barcodes; only require scannerActiveRef for camera callbacks
    if (!(event?.fromManualEntry) && !scannerActiveRef.current) return;
    // Match Android - simple extraction
    const barcode = event?.data?.trim();
    if (!barcode) return;
    
    logger.log('📷 SCAN START:', barcode);

    // Block duplicate in-flight: same barcode already being processed (camera can fire multiple times)
    if (processingBarcodesRef.current.has(barcode)) {
      logger.log('⚠️ Duplicate scan (already processing), ignoring:', barcode);
      await feedbackService.provideFeedback('duplicate', { barcode });
      Vibration.vibrate([0, 100, 50, 100]);
      return;
    }
    processingBarcodesRef.current.add(barcode);
    
    // Check if status is selected (required for scanning)
    if (!selectedStatus) {
      logger.warn('⚠️ Cannot scan - no status selected');
      setError('Please select Full or Empty status first');
      await feedbackService.provideFeedback('error', { message: 'Select status first' });
      processingBarcodesRef.current.delete(barcode);
      return;
    }
    
    // Prevent duplicate scans within 1.5 seconds
    const now = Date.now();
    if (barcode === lastScannedBarcodeRef.current && now - lastScanTimeRef.current < 1500) {
      logger.log('⚠️ Duplicate scan (too soon), ignoring');
      processingBarcodesRef.current.delete(barcode);
      return;
    }

    // Check if already scanned in this session
    if (scannedBottles.find(b => b.barcode_number === barcode)) {
      logger.log('⚠️ Duplicate - already in list');
      await feedbackService.provideFeedback('duplicate', { barcode });
      Vibration.vibrate([0, 100, 50, 100]);
      setError(`Barcode ${barcode} already scanned`);
      processingBarcodesRef.current.delete(barcode);
      return;
    }

    // Update refs BEFORE setting isProcessing to prevent race conditions
    lastScannedBarcodeRef.current = barcode;
    lastScanTimeRef.current = now;
    setLastScannedBarcode(barcode);
    setIsProcessing(true);
    logger.log('📷 Set isProcessing to true, starting database lookup');

    // Play scan sound immediately when barcode is detected
    await feedbackService.scanSuccess(barcode);

    try {
      logger.log('📷 Looking up bottle in database:', barcode);
      // Look up the bottle in the database - include customer fields
      const { data: bottleData, error: fetchError } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, gas_type, group_name, status, assigned_customer, customer_name, location')
        .eq('organization_id', profile?.organization_id)
        .eq('barcode_number', barcode)
        .maybeSingle();
      
      logger.log('📷 Database lookup result:', { hasData: !!bottleData, error: fetchError });

      if (fetchError) {
        logger.error('Error fetching bottle:', fetchError);
        await feedbackService.provideFeedback('error', { message: 'Database error' });
        if (isMountedRef.current) setError(`Error looking up ${barcode}`);
        processingBarcodesRef.current.delete(barcode);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsProcessing(false);
          setError('');
          setLastScannedBarcode(''); // Clear to allow retry
          lastScannedBarcodeRef.current = ''; // Clear ref
        }, 2000);
        return;
      }

      if (!bottleData) {
        await feedbackService.provideFeedback('error', { message: 'Not found' });
        Vibration.vibrate([0, 200, 100, 200]); // Long vibrate for not found
        if (isMountedRef.current) setError(`${assetConfig?.assetDisplayName || 'Bottle'} "${barcode}" not found in system`);
        processingBarcodesRef.current.delete(barcode);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsProcessing(false);
          setError('');
          setLastScannedBarcode(''); // Clear to allow retry
          lastScannedBarcodeRef.current = ''; // Clear ref
        }, 2000);
        return;
      }

      // Check if scanning as "full" and bottle is still at a customer (Android doesn't check status)
      if (selectedStatus === 'full') {
        const isAtCustomer = bottleData.assigned_customer || bottleData.customer_name;
        logger.log('📷 Checking customer: isAtCustomer=', isAtCustomer);
        
        // If bottle has a customer assignment, show warning
        if (isAtCustomer) {
          logger.log('⚠️ WARNING: Bottle still at customer - showing alert');
          Alert.alert(
            '⚠️ Bottle Still at Customer',
            `This ${assetConfig?.assetDisplayName?.toLowerCase() || 'bottle'} (${barcode}) is still assigned to customer "${bottleData.customer_name || 'Unknown'}" and was never scanned as empty.\n\nPlease scan it as empty first when it returns from the customer, then scan as full after refilling.`,
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  processingBarcodesRef.current.delete(barcode);
                  setIsProcessing(false);
                  setLastScannedBarcode('');
                  lastScannedBarcodeRef.current = '';
                }
              },
              { 
                text: 'Add Anyway', 
                onPress: () => {
                  addBottleToScannedList(bottleData);
                }
              }
            ]
          );
          return;
        }
      }

      // Add to scanned list (this will reset isProcessing and clear processing ref)
      logger.log('✅ All checks passed, adding bottle to list');
      addBottleToScannedList(bottleData);

    } catch (err) {
      logger.error('Error processing scan:', err);
      processingBarcodesRef.current.delete(barcode);
      try {
        await feedbackService.provideFeedback('error', { message: 'Scan failed' });
      } catch (feedbackErr) {
        logger.warn('Feedback service error:', feedbackErr);
      }
      if (isMountedRef.current) setError('Error processing scan');
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setIsProcessing(false);
        setError('');
        setLastScannedBarcode(''); // Clear to allow retry
      }, 2000);
    }
  };

  const addBottleToScannedList = (bottleData: any) => {
    if (!isMountedRef.current) return;
    
    const newBottle: ScannedBottle = {
      id: bottleData.id,
      barcode_number: bottleData.barcode_number,
      serial_number: bottleData.serial_number,
      gas_type: bottleData.gas_type,
      group_name: bottleData.group_name,
      previousStatus: bottleData.status,
      previousLocation: bottleData.location,
      scannedAt: new Date(),
      targetStatus: selectedStatus
    };

    setScannedBottles(prev => {
      // Check if this bottle is already in the list (prevent duplicate additions)
      if (prev.find(b => b.barcode_number === newBottle.barcode_number)) {
        logger.log('⚠️ Bottle already in list, skipping duplicate add');
        return prev;
      }
      hasScannedBottlesRef.current = true; // mark that we've scanned (for onClose - state may be stale)
      const updated = [newBottle, ...prev];
      logger.log('✅ ADDED BOTTLE:', newBottle.barcode_number, 'Count:', updated.length);
      return updated;
    });
    processingBarcodesRef.current.delete(newBottle.barcode_number); // allow same barcode to be scanned again later if removed
    setLastScannedBottleDetails(newBottle);
    
    try {
      Vibration.vibrate(100);
    } catch (e) {
      // Vibration might fail on some devices
    }
    setError('');
    setIsProcessing(false);
  };

  const removeBottle = (id: string) => {
    setScannedBottles(prev => prev.filter(b => b.id !== id));
  };

  const clearAllBottles = () => {
    Alert.alert(
      'Clear All',
      `Are you sure you want to remove all ${scannedBottles.length} scanned ${assetConfig?.assetTypePlural || 'bottles'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => setScannedBottles([]) }
      ]
    );
  };

  const handleSubmit = async () => {
    if (scannedBottles.length === 0) {
      setError(`No ${assetConfig?.assetTypePlural || 'bottles'} scanned`);
      return;
    }

    if (!selectedStatus) {
      setError('Please select a status (Full or Empty)');
      return;
    }

    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    if (!profile?.organization_id) {
      setError('Organization not found. Please log out and log back in.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;
      let fillRecordFailures = 0;
      const errorMessages: string[] = [];

      for (const bottle of scannedBottles) {
        try {
          if (!bottle?.id || !bottle?.barcode_number) {
            logger.warn('Skipping malformed bottle in list:', bottle);
            errorCount++;
            continue;
          }
          // First, get current bottle data to preserve organization_id
          const { data: currentBottle, error: fetchError } = await supabase
            .from('bottles')
            .select('organization_id')
            .eq('id', bottle.id)
            .single();

          if (fetchError) {
            logger.error(`Failed to fetch bottle ${bottle.barcode_number}:`, fetchError);
            errorMessages.push(`${bottle.barcode_number}: ${fetchError.message || 'Not found'}`);
            errorCount++;
            continue;
          }

          if (!currentBottle?.organization_id) {
            logger.error(`Bottle ${bottle.barcode_number} has no organization_id`);
            errorMessages.push(`${bottle.barcode_number}: Missing organization`);
            errorCount++;
            continue;
          }

          // Update bottle status and location
          // Location should be stored as name (uppercase with underscores), not ID
          // Ensure we always have a valid location name - if selectedLocationName is empty, look it up from locations array
          let locationName = selectedLocationName;
          if (!locationName && selectedLocation) {
            const foundLocation = locations.find(l => l.id === selectedLocation);
            locationName = foundLocation?.name || '';
            logger.log(`🔍 Looked up location: ID=${selectedLocation}, Name=${locationName}`);
          }
          
          // Validate that we have a location name (should always be set if location was selected)
          if (!locationName || locationName.trim() === '') {
            logger.error(`❌ Location name is missing for location ID: ${selectedLocation}`);
            logger.error(`   selectedLocationName: "${selectedLocationName}"`);
            logger.error(`   selectedLocation: "${selectedLocation}"`);
            logger.error(`   locations array length: ${locations.length}`);
            errorMessages.push(`${bottle.barcode_number}: Location name is missing`);
            errorCount++;
            continue;
          }
          
          const formattedLocation = locationName.toUpperCase().replace(/\s+/g, '_');
          logger.log(`📍 Updating bottle ${bottle.barcode_number} location: "${locationName}" -> "${formattedLocation}"`);
          
          const updateData: any = {
            status: selectedStatus,
            location: formattedLocation,
            last_location_update: new Date().toISOString()
          };

          // When marking as full or empty, clear customer assignment since bottles are at in-house locations
          // Note: last_filled_date and fill_count columns may not exist in all databases
          // If you need fill tracking, add these columns to your database schema:
          // - last_filled_date (timestamp)
          // - fill_count (integer)
          if (selectedStatus === 'full') {
            // Clear customer assignment - full bottles are at in-house locations
            updateData.assigned_customer = null;
            updateData.customer_name = null;
            // updateData.last_filled_date = new Date().toISOString();
            // updateData.fill_count = (currentBottle?.fill_count || 0) + 1;
          } else if (selectedStatus === 'empty') {
            // Clear customer assignment - empty bottles are returned to in-house locations
            updateData.assigned_customer = null;
            updateData.customer_name = null;
          }

          logger.log(`💾 Updating bottle ${bottle.barcode_number} with data:`, JSON.stringify(updateData, null, 2));
          
          const { data: updatedBottle, error: updateError } = await supabase
            .from('bottles')
            .update(updateData)
            .eq('id', bottle.id)
            .eq('organization_id', profile.organization_id)
            .select('location, status');

          if (updateError) {
            logger.error(`❌ Failed to update ${bottle.barcode_number}:`, updateError);
            logger.error('Update data was:', updateData);
            logger.error('Organization ID:', profile.organization_id);
            errorMessages.push(`${bottle.barcode_number}: ${updateError.message || 'Update failed'}`);
            errorCount++;
            continue;
          }
          
          if (updatedBottle && updatedBottle.length > 0) {
            logger.log(`✅ Successfully updated bottle ${bottle.barcode_number}`);
            logger.log(`   New location: "${updatedBottle[0].location}"`);
            logger.log(`   New status: "${updatedBottle[0].status}"`);
          } else {
            logger.warn(`⚠️ Update succeeded but no data returned for bottle ${bottle.barcode_number}`);
          }

          // Close any active rentals when clearing customer assignment
          if (updateData.assigned_customer === null) {
            const { error: rentalCloseError } = await supabase
              .from('rentals')
              .update({ rental_end_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
              .eq('organization_id', profile.organization_id)
              .is('rental_end_date', null)
              .or(`bottle_id.eq.${bottle.id},bottle_barcode.eq.${bottle.barcode_number}`);

            if (rentalCloseError) {
              logger.warn(`Could not close rental for ${bottle.barcode_number}:`, rentalCloseError);
            } else {
              logger.log(`📋 Closed active rental(s) for ${bottle.barcode_number}`);
            }
          }

          // Create a status change record for tracking (enables cancel/revert, Bottles for Day, and Movement History)
          const deviceTimezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
          const { error: fillErr } = await supabase
            .from('cylinder_fills')
            .insert({
              cylinder_id: bottle.id,
              barcode_number: bottle.barcode_number,
              fill_date: new Date().toISOString(),
              fill_timezone: deviceTimezone,
              filled_by: 'mobile_app',
              notes: `Bulk ${selectedStatus === 'full' ? 'fill' : 'empty'} at ${selectedLocationName}`,
              organization_id: profile.organization_id,
              fill_type: selectedStatus,
              previous_status: bottle.previousStatus ?? null,
              previous_location: bottle.previousLocation ?? null
            });
          if (fillErr) {
            logger.warn(`Could not create fill record for ${bottle.barcode_number}:`, fillErr);
            fillRecordFailures++;
          }

          successCount++;
        } catch (err) {
          logger.error(`Error processing ${bottle.barcode_number}:`, err);
          errorCount++;
        }
      }

      if (!isMountedRef.current) return;

      if (successCount > 0) {
        const statusText = selectedStatus === 'full' ? 'Full' : 'Empty';
        const fillWarn = fillRecordFailures > 0 ? `\n\n${fillRecordFailures} could not be recorded in Movement History. Ensure the cylinder_fills migration has been run.` : '';
        const locationLabel = selectedLocationName ?? '';
        try {
          if (isMountedRef.current) {
            setSuccess(`Successfully marked ${successCount} ${assetConfig?.assetTypePlural ?? 'bottles'} as ${statusText}${errorCount > 0 ? ` (${errorCount} failed)` : ''}${fillRecordFailures > 0 ? `. ${fillRecordFailures} not recorded in history.` : ''}`);
          }
          if (isMountedRef.current) {
            Alert.alert(
              'Success!',
              `${successCount} ${assetConfig?.assetTypePlural ?? 'bottles'} marked as ${statusText} at ${locationLabel}${errorCount > 0 ? `\n${errorCount} failed` : ''}${fillWarn}`,
              [
                { text: 'Scan More', onPress: () => { if (isMountedRef.current) setScannedBottles([]); } },
                { text: 'Done', onPress: () => { if (isMountedRef.current) resetAll(); } }
              ]
            );
          }
          await feedbackService.batchComplete(successCount);
        } catch (successErr: any) {
          logger.error('Success path error:', successErr);
          if (isMountedRef.current) {
            setError(successErr?.message ?? 'Something went wrong after saving.');
            Alert.alert('Notice', successErr?.message ?? 'Saved but something went wrong.');
          }
        }
      } else {
        const errorMsg = `Failed to update any bottles. ${errorCount > 0 ? `All ${errorCount} updates failed.` : 'Please check your connection and try again.'}`;
        const detailedError = errorMessages.length > 0 ? `\n\nErrors:\n${errorMessages.slice(0, 5).join('\n')}${errorMessages.length > 5 ? `\n...and ${errorMessages.length - 5} more` : ''}` : '';
        if (isMountedRef.current) setError(errorMsg + detailedError);
        try {
          await feedbackService.provideFeedback('error', { message: 'Update failed' });
        } catch (_) {}
        if (isMountedRef.current) {
          Alert.alert('Update Failed', errorMsg + detailedError, [{ text: 'OK' }]);
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred during submission';
      logger.error('Submission error:', err);
      if (isMountedRef.current) {
        setError(`Error: ${errorMessage}`);
        Alert.alert('Submission Error', errorMessage, [{ text: 'OK' }]);
      }
      try {
        await feedbackService.provideFeedback('error', { message: 'Submission error' });
      } catch (_) {}
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  const openScanner = async () => {
    setIsProcessing(false); // Reset processing state when opening scanner
    setError(''); // Clear any errors
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to scan barcodes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }
    scannerActiveRef.current = true;
    hasScannedBottlesRef.current = false; // reset when opening scanner
    processingBarcodesRef.current.clear(); // allow all barcodes to be scanned again
    setScannerVisible(true);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive, { backgroundColor: currentStep >= 1 ? colors.primary : colors.border }]}>
        <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
      </View>
      <View style={[styles.stepLine, { backgroundColor: currentStep >= 2 ? colors.primary : colors.border }]} />
      <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive, { backgroundColor: currentStep >= 2 ? colors.primary : colors.border }]}>
        <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
      </View>
      <View style={[styles.stepLine, { backgroundColor: currentStep >= 3 ? colors.primary : colors.border }]} />
      <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive, { backgroundColor: currentStep >= 3 ? colors.primary : colors.border }]}>
        <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Location</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Where is this fill/status update happening?
      </Text>

      {loadingLocations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading locations...</Text>
        </View>
      ) : locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No locations found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Please add locations in the web dashboard
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setLocationPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pickerButtonText, { color: selectedLocation ? colors.text : colors.textSecondary }]}>
              {selectedLocation 
                ? locations.find(loc => loc.id === selectedLocation)?.name || 'Select Location'
                : '-- Select Location --'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          {/* Location Picker Modal */}
          <Modal
            visible={locationPickerVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setLocationPickerVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Location</Text>
                  <TouchableOpacity onPress={() => setLocationPickerVisible(false)}>
                    <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerModalScroll}>
                  {locations.map(location => (
                    <TouchableOpacity
                      key={location.id}
                      style={[
                        styles.pickerModalItem,
                        { borderBottomColor: colors.border },
                        selectedLocation === location.id && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        handleLocationSelect(location.id);
                        setLocationPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                        {location.name}
                      </Text>
                      {selectedLocation === location.id && (
                        <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}

      {selectedLocation && (
        <View style={[styles.selectedCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Ionicons name="location" size={24} color={colors.primary} />
          <Text style={[styles.selectedText, { color: colors.primary }]}>{selectedLocationName}</Text>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Status</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Are you marking {assetConfig?.assetTypePlural || 'bottles'} as empty or full?
      </Text>

      <View style={styles.statusOptions}>
        <TouchableOpacity
          style={[
            styles.statusOption,
            { 
              backgroundColor: selectedStatus === 'empty' ? '#F59E0B' : colors.surface,
              borderColor: selectedStatus === 'empty' ? '#F59E0B' : colors.border
            }
          ]}
          onPress={() => handleStatusSelect('empty')}
        >
          <Ionicons 
            name="cube-outline" 
            size={48} 
            color={selectedStatus === 'empty' ? '#fff' : '#F59E0B'} 
          />
          <Text style={[
            styles.statusOptionText, 
            { color: selectedStatus === 'empty' ? '#fff' : colors.text }
          ]}>
            Empty
          </Text>
          <Text style={[
            styles.statusOptionSubtext, 
            { color: selectedStatus === 'empty' ? '#fff' : colors.textSecondary }
          ]}>
            Mark as empty/returned
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusOption,
            { 
              backgroundColor: selectedStatus === 'full' ? '#22C55E' : colors.surface,
              borderColor: selectedStatus === 'full' ? '#22C55E' : colors.border
            }
          ]}
          onPress={() => handleStatusSelect('full')}
        >
          <Ionicons 
            name="cube" 
            size={48} 
            color={selectedStatus === 'full' ? '#fff' : '#22C55E'} 
          />
          <Text style={[
            styles.statusOptionText, 
            { color: selectedStatus === 'full' ? '#fff' : colors.text }
          ]}>
            Full
          </Text>
          <Text style={[
            styles.statusOptionSubtext, 
            { color: selectedStatus === 'full' ? '#fff' : colors.textSecondary }
          ]}>
            Mark as filled/ready
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Location:</Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedLocationName}</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.step3Header}>
        <View>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Scan {assetConfig?.assetTypePlural || 'Bottles'}</Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Scan multiple {assetConfig?.assetTypePlural || 'bottles'} to mark as {selectedStatus === 'full' ? 'Full' : 'Empty'}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.countBadgeText}>{scannedBottles.length}</Text>
        </View>
      </View>

      {/* Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.summaryItemText, { color: colors.text }]}>{selectedLocationName}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Ionicons 
            name={selectedStatus === 'full' ? 'cube' : 'cube-outline'} 
            size={16} 
            color={selectedStatus === 'full' ? '#22C55E' : '#F59E0B'} 
          />
          <Text style={[styles.summaryItemText, { color: colors.text }]}>
            {selectedStatus === 'full' ? 'Full' : 'Empty'}
          </Text>
        </View>
      </View>

      {/* Scan Button - Only show if scanner is closed */}
      {!scannerVisible && (
        <>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setIsProcessing(false); // Reset processing state when opening scanner
              setScannerVisible(true);
            }}
          >
            <Ionicons name="scan-outline" size={28} color="#fff" />
            <Text style={styles.scanButtonText}>
              {scannedBottles.length > 0 ? 'Scan More' : 'Start Scanning'}
            </Text>
          </TouchableOpacity>
          
          {/* Manual Entry Option */}
          <TouchableOpacity
            style={[styles.manualEntryButton, { borderColor: colors.border }]}
            onPress={() => setManualEntryVisible(true)}
          >
            <Ionicons name="keypad-outline" size={20} color={colors.text} />
            <Text style={[styles.manualEntryText, { color: colors.text }]}>Enter Barcode Manually</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Scanned List */}
      {scannedBottles.length > 0 && (
        <View style={styles.scannedSection}>
          <View style={styles.scannedHeader}>
            <Text style={[styles.scannedTitle, { color: colors.text }]}>
              Scanned ({scannedBottles.length})
            </Text>
            <TouchableOpacity onPress={clearAllBottles}>
              <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scannedList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {scannedBottles.map((item) => (
              <View
                key={item.id}
                style={[styles.scannedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.scannedItemHeader}>
                  <Text style={[styles.scannedItemBarcode, { color: colors.text }]}>{item.barcode_number}</Text>
                  <TouchableOpacity
                    style={[styles.scannedItemRemoveButton, { backgroundColor: colors.error }]}
                    onPress={() => removeBottle(item.id)}
                  >
                    <Text style={styles.scannedItemRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.scannedItemDetails, { color: colors.textSecondary }]}>
                  {item.gas_type || item.group_name || 'Unknown type'}
                </Text>
                <Text style={[styles.scannedItemStatus, { color: colors.textSecondary }]}>
                  Was: {getStatusDisplayText(item.previousStatus)} → Will be: {item.targetStatus === 'full' ? 'Full' : 'Empty'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>
            Locate {assetConfig?.assetDisplayName || 'Cylinder'}
          </Text>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Labels */}
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive, { color: currentStep === 1 ? colors.primary : colors.textSecondary }]}>
            Location
          </Text>
          <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive, { color: currentStep === 2 ? colors.primary : colors.textSecondary }]}>
            Status
          </Text>
          <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive, { color: currentStep === 3 ? colors.primary : colors.textSecondary }]}>
            Scan
          </Text>
        </View>

        {/* Error/Success Messages */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Submit Button - Always visible when on step 3 and bottles are scanned */}
        {currentStep === 3 && scannedBottles.length > 0 && (
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { backgroundColor: isSubmitting ? colors.border : '#22C55E' }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || scannedBottles.length === 0}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Updating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>
                  Save: Mark {scannedBottles.length} as {selectedStatus === 'full' ? 'Full' : 'Empty'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backButton, { borderColor: colors.border }]}
              onPress={goToPreviousStep}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={[styles.navButtonText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 3 && (
            <TouchableOpacity
              style={[
                styles.navButton, 
                styles.nextButton, 
                { 
                  backgroundColor: (currentStep === 1 && selectedLocation) || (currentStep === 2 && selectedStatus) 
                    ? colors.primary 
                    : colors.border,
                  marginLeft: currentStep > 1 ? 12 : 0
                }
              ]}
              onPress={goToNextStep}
              disabled={(currentStep === 1 && !selectedLocation) || (currentStep === 2 && !selectedStatus)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {currentStep === 3 && scannedBottles.length === 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.resetButton, { backgroundColor: colors.textSecondary }]}
              onPress={resetAll}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.nextButtonText}>Start Over</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          scannerActiveRef.current = false;
          setLastScannedBottleDetails(null);
          setScannerVisible(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScanArea
            searchCustomerByName={searchCustomerByName}
            onCustomerFound={handleOcrCustomerFound}
            onScanned={(data: string) => {
              if (scannerVisible && data) {
                logger.log('📷 Barcode scanned in FillCylinderScreen:', data);
                handleBarcodeScanned({ data, bounds: undefined });
              }
            }}
            onClose={() => {
              scannerActiveRef.current = false;
              setLastScannedBottleDetails(null);
              setScannerVisible(false);
              // Use ref - state may be stale if user closes immediately after scanning
              if (!hasScannedBottlesRef.current) {
                setCurrentStep(2);
              }
            }}
            label={selectedStatus === 'full' ? 'Scan Full Bottles' : 'Scan Empty Bottles'}
            validationPattern={/^[\dA-Za-z\-%]+$/}
            style={{ flex: 1 }}
          />
          {/* Scanned Bottle Info Overlay - same style as EnhancedScanScreen */}
          {lastScannedBottleDetails && (
            <View style={styles.scannerBottleDetails} pointerEvents="none">
              <View style={styles.scannerBottleCard}>
                <Text style={styles.scannerBottleBarcode}>
                  {lastScannedBottleDetails.barcode_number}
                </Text>
                <Text style={styles.scannerBottleDescription}>
                  {lastScannedBottleDetails.gas_type || lastScannedBottleDetails.group_name || 'Unknown type'}
                </Text>
                <View style={styles.scannerBottleInfo}>
                  {lastScannedBottleDetails.gas_type && (
                    <Text style={styles.scannerBottleInfoText}>
                      {lastScannedBottleDetails.gas_type}
                    </Text>
                  )}
                  {lastScannedBottleDetails.previousStatus && (
                    <Text style={styles.scannerBottleInfoText}>
                      Was: {getStatusDisplayText(lastScannedBottleDetails.previousStatus)}
                    </Text>
                  )}
                </View>
                <Text style={styles.scannerBottleAction}>
                  ✓ Will be {lastScannedBottleDetails.targetStatus === 'full' ? 'Full' : 'Empty'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Manual Entry Modal - at root so it presents correctly on iOS */}
      <Modal
        visible={manualEntryVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setManualEntryVisible(false);
          setManualEntryBarcode('');
        }}
      >
        <View style={styles.manualEntryModalOverlay}>
          <View style={[styles.manualEntryModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.manualEntryTitle, { color: colors.text }]}>Enter Barcode</Text>
            <TextInput
              style={[styles.manualEntryInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter barcode number"
              placeholderTextColor={colors.textSecondary}
              value={manualEntryBarcode}
              onChangeText={setManualEntryBarcode}
              autoCapitalize="none"
              autoFocus={true}
              keyboardType="default"
            />
            <View style={styles.manualEntryButtons}>
              <TouchableOpacity
                style={[styles.manualEntryCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setManualEntryVisible(false);
                  setManualEntryBarcode('');
                }}
              >
                <Text style={[styles.manualEntryButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualEntrySubmitButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (manualEntryBarcode && manualEntryBarcode.trim()) {
                    handleBarcodeScanned({ data: manualEntryBarcode.trim(), fromManualEntry: true });
                    setManualEntryVisible(false);
                    setManualEntryBarcode('');
                  }
                }}
                disabled={!manualEntryBarcode || !manualEntryBarcode.trim()}
              >
                <Text style={styles.manualEntryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding to ensure submit button is visible
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    // handled by inline styles
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepLabelActive: {
    fontWeight: 'bold',
  },

  // Step Content
  stepContent: {
    flex: 1,
    minHeight: 300,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  step3Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  countBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Location Picker
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerModalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalScroll: {
    maxHeight: 400,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerModalItemText: {
    fontSize: 16,
    flex: 1,
  },
  pickerModalCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading/Empty states
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },

  // Status Options
  statusOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statusOption: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  statusOptionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },

  // Summary Card
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Summary Bar (Step 3)
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  summaryItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 12,
  },

  // Scan Button
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  manualEntryText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Scanned Section
  scannedSection: {
    marginBottom: 16,
  },
  scannedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scannedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scannedList: {
    maxHeight: 300,
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
  scannedItemRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedItemRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scannedItemDetails: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  scannedItemStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  // Scanner overlay - same as EnhancedScanScreen
  scannerBottleDetails: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 500,
  },
  scannerBottleCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#40B5AD',
    minWidth: 260,
  },
  scannerBottleBarcode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#40B5AD',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  scannerBottleDescription: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  scannerBottleInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  scannerBottleInfoText: {
    fontSize: 12,
    color: '#AAA',
  },
  scannerBottleAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Navigation Buttons
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  backButton: {
    borderWidth: 1,
  },
  nextButton: {
    flex: 1,
    justifyContent: 'center',
  },
  resetButton: {
    flex: 1,
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Error/Success Messages
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  successText: {
    color: '#22C55E',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },

  // Scanner Modal
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 20,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    padding: 8,
  },
  scannerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  scannerTip: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scannerTip: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  manualEntryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualEntryModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  manualEntryInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  manualEntryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  manualEntryCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  manualEntrySubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  flashButton: {
    padding: 8,
  },
  scannerToggleButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  scannerToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Scan Frame
  scanFrameContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  scanFrameSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: 280,
    height: 150,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#22C55E',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },

  overlayBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  processingText: {
    color: '#fff',
    fontSize: 14,
  },
  scannedCountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  scannedCountText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastScannedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 16,
  },
  doneButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
