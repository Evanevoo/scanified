import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Modal, 
  Dimensions, Alert, SafeAreaView, TextInput, Linking 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { OfflineStorageService } from '../services/offlineStorage';
import { feedbackService } from '../services/feedbackService';
import { customizationService } from '../services/customizationService';
import { supabase } from '../supabase';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface ScanResult {
  barcode: string;
  action: 'in' | 'out';
  timestamp: number;
  synced: boolean;
}

export default function TrackAboutStyleScanScreen({ route }: { route?: any }) {
  const { orderNumber, customerName, customerId } = route?.params || {};
  const navigation = useNavigation();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'in' | 'out'>('out'); // Default to SHIP
  const [manualEntryModal, setManualEntryModal] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualAction, setManualAction] = useState<'in' | 'out'>('out'); // Default to SHIP
  const [scannedItemsModal, setScannedItemsModal] = useState(false);
  const [lastScannedItemDetails, setLastScannedItemDetails] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    
    // Initialize feedback service
    feedbackService.initialize();
    
    // Check network status
    const checkNetwork = () => {
      setIsOnline(true); // Simplified for now
    };
    checkNetwork();
  }, [permission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    await handleBarcodeScannedWithAction({ data }, selectedAction);
  };

  const lookupItemDetails = async (barcode: string) => {
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select('barcode_number, product_code, description')
        .eq('barcode_number', barcode)
        .single();
      
      if (error) {
        console.log('Item not found in bottles table:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error looking up item details:', error);
      return null;
    }
  };

  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      // Use the manually selected action
      handleBarcodeScannedWithAction({ data: manualBarcode.trim() }, manualAction);
      setManualBarcode('');
      setManualEntryModal(false);
    }
  };

  const handleBarcodeScannedWithAction = async ({ data }: { data: string }, action: 'in' | 'out') => {
    if (isScanning) return;
    
    setIsScanning(true);
    
    try {
      // Play feedback sound and haptic
      await feedbackService.playSound('scan_success');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Look up item details
      const itemDetails = await lookupItemDetails(data);
      setLastScannedItemDetails(itemDetails);
      
      // Check if this barcode was already scanned
      const existingIndex = scannedItems.findIndex(item => item.barcode === data);
      
      if (existingIndex >= 0) {
        // Update existing item with new action
        const updatedItems = [...scannedItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          action: action,
          timestamp: Date.now()
        };
        setScannedItems(updatedItems);
        
        // Show feedback
        Alert.alert(
          'Action Updated',
          `Barcode ${data} switched to ${action === 'out' ? 'SHIP' : 'RETURN'}`,
          [{ text: 'OK' }]
        );
      } else {
        // Add new item
        const newItem: ScanResult = {
          barcode: data,
          action: action,
          timestamp: Date.now(),
          synced: false
        };
        
        setScannedItems(prev => [...prev, newItem]);
        
        // Show feedback
        Alert.alert(
          'Item Scanned',
          `${action === 'out' ? 'SHIP' : 'RETURN'}: ${data}`,
          [{ text: 'OK' }]
        );
      }
      
      // Save to offline storage
      console.log('📱 Saving scan to offline queue:', {
        orderNumber,
        customerName,
        customerId,
        userOrgId: user?.organization_id,
        userId: user?.id
      });
      
      await OfflineStorageService.addToOfflineQueue({
        type: 'scan',
        data: {
          barcode_number: data,
          action: action,
          location: null,
          notes: null,
          order_number: orderNumber,
          customer_name: customerName,
          customer_id: customerId
        },
        organizationId: user?.organization_id || '',
        userId: user?.id || ''
      });
      
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      await feedbackService.playSound('scan_error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDone = () => {
    setScannedItemsModal(true);
  };

  const handleSubmitOrder = async () => {
    try {
      // Sync all offline operations
      await OfflineStorageService.syncOfflineOperations(supabase);
      
      Alert.alert(
        'Order Submitted',
        `${scannedItems.length} items have been synced successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setScannedItemsModal(false);
              navigation.navigate('Home' as never);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('Error', 'Failed to submit order. Please try again.');
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is required to scan barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={async () => {
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
        }}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Returns</Text>
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 'code128', 'pdf417', 'aztec', 'datamatrix', 'itf14',
            ],
            regionOfInterest: {
              x: 0.075, // 7.5% from left
              y: 0.4,   // 40% from top
              width: 0.85, // 85% width
              height: 0.2, // 20% height
            },
          }}
          enableTorch={isFlashlightOn}
        />
        
        {/* Scanning Frame Overlay */}
        <View style={styles.scanningFrame}>
          <View style={styles.scanningBox} />
          <Text style={styles.scanditLabel}>SCANDIT</Text>
        </View>
        
        {/* Detected Info Box */}
        {lastScannedItemDetails && (
          <View style={styles.detectedInfoBox}>
            <Text style={styles.detectedBarcode}>{lastScannedItemDetails.barcode}</Text>
            <Text style={styles.detectedProduct}>{lastScannedItemDetails.product_code || 'Unknown'}</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        {/* Manual Entry Button */}
        <TouchableOpacity 
          style={styles.manualEntryButton}
          onPress={() => setManualEntryModal(true)}
        >
          <Text style={styles.manualEntryIcon}>⌨️</Text>
        </TouchableOpacity>
        
        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.shipButton,
              selectedAction === 'out' && styles.selectedActionButton
            ]}
            onPress={() => setSelectedAction('out')}
          >
            <Text style={styles.actionButtonText}>SHIP</Text>
            <Text style={styles.actionButtonCount}>
              {scannedItems.filter(item => item.action === 'out').length}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.returnButton,
              selectedAction === 'in' && styles.selectedActionButton
            ]}
            onPress={() => setSelectedAction('in')}
          >
            <Text style={styles.actionButtonText}>RETURN</Text>
            <Text style={styles.actionButtonCount}>
              {scannedItems.filter(item => item.action === 'in').length}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Flashlight Button */}
        <TouchableOpacity 
          style={styles.flashlightButton}
          onPress={() => setIsFlashlightOn(!isFlashlightOn)}
        >
          <Text style={styles.flashlightIcon}>
            {isFlashlightOn ? 'FLASH ON' : 'FLASH OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Manual Entry Modal */}
      <Modal
        visible={manualEntryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setManualEntryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Barcode Entry</Text>
            
            <TextInput
              style={styles.barcodeInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode"
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleManualEntry}
            />
            
            {/* Action Selection */}
            <Text style={styles.actionSelectionTitle}>Select Action:</Text>
            <View style={styles.actionSelectionButtons}>
              <TouchableOpacity 
                style={[
                  styles.actionSelectionButton,
                  manualAction === 'out' && styles.selectedActionSelectionButton
                ]}
                onPress={() => setManualAction('out')}
              >
                <Text style={[
                  styles.actionSelectionButtonText,
                  manualAction === 'out' && styles.selectedActionSelectionButtonText
                ]}>SHIP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionSelectionButton,
                  manualAction === 'in' && styles.selectedActionSelectionButton
                ]}
                onPress={() => setManualAction('in')}
              >
                <Text style={[
                  styles.actionSelectionButtonText,
                  manualAction === 'in' && styles.selectedActionSelectionButtonText
                ]}>RETURN</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setManualEntryModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleManualEntry}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scanned Items Modal */}
      <Modal
        visible={scannedItemsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setScannedItemsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scanned Items ({scannedItems.length})</Text>
            
            <View style={styles.scannedItemsList}>
              {scannedItems.map((item, index) => (
                <View key={index} style={styles.scannedItem}>
                  <Text style={styles.scannedItemBarcode}>{item.barcode}</Text>
                  <Text style={styles.scannedItemAction}>
                    {item.action === 'out' ? 'SHIP' : 'RETURN'}
                  </Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.submitOrderButton}
              onPress={handleSubmitOrder}
            >
              <Text style={styles.submitOrderButtonText}>Submit Order</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setScannedItemsModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 0,
  },
  scanningFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -100 }],
    width: 300,
    height: 200,
  },
  scanningBox: {
    width: 300,
    height: 200,
    borderWidth: 3,
    borderColor: '#FF0000',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanditLabel: {
    position: 'absolute',
    right: -60,
    top: '50%',
    color: '#FF0000',
    fontSize: 12,
    fontWeight: 'bold',
    transform: [{ translateY: -10 }],
  },
  detectedInfoBox: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 8,
    padding: 12,
  },
  detectedBarcode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detectedProduct: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#000',
  },
  manualEntryButton: {
    width: 50,
    height: 50,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEntryIcon: {
    fontSize: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    width: 80,
    height: 80,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shipButton: {
    // Default ship button style
  },
  returnButton: {
    borderColor: '#FF0000',
  },
  selectedActionButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonCount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  flashlightButton: {
    width: 50,
    height: 50,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashlightIcon: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  barcodeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  actionSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  actionSelectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionSelectionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  selectedActionSelectionButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionSelectionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedActionSelectionButtonText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  scannedItemsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  scannedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scannedItemBarcode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannedItemAction: {
    fontSize: 14,
    color: '#666',
  },
  submitOrderButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalButton: {
    padding: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
