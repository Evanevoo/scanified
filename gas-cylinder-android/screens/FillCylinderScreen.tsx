import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Modal, Alert, ScrollView, FlatList, SafeAreaView, Linking, Vibration, TextInput, Pressable, Dimensions 
} from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { feedbackService } from '../services/feedbackService';
import { soundService } from '../services/soundService';

// Check if Vision Camera is available (requires native modules)
let visionCameraAvailable = false;
let VisionCameraScanner: any = null;

// Only check for Vision Camera if not in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
const { width, height } = Dimensions.get('window');

if (!isExpoGo) {
  try {
    require('react-native-vision-camera');
    visionCameraAvailable = true;
    
    try {
      VisionCameraScanner = require('../components/VisionCameraScanner').default;
      logger.log('✅ Vision Camera scanner available');
    } catch (error) {
      logger.log('⚠️ VisionCameraScanner component not available:', error);
      visionCameraAvailable = false;
    }
  } catch (error) {
    logger.log('⚠️ Vision Camera not available (requires native build)');
    visionCameraAvailable = false;
  }
} else {
  logger.log('ℹ️ Running in Expo Go - Vision Camera not available (requires native build)');
}

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
}

type StatusType = 'empty' | 'full';

export default function FillCylinderScreen() {
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const { settings } = useSettings();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Location selection
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  // Step 2: Status selection
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  
  // Step 3: Scanning
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [cameraZoom, setCameraZoom] = useState(0); // Zoom level (0 = no zoom, max 2x)
  const [focusTrigger, setFocusTrigger] = useState(0); // Used to trigger autofocus on tap
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedBarcodeRef = useRef<string>('');
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualEntryBarcode, setManualEntryBarcode] = useState('');
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    feedbackService.initialize();
    return () => {
      feedbackService.cleanup();
    };
  }, []);

  // Update feedback service settings when app settings change
  useEffect(() => {
    feedbackService.updateSettings({
      soundEnabled: settings.soundEnabled,
      hapticEnabled: settings.vibrationEnabled,
      voiceEnabled: settings.soundEnabled, // Use sound setting for voice too
      volume: 0.8,
    });
  }, [settings.soundEnabled, settings.vibrationEnabled]);

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
      // Auto-open scanner when entering step 3
      await openScanner();
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
  };

  // Check if barcode is within the visual scan frame
  const isBarcodeInScanArea = (bounds: any): boolean => {
    if (!bounds) return true; // Allow if no bounds
    
    const scanFrameWidth = 320;
    const scanFrameHeight = 150;
    const scanFrameTop = 150;
    
    const scanAreaLeft = (width - scanFrameWidth) / 2;
    const scanAreaTop = scanFrameTop;
    const scanAreaRight = scanAreaLeft + scanFrameWidth;
    const scanAreaBottom = scanAreaTop + scanFrameHeight;
    
    const barcodeX = bounds.origin?.x || bounds.x || 0;
    const barcodeY = bounds.origin?.y || bounds.y || 0;
    const barcodeWidth = bounds.size?.width || bounds.width || 0;
    const barcodeHeight = bounds.size?.height || bounds.height || 0;
    
    const barcodeCenterX = barcodeX + (barcodeWidth / 2);
    const barcodeCenterY = barcodeY + (barcodeHeight / 2);
    
    let screenBarcodeX: number;
    let screenBarcodeY: number;
    
    if (barcodeCenterX <= 1 && barcodeCenterY <= 1) {
      screenBarcodeX = barcodeCenterX * width;
      screenBarcodeY = barcodeCenterY * height;
    } else {
      screenBarcodeX = barcodeCenterX;
      screenBarcodeY = barcodeCenterY;
    }
    
    const toleranceX = scanFrameWidth * 0.1;
    const toleranceY = scanFrameHeight * 0.1;
    
    return (
      screenBarcodeX >= (scanAreaLeft - toleranceX) &&
      screenBarcodeX <= (scanAreaRight + toleranceX) &&
      screenBarcodeY >= (scanAreaTop - toleranceY) &&
      screenBarcodeY <= (scanAreaBottom + toleranceY)
    );
  };

  const handleBarcodeScanned = async (event: any) => {
    const barcode = event?.data?.trim();
    if (!barcode) return;

    // Filter by bounds to ensure barcode is within visual scan frame
    if (event?.bounds && !isBarcodeInScanArea(event.bounds)) {
      logger.log('📷 Barcode outside scan area, ignoring');
      return;
    }

    // Prevent duplicate scans within 1.5 seconds (rapid duplicate prevention)
    const now = Date.now();
    if (barcode === lastScannedBarcode && now - lastScanTimeRef.current < 1500) {
      return;
    }

    // Check if already scanned in this session (prevent duplicate barcodes)
    if (scannedBottles.find(b => b.barcode_number === barcode)) {
      await feedbackService.provideFeedback('duplicate', { barcode });
      Vibration.vibrate([0, 100, 50, 100]); // Double vibrate for duplicate
      setError(`Barcode ${barcode} already scanned`);
      setIsProcessing(false);
      return;
    }

    setLastScannedBarcode(barcode);
    lastScanTimeRef.current = now;
    setIsProcessing(true);

    // Play scan sound
    soundService.playSound('scan').catch(err => {
      logger.warn('⚠️ Could not play scan sound:', err);
    });

    try {
      // Look up the bottle in the database - include customer fields
      const { data: bottleData, error: fetchError } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, gas_type, group_name, status, assigned_customer, customer_name, location')
        .eq('organization_id', profile?.organization_id)
        .eq('barcode_number', barcode)
        .maybeSingle();

      if (fetchError) {
        logger.error('Error fetching bottle:', fetchError);
        await feedbackService.provideFeedback('error', { message: 'Database error' });
        setError(`Error looking up ${barcode}`);
        setIsProcessing(false);
        return;
      }

      if (!bottleData) {
        await feedbackService.provideFeedback('error', { message: 'Not found' });
        Vibration.vibrate([0, 200, 100, 200]); // Long vibrate for not found
        setError(`${assetConfig?.assetDisplayName || 'Bottle'} "${barcode}" not found in system`);
        setIsProcessing(false);
        return;
      }

      // Check if scanning as "full" and bottle is still at a customer
      if (selectedStatus === 'full') {
        const isAtCustomer = bottleData.assigned_customer || bottleData.customer_name;
        
        // If bottle has a customer assignment, show warning
        if (isAtCustomer) {
          setIsProcessing(false);
          Alert.alert(
            '⚠️ Bottle Still at Customer',
            `This ${assetConfig?.assetDisplayName?.toLowerCase() || 'bottle'} (${barcode}) is still assigned to customer "${bottleData.customer_name || 'Unknown'}" and was never scanned as empty.\n\nPlease scan it as empty first when it returns from the customer, then scan as full after refilling.`,
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  setIsProcessing(false);
                }
              },
              { 
                text: 'Add Anyway', 
                onPress: () => {
                  // User chose to add anyway - proceed with adding
                  addBottleToScannedList(bottleData);
                }
              }
            ]
          );
          return;
        }
      }

      // Add to scanned list
      addBottleToScannedList(bottleData);

    } catch (err) {
      logger.error('Error processing scan:', err);
      try {
        await feedbackService.provideFeedback('error', { message: 'Scan failed' });
      } catch (feedbackErr) {
        logger.warn('Error providing feedback:', feedbackErr);
      }
      setError('Error processing scan');
      setIsProcessing(false);
    }
  };

  const addBottleToScannedList = (bottleData: any) => {
    const newBottle: ScannedBottle = {
      id: bottleData.id,
      barcode_number: bottleData.barcode_number,
      serial_number: bottleData.serial_number,
      gas_type: bottleData.gas_type,
      group_name: bottleData.group_name,
      previousStatus: bottleData.status,
      previousLocation: bottleData.location,
      scannedAt: new Date()
    };

    setScannedBottles(prev => [newBottle, ...prev]); // Add to top of list
    // Play success sound and haptic feedback
    feedbackService.provideFeedback('success', { barcode: bottleData.barcode_number });
    Vibration.vibrate(100); // Quick vibrate for success
    setError(''); // Clear any previous errors
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
    
    // Track if component is still mounted
    let isMounted = true;

    try {
      let successCount = 0;
      let errorCount = 0;
      let fillRecordFailures = 0;
      const errorMessages: string[] = [];

      for (const bottle of scannedBottles) {
        try {
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

          // Create a status change record for tracking (enables cancel/revert, Bottles for Day, and Movement History)
          const { error: fillErr } = await supabase
            .from('cylinder_fills')
            .insert({
              cylinder_id: bottle.id,
              barcode_number: bottle.barcode_number,
              fill_date: new Date().toISOString(),
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

      if (!isMounted) return; // Component unmounted, don't update state

      setIsSubmitting(false);

      if (successCount > 0) {
        const statusText = selectedStatus === 'full' ? 'Full' : 'Empty';
        const fillWarn = fillRecordFailures > 0 ? `\n\n${fillRecordFailures} could not be recorded in Movement History. Ensure the cylinder_fills migration has been run.` : '';
        if (isMounted) {
          setSuccess(`Successfully marked ${successCount} ${assetConfig?.assetTypePlural || 'bottles'} as ${statusText}${errorCount > 0 ? ` (${errorCount} failed)` : ''}${fillRecordFailures > 0 ? `. ${fillRecordFailures} not recorded in history.` : ''}`);
        }
        
        Alert.alert(
          'Success!',
          `${successCount} ${assetConfig?.assetTypePlural || 'bottles'} marked as ${statusText} at ${selectedLocationName}${errorCount > 0 ? `\n${errorCount} failed` : ''}${fillWarn}`,
          [
            { text: 'Scan More', onPress: () => isMounted && setScannedBottles([]) },
            { text: 'Done', onPress: () => isMounted && resetAll() }
          ]
        );
        
        await feedbackService.batchComplete(successCount);
      } else {
        const errorMsg = `Failed to update any bottles. ${errorCount > 0 ? `All ${errorCount} updates failed.` : 'Please check your connection and try again.'}`;
        const detailedError = errorMessages.length > 0 ? `\n\nErrors:\n${errorMessages.slice(0, 5).join('\n')}${errorMessages.length > 5 ? `\n...and ${errorMessages.length - 5} more` : ''}` : '';
        if (isMounted) {
          setError(errorMsg + detailedError);
        }
        await feedbackService.provideFeedback('error', { message: 'Update failed' });
        Alert.alert(
          'Update Failed',
          errorMsg + detailedError,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      if (!isMounted) return; // Component unmounted, don't update state
      
      setIsSubmitting(false);
      const errorMessage = err?.message || 'An error occurred during submission';
      logger.error('Submission error:', err);
      setError(`Error: ${errorMessage}`);
      
      try {
        await feedbackService.provideFeedback('error', { message: 'Submission error' });
      } catch (feedbackErr) {
        logger.warn('Error providing feedback:', feedbackErr);
      }
      
      Alert.alert(
        'Submission Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const openScanner = async () => {
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
        <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={handleLocationSelect}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="-- Select Location --" value="" />
            {locations.map(location => (
              <Picker.Item 
                key={location.id} 
                label={location.name} 
                value={location.id} 
              />
            ))}
          </Picker>
        </View>
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
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={openScanner}
        >
          <Ionicons name="scan-outline" size={28} color="#fff" />
          <Text style={styles.scanButtonText}>
            {scannedBottles.length > 0 ? 'Scan More' : 'Start Scanning'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Manual Entry Option */}
      {!scannerVisible && (
        <TouchableOpacity
          style={[styles.manualEntryButton, { borderColor: colors.border }]}
          onPress={() => setManualEntryVisible(true)}
        >
          <Ionicons name="keypad-outline" size={20} color={colors.text} />
          <Text style={[styles.manualEntryText, { color: colors.text }]}>Enter Barcode Manually</Text>
        </TouchableOpacity>
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

          <FlatList
            data={scannedBottles}
            keyExtractor={item => item.id}
            style={styles.scannedList}
            renderItem={({ item }) => (
              <View style={[styles.scannedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.scannedItemInfo}>
                  <Text style={[styles.scannedBarcode, { color: colors.text }]}>{item.barcode_number}</Text>
                  <Text style={[styles.scannedDetails, { color: colors.textSecondary }]}>
                    {item.gas_type || item.group_name || 'Unknown type'} • Was: {item.previousStatus || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeBottle(item.id)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />
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
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.fullscreenWrapper}>
          <>
            <Pressable 
              style={styles.fullscreenCamera}
              onPress={(event) => {
                // Tap to focus - Android Expo Camera handles this automatically
              }}
            >
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={flashEnabled}
                  zoom={cameraZoom}
                  barcodeScannerSettings={{
                    barcodeTypes: ['code128', 'code39', 'codabar', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'qr', 'aztec', 'datamatrix', 'pdf417'],
                    regionOfInterest: {
                      x: (width - 320) / 2 / width,
                      y: 150 / height,
                      width: 320 / width,
                      height: 150 / height,
                    },
                  }}
                  onBarcodeScanned={scannerVisible && !isProcessing ? (event: any) => {
                    handleBarcodeScanned(event);
                  } : undefined}
                />
              </Pressable>
              {/* Camera overlay - same as HomeScreen */}
              <View style={styles.cameraOverlay} pointerEvents="none">
                <View style={styles.scanFrame} pointerEvents="none" />
              </View>
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={() => {
                  setScannerVisible(false);
                  if (scannedBottles.length === 0) setCurrentStep(2);
                }}
              >
                <Text style={styles.closeCameraText}>✕ Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scannerFlashButton}
                onPress={() => setFlashEnabled(!flashEnabled)}
              >
                <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={28} color={flashEnabled ? '#FFD700' : '#FFFFFF'} />
              </TouchableOpacity>

              {/* Zoom Controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    setCameraZoom(Math.max(0, cameraZoom - 0.1));
                  }}
                >
                  <Ionicons name="remove-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.zoomText}>{Math.round((1 + cameraZoom) * 100)}%</Text>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    setCameraZoom(Math.min(2, cameraZoom + 0.1));
                  }}
                >
                  <Ionicons name="add-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Locate-specific bottom bar */}
              <View style={styles.locateBottomBar} pointerEvents="box-none">
                {isProcessing && (
                  <View style={styles.processingIndicator}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
                <View style={[styles.scannedCountCard, { backgroundColor: colors.primary }]}>
                  <Ionicons name="cube-outline" size={28} color="#fff" />
                  <Text style={styles.scannedCountText}>
                    {scannedBottles.length} {scannedBottles.length === 1 ? 'Bottle' : 'Bottles'} Scanned
                  </Text>
                </View>
                {lastScannedBarcode ? <Text style={styles.lastScannedText}>Last: {lastScannedBarcode}</Text> : null}
                <TouchableOpacity style={styles.doneButton} onPress={() => setScannerVisible(false)}>
                  <Text style={styles.doneButtonText}>{scannedBottles.length > 0 ? 'Done Scanning' : 'Close Scanner'}</Text>
                </TouchableOpacity>
              </View>
          </>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
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
                    handleBarcodeScanned({ data: manualEntryBarcode.trim() });
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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  picker: {
    height: 50,
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
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  scannedItemInfo: {
    flex: 1,
  },
  scannedBarcode: {
    fontSize: 16,
    fontWeight: '600',
  },
  scannedDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
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

  // Scanner Modal - same layout as HomeScreen
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
    zIndex: 1000,
  },
  closeCameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scannerFlashButton: {
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
    bottom: 180,
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
  locateBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scannerToggleButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  scannerToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
});
