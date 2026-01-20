import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Modal, Alert, ScrollView, FlatList, SafeAreaView, Linking, Vibration 
} from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { feedbackService } from '../services/feedbackService';

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
  scannedAt: Date;
}

type StatusType = 'empty' | 'filled';

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
  const lastScanTimeRef = useRef<number>(0);
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      if (!profile?.organization_id) {
        setLoadingLocations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', profile.organization_id)
          .order('name');

        if (error) {
          logger.error('Error fetching locations:', error);
          setLocations([]);
        } else {
          setLocations(data || []);
        }
      } catch (err) {
        logger.error('Error fetching locations:', err);
        setLocations([]);
      }
      setLoadingLocations(false);
    };

    fetchLocations();
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

  const handleBarcodeScanned = async (event: any) => {
    const barcode = event?.data?.trim();
    if (!barcode) return;

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
      if (selectedStatus === 'filled') {
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
      await feedbackService.provideFeedback('error', { message: 'Scan failed' });
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

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const bottle of scannedBottles) {
        try {
          // First, get current bottle data to preserve fill_count
          const { data: currentBottle, error: fetchError } = await supabase
            .from('bottles')
            .select('fill_count, organization_id')
            .eq('id', bottle.id)
            .single();

          if (fetchError) {
            logger.error(`Failed to fetch bottle ${bottle.barcode_number}:`, fetchError);
            errorCount++;
            continue;
          }

          // Update bottle status and location
          const updateData: any = {
            status: selectedStatus,
            location: selectedLocation, // This is the location ID
            last_location_update: new Date().toISOString()
          };

          // If marking as filled, also update fill count and last filled date
          if (selectedStatus === 'filled') {
            updateData.last_filled_date = new Date().toISOString();
            updateData.fill_count = (currentBottle?.fill_count || 0) + 1;
          }

          // Ensure organization_id is included for RLS
          if (currentBottle?.organization_id) {
            updateData.organization_id = currentBottle.organization_id;
          }

          const { error: updateError } = await supabase
            .from('bottles')
            .update(updateData)
            .eq('id', bottle.id)
            .eq('organization_id', profile?.organization_id || currentBottle?.organization_id);

          if (updateError) {
            logger.error(`Failed to update ${bottle.barcode_number}:`, updateError);
            logger.error('Update data was:', updateData);
            errorCount++;
            continue;
          }

          // Create a status change record for tracking
          try {
            await supabase
              .from('cylinder_fills')
              .insert({
                cylinder_id: bottle.id,
                barcode_number: bottle.barcode_number,
                fill_date: new Date().toISOString(),
                filled_by: 'mobile_app',
                notes: `Bulk ${selectedStatus === 'filled' ? 'fill' : 'empty'} at ${selectedLocationName}`
              });
          } catch (fillErr) {
            logger.warn(`Could not create fill record for ${bottle.barcode_number}:`, fillErr);
            // Non-critical, continue
          }

          successCount++;
        } catch (err) {
          logger.error(`Error processing ${bottle.barcode_number}:`, err);
          errorCount++;
        }
      }

      setIsSubmitting(false);

      if (successCount > 0) {
        const statusText = selectedStatus === 'filled' ? 'Full' : 'Empty';
        setSuccess(`Successfully marked ${successCount} ${assetConfig?.assetTypePlural || 'bottles'} as ${statusText}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        
        Alert.alert(
          'Success!',
          `${successCount} ${assetConfig?.assetTypePlural || 'bottles'} marked as ${statusText} at ${selectedLocationName}${errorCount > 0 ? `\n${errorCount} failed` : ''}`,
          [
            { text: 'Scan More', onPress: () => setScannedBottles([]) },
            { text: 'Done', onPress: resetAll }
          ]
        );
        
        feedbackService.success('Bulk update complete');
      } else {
        const errorMsg = `Failed to update any bottles. ${errorCount > 0 ? `All ${errorCount} updates failed.` : 'Please check your connection and try again.'}`;
        setError(errorMsg);
        feedbackService.error('Update failed');
        Alert.alert(
          'Update Failed',
          errorMsg,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      setIsSubmitting(false);
      setError('An error occurred during submission');
      feedbackService.error('Submission error');
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
              backgroundColor: selectedStatus === 'filled' ? '#22C55E' : colors.surface,
              borderColor: selectedStatus === 'filled' ? '#22C55E' : colors.border
            }
          ]}
          onPress={() => handleStatusSelect('filled')}
        >
          <Ionicons 
            name="cube" 
            size={48} 
            color={selectedStatus === 'filled' ? '#fff' : '#22C55E'} 
          />
          <Text style={[
            styles.statusOptionText, 
            { color: selectedStatus === 'filled' ? '#fff' : colors.text }
          ]}>
            Full
          </Text>
          <Text style={[
            styles.statusOptionSubtext, 
            { color: selectedStatus === 'filled' ? '#fff' : colors.textSecondary }
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
            Scan multiple {assetConfig?.assetTypePlural || 'bottles'} to mark as {selectedStatus === 'filled' ? 'Full' : 'Empty'}
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
            name={selectedStatus === 'filled' ? 'cube' : 'cube-outline'} 
            size={16} 
            color={selectedStatus === 'filled' ? '#22C55E' : '#F59E0B'} 
          />
          <Text style={[styles.summaryItemText, { color: colors.text }]}>
            {selectedStatus === 'filled' ? 'Full' : 'Empty'}
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
                  Save: Mark {scannedBottles.length} as {selectedStatus === 'filled' ? 'Full' : 'Empty'}
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
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={flashEnabled}
            barcodeScannerSettings={{}}
            onBarcodeScanned={handleBarcodeScanned}
          />

          {/* Scanner Overlay */}
          <View style={styles.scannerOverlay}>
            {/* Top dark area */}
            <View style={styles.overlayTop}>
              <SafeAreaView>
                <View style={styles.scannerHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setScannerVisible(false);
                      // If no bottles scanned, go back to step 2
                      if (scannedBottles.length === 0) {
                        setCurrentStep(2);
                      }
                    }}
                  >
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.scannerInfo}>
                    <Text style={styles.scannerTitle}>Scan {assetConfig?.assetTypePlural || 'Bottles'}</Text>
                    <Text style={styles.scannerSubtitle}>
                      {selectedLocationName} • {selectedStatus === 'filled' ? 'Full' : 'Empty'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.flashButton}
                    onPress={() => setFlashEnabled(!flashEnabled)}
                  >
                    <Ionicons 
                      name={flashEnabled ? 'flash' : 'flash-off'} 
                      size={24} 
                      color={flashEnabled ? '#FFD700' : '#fff'} 
                    />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>

            {/* Scan frame area */}
            <View style={styles.scanFrameContainer}>
              <View style={styles.scanFrameSide} />
              <View style={styles.scanFrame}>
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </View>
              <View style={styles.scanFrameSide} />
            </View>


            {/* Bottom area with count */}
            <View style={styles.overlayBottom}>
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

              {lastScannedBarcode && (
                <Text style={styles.lastScannedText}>
                  Last: {lastScannedBarcode}
                </Text>
              )}

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setScannerVisible(false)}
              >
                <Text style={styles.doneButtonText}>
                  {scannedBottles.length > 0 ? 'Done Scanning' : 'Close Scanner'}
                </Text>
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
  flashButton: {
    padding: 8,
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
