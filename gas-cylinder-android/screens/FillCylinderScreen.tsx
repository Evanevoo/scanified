import logger from '../utils/logger';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView, FlatList, SafeAreaView, Linking } from 'react-native';
import { supabase } from '../supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';

interface ScannedAsset {
  id: string;
  barcode_number: string;
  serial_number: string;
  gas_type?: string;
  group_name?: string;
  status?: string;
  fill_count?: number;
  last_filled_date?: string;
  scannedAt: Date;
}

export default function FillCylinderScreen() {
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [serial, setSerial] = useState('');
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedAssets, setScannedAssets] = useState<ScannedAsset[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bottles, setBottles] = useState([]);
  const [barcodeSuggestions, setBarcodeSuggestions] = useState([]);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);
  const scanDelay = 1500;

  // Fetch bottles for barcode suggestions
  React.useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from('bottles')
        .select('barcode_number')
        .eq('organization_id', profile.organization_id)
        .order('barcode_number')
        .then(({ data, error }) => {
          if (!error && data) {
            setBottles(data);
          }
        });
    }
  }, [profile]);

  // Filter barcode suggestions
  React.useEffect(() => {
    if (barcode.trim() && bottles.length > 0) {
      const searchText = barcode.toLowerCase();
      const filtered = bottles
        .filter(bottle =>
          bottle.barcode_number &&
          bottle.barcode_number.toLowerCase().includes(searchText) &&
          bottle.barcode_number.toLowerCase() !== searchText
        )
        .slice(0, 5);
      setBarcodeSuggestions(filtered);
      setShowBarcodeSuggestions(filtered.length > 0);
    } else {
      setBarcodeSuggestions([]);
      setShowBarcodeSuggestions(false);
    }
  }, [barcode, bottles]);

  const handleBarcodeScanned = (event) => {
    // Only accept barcodes within the border area if boundingBox is available
    const border = {
      top: 0.41, left: 0.05, width: 0.9, height: 0.18
    };
    if (event?.boundingBox) {
      const { origin, size } = event.boundingBox;
      const centerX = origin.x + size.width / 2;
      const centerY = origin.y + size.height / 2;
      if (
        centerX < border.left ||
        centerX > border.left + border.width ||
        centerY < border.top ||
        centerY > border.top + border.height
      ) {
        // Barcode is outside the border, ignore
        return;
      }
    }
    setScanned(true);
    setTimeout(() => setScanned(false), scanDelay);
    setBarcode(event.data);
    setScannerVisible(false);
    fetchAsset(event.data, 'barcode');
  };

  const fetchAsset = async (value: string, type: 'barcode' | 'serial') => {
    if (!profile?.organization_id && !authLoading) {
      setError('Organization not found');
      return;
    }

    setLoading(true);
    setError('');
    setAsset(null);
    setSuccess('');
    
    let query;
    if (type === 'barcode') {
      query = supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('barcode_number', value);
    } else {
      query = supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('serial_number', value);
    }
    
    const { data, error } = await query.single();
    
    setLoading(false);
    if (error || !data) {
      setError(`${assetConfig.assetDisplayName} not found with ${type === 'barcode' ? 'barcode' : 'serial'}: ${value}`);
      return;
    }
    setAsset(data);
  };

  const addToBulkList = () => {
    if (!asset) return;
    
        // Check if already in list
    const exists = scannedAssets.find(c => c.id === asset.id);
    if (exists) {
      setError(`This ${assetConfig.assetType} is already in the bulk list.`);
      return;
    }

    const newAsset: ScannedAsset = {
      ...asset,
      scannedAt: new Date()
    };

    setScannedAssets([...scannedAssets, newAsset]);
    setSuccess(`Added ${asset.barcode_number} to bulk list. Total: ${scannedAssets.length + 1}`);
    setAsset(null);
    setBarcode('');
    setSerial('');
    setError('');
  };

  const removeFromBulkList = (id: string) => {
    setScannedAssets(scannedAssets.filter(c => c.id !== id));
  };

  const clearBulkList = () => {
    setScannedAssets([]);
    setSuccess('Bulk list cleared.');
  };

  const handleBulkFill = async () => {
    if (scannedAssets.length === 0) {
      setError(`No ${assetConfig.assetTypePlural} in bulk list.`);
      return;
    }
    
    setBulkLoading(true);
    setError('');
    setSuccess('');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const asset of scannedAssets) {
        try {
                // Update asset status to filled
      const { error: updateError } = await supabase
        .from('bottles')
        .update({ 
          status: 'filled',
          last_filled_date: new Date().toISOString(),
          fill_count: (asset.fill_count || 0) + 1
        })
        .eq('id', asset.id);
          
          if (updateError) {
            logger.error(`Failed to update asset ${asset.barcode_number}:`, updateError);
            errorCount++;
            continue;
          }
          
          // Create a fill record
          const { error: fillError } = await supabase
            .from('cylinder_fills')
            .insert({
              cylinder_id: asset.id,
              barcode_number: asset.barcode_number,
              fill_date: new Date().toISOString(),
              filled_by: 'mobile_app',
              notes: 'Bulk refill operation'
            });
          
          if (fillError) {
            logger.warn(`Could not create fill record for ${asset.barcode_number}:`, fillError);
            // Don't fail the operation if fill record creation fails
          }
          
          successCount++;
        } catch (err) {
          logger.error(`Error processing asset ${asset.barcode_number}:`, err);
          errorCount++;
        }
      }
      
      setBulkLoading(false);
      
      if (successCount > 0) {
        setSuccess(`Successfully filled ${successCount} cylinders${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setScannedAssets([]);
        
        Alert.alert(
          'Bulk Fill Complete',
          `Successfully filled ${successCount} cylinders${errorCount > 0 ? `\n${errorCount} cylinders failed` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        setError('Failed to fill any cylinders. Please try again.');
      }
      
    } catch (err) {
      setBulkLoading(false);
      setError('An error occurred during bulk fill operation.');
    }
  };

  const handleFillCylinder = async () => {
    if (!asset) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update cylinder status to filled
      const { error: updateError } = await supabase
        .from('bottles')
        .update({ 
          status: 'filled',
          last_filled_date: new Date().toISOString(),
          fill_count: (asset.fill_count || 0) + 1
        })
        .eq('id', asset.id);
      
      if (updateError) {
        setError('Failed to update cylinder status.');
        return;
      }
      
      // Create a fill record
      const { error: fillError } = await supabase
        .from('cylinder_fills')
        .insert({
          cylinder_id: asset.id,
          barcode_number: asset.barcode_number,
          fill_date: new Date().toISOString(),
          filled_by: 'mobile_app',
          notes: 'Refilled after customer return'
        });
      
      if (fillError) {
        logger.warn('Could not create fill record:', fillError);
        // Don't fail the operation if fill record creation fails
      }
      
      setSuccess(`${assetConfig?.assetDisplayName || 'Asset'} has been refilled and is ready for rental!`);
      setAsset(null);
      setBarcode('');
      setSerial('');
      
      // Show success alert
      Alert.alert(
        'Refill Complete',
        `The ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'} has been refilled and is now ready for rental.`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      setError(`An error occurred while refilling the ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'}.`);
    }
    
    setLoading(false);
  };

  const handleMarkEmpty = async () => {
    if (!asset) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update cylinder status to empty
      const { error: updateError } = await supabase
        .from('bottles')
        .update({ 
          status: 'empty'
        })
        .eq('id', asset.id);
      
      if (updateError) {
        setError('Failed to update cylinder status.');
        return;
      }
      
      // Create a fill record for tracking
      const { error: fillError } = await supabase
        .from('cylinder_fills')
        .insert({
          cylinder_id: asset.id,
          barcode_number: asset.barcode_number,
          fill_date: new Date().toISOString(),
          filled_by: 'mobile_app',
          notes: 'Marked as empty'
        });
      
      if (fillError) {
        logger.warn('Could not create fill record:', fillError);
        // Don't fail the operation if fill record creation fails
      }
      
      setSuccess(`${assetConfig?.assetDisplayName || 'Asset'} has been marked as empty.`);
      setAsset(null);
      setBarcode('');
      setSerial('');
      
      // Show success alert
      Alert.alert(
        'Status Updated',
        `The ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'} has been marked as empty.`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      setError(`An error occurred while updating the ${assetConfig?.assetDisplayName?.toLowerCase() || 'asset'} status.`);
    }
    
    setLoading(false);
  };

  const handleManualSubmit = async () => {
    if (!barcode.trim() && !serial.trim()) {
      setError('Please enter a barcode or serial number.');
      return;
    }
    
    if (barcode.trim()) {
      // First validate that the barcode exists in the system
      try {
        const { data: bottleData, error } = await supabase
          .from('bottles')
          .select('barcode_number')
          .eq('barcode_number', barcode.trim())
          .eq('organization_id', organization?.id)
          .maybeSingle();

        if (error) {
          logger.error('Error validating barcode:', error);
          setError('Failed to validate barcode. Please try again.');
          return;
        }

        if (!bottleData) {
          setError(`The barcode "${barcode.trim()}" is not in the system. Please check the barcode or contact your administrator.`);
          return;
        }

        // Barcode exists, proceed with fetch
        fetchAsset(barcode.trim(), 'barcode');
      } catch (error) {
        logger.error('Error validating barcode:', error);
        setError('Failed to validate barcode. Please try again.');
      }
    } else if (serial.trim()) {
      fetchAsset(serial.trim(), 'serial');
    }
  };

  const resetForm = () => {
    setBarcode('');
    setSerial('');
    setAsset(null); // Changed from setCylinder to setAsset
    setError('');
    setSuccess('');
  };

  const renderBulkItem = ({ item }: { item: ScannedAsset }) => ( // Changed from ScannedCylinder to ScannedAsset
    <View style={styles.bulkItem}>
      <View style={styles.bulkItemInfo}>
        <Text style={styles.bulkItemBarcode}>{item.barcode_number}</Text>
        <Text style={styles.bulkItemSerial}>Serial: {item.serial_number}</Text>
        <Text style={styles.bulkItemGas}>Gas: {item.gas_type || item.group_name || 'Unknown'}</Text>
        <Text style={styles.bulkItemStatus}>Status: {item.status || 'Unknown'}</Text>
      </View>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeFromBulkList(item.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Update {assetConfig?.assetDisplayName || 'Asset'} Status</Text>
        <Text style={styles.subtitle}>Scan or enter {assetConfig?.assetDisplayName?.toLowerCase() || 'asset'} details to mark as full or empty</Text>
      
      {/* Bulk Operations Section */}
      {scannedAssets.length > 0 && (
        <View style={styles.bulkSection}>
          <View style={styles.bulkHeader}>
            <Text style={styles.bulkTitle}>Bulk Fill List ({scannedAssets.length})</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearBulkList}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={scannedAssets}
            renderItem={renderBulkItem}
            keyExtractor={(item) => item.id}
            style={styles.bulkList}
            scrollEnabled={false}
          />
          
          <TouchableOpacity 
            style={[styles.bulkFillButton, bulkLoading && styles.bulkFillButtonDisabled]} 
            onPress={handleBulkFill}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bulkFillButtonText}>Fill All {scannedAssets.length} {assetConfig?.assetTypePlural || 'Assets'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.scanButton} onPress={() => setScannerVisible(true)}>
                  <Text style={styles.scanButtonText}>SCAN {assetConfig?.assetDisplayName?.toUpperCase() || 'ASSET'}</Text>
      </TouchableOpacity>
      
      <View style={[styles.inputSection, { position: 'relative', zIndex: 1 }]}>
        <Text style={styles.inputLabel}>Barcode Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Scan or enter barcode"
          value={barcode}
          onChangeText={setBarcode}
          autoCapitalize="none"
        />
        {/* Barcode Suggestions */}
        {showBarcodeSuggestions && barcodeSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView style={{ maxHeight: 150 }}>
              {barcodeSuggestions.map((bottle, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setBarcode(bottle.barcode_number);
                    setShowBarcodeSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{bottle.barcode_number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Serial Number Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Serial Number (Alternative)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter serial number"
          value={serial}
          onChangeText={setSerial}
          autoCapitalize="none"
        />
      </View>
      
      <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit} disabled={loading}>
                  <Text style={styles.submitButtonText}>Find {assetConfig?.assetDisplayName || 'Asset'}</Text>
      </TouchableOpacity>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      
      {/* Cylinder Details */}
      {asset && ( // Changed from cylinder to asset
        <View style={styles.cylinderDetails}>
          <Text style={styles.detailsTitle}>Cylinder Details</Text>
          <Text style={styles.detailRow}>Barcode: <Text style={styles.detailValue}>{asset.barcode_number}</Text></Text>
          <Text style={styles.detailRow}>Serial: <Text style={styles.detailValue}>{asset.serial_number}</Text></Text>
          <Text style={styles.detailRow}>Gas Type: <Text style={styles.detailValue}>{asset.gas_type || asset.group_name}</Text></Text>
          <Text style={styles.detailRow}>Current Status: <Text style={[styles.detailValue, styles.statusText]}>{asset.status || 'Unknown'}</Text></Text>
          <Text style={styles.detailRow}>Previous Fill Count: <Text style={styles.detailValue}>{asset.fill_count || 0}</Text></Text>
          {asset.last_filled_date && (
            <Text style={styles.detailRow}>Last Filled: <Text style={styles.detailValue}>
              {new Date(asset.last_filled_date).toLocaleDateString()}
            </Text></Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.fillButton, asset.status === 'filled' && styles.fillButtonDisabled]} 
              onPress={handleFillCylinder} 
              disabled={loading || asset.status === 'filled'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.fillButtonText}>
                  {asset.status === 'filled' ? 'Already Full' : 'Mark as Full'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.emptyButton, asset.status === 'empty' && styles.emptyButtonDisabled]} 
              onPress={handleMarkEmpty} 
              disabled={loading || asset.status === 'empty'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emptyButtonText}>
                  {asset.status === 'empty' ? 'Already Empty' : 'Mark as Empty'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.addToBulkButton} 
            onPress={addToBulkList}
            disabled={scannedAssets.find(c => c.id === asset.id)}
          >
            <Text style={styles.addToBulkButtonText}>
              {scannedAssets.find(c => c.id === asset.id) ? 'Already in List' : 'Add to Bulk List'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Text style={styles.resetButtonText}>Reset Form</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Camera Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.modalBackIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scan Barcode</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {!permission ? (
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Camera access is required to scan barcodes</Text>
              <TouchableOpacity onPress={async () => {
                const result = await requestPermission();
                if (!result.granted && result.canAskAgain === false) {
                  Alert.alert(
                    'Camera Permission',
                    'Please enable camera access in your device settings to use the scanner.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                  );
                }
              }} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "codabar", "itf14"],
                }}
              />
              {/* Overlay border rectangle */}
              <View style={styles.scanOverlay} />
            </View>
          )}
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close Scanner</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#40B5AD',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#ff5a1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  success: {
    color: '#22c55e',
    marginBottom: 8,
    textAlign: 'center',
  },
  cylinderDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailRow: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#40B5AD',
  },
  statusText: {
    fontWeight: 'bold',
    color: '#22c55e',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  fillButton: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  fillButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  fillButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  emptyButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#6b7280',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: '41%',
    left: '5%',
    width: '90%',
    height: '18%',
    borderWidth: 3,
    borderColor: '#40B5AD',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#40B5AD',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bulkSection: {
    marginBottom: 24,
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#40B5AD',
  },
  clearButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bulkList: {
    marginBottom: 16,
  },
  bulkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  bulkItemInfo: {
    flex: 1,
  },
  bulkItemBarcode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#40B5AD',
  },
  bulkItemSerial: {
    fontSize: 16,
    color: '#333',
  },
  bulkItemGas: {
    fontSize: 16,
    color: '#333',
  },
  bulkItemStatus: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    color: '#40B5AD',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bulkFillButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  bulkFillButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  bulkFillButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addToBulkButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addToBulkButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#222',
  },
}); 