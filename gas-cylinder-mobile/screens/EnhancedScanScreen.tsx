import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, 
  ActivityIndicator, Modal, Dimensions, Alert, SafeAreaView 
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { OfflineStorageService } from '../services/offlineStorage';
import NetInfo from '@react-native-netinfo/netinfo';

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
}

export default function EnhancedScanScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { config } = useAssetConfig();
  const { user, organization } = useAuth();
  
  // State
  const [scannedItems, setScannedItems] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [selectedAction, setSelectedAction] = useState<'in' | 'out' | 'locate' | 'fill'>('in');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0 });
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  // Load offline queue stats
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    const stats = await OfflineStorageService.getQueueStats();
    setSyncStatus({ pending: stats.pending, synced: stats.synced });
  };

  // Handle barcode scan
  const handleBarcodeScan = async (data: string) => {
    if (!data || loading) return;
    
    setLoading(true);
    setIsScanning(false);

    try {
      await processScan(data);
    } catch (error) {
      console.error('Error processing scan:', error);
      Alert.alert('Error', 'Failed to process scan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Process scan (online or offline)
  const processScan = async (barcode: string) => {
    const scanResult: ScanResult = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode: barcode.trim(),
      timestamp: Date.now(),
      action: selectedAction,
      synced: false,
      offline: !isOnline
    };

    // Add to local results immediately
    setScannedItems(prev => [scanResult, ...prev]);

    if (isOnline) {
      try {
        // Try to sync immediately if online
        await syncScanToServer(scanResult);
        
        // Mark as synced
        scanResult.synced = true;
        setScannedItems(prev => 
          prev.map(item => item.id === scanResult.id ? { ...item, synced: true } : item)
        );

      } catch (error) {
        console.error('Failed to sync scan:', error);
        
        // Add to offline queue
        await OfflineStorageService.addToOfflineQueue({
          type: 'scan',
          data: {
            barcode_number: scanResult.barcode,
            action: scanResult.action,
            location: scanResult.location,
            notes: scanResult.notes
          },
          organizationId: organization?.id,
          userId: user?.id
        });
      }
    } else {
      // Add to offline queue
      await OfflineStorageService.addToOfflineQueue({
        type: 'scan',
        data: {
          barcode_number: scanResult.barcode,
          action: scanResult.action,
          location: scanResult.location,
          notes: scanResult.notes
        },
        organizationId: organization?.id,
        userId: user?.id
      });
    }

    await loadSyncStatus();
  };

  // Sync scan to server
  const syncScanToServer = async (scanResult: ScanResult) => {
    const { data, error } = await supabase
      .from('scans')
      .insert([{
        organization_id: organization?.id,
        barcode_number: scanResult.barcode,
        action: scanResult.action,
        location: scanResult.location,
        notes: scanResult.notes,
        scanned_by: user?.id,
        created_at: new Date(scanResult.timestamp).toISOString()
      }]);

    if (error) throw error;

    // Also update bottle status if needed
    if (scanResult.action === 'in' || scanResult.action === 'out') {
      await updateBottleStatus(scanResult.barcode, scanResult.action);
    }
  };

  // Update bottle status
  const updateBottleStatus = async (barcode: string, action: 'in' | 'out') => {
    const status = action === 'in' ? 'available' : 'rented';
    
    const { error } = await supabase
      .from('bottles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('barcode_number', barcode)
      .eq('organization_id', organization?.id);

    if (error) {
      console.error('Error updating bottle status:', error);
    }
  };

  // Manual barcode entry
  const handleManualScan = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    await processScan(manualBarcode);
    setManualBarcode('');
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

  // Render scan item
  const renderScanItem = ({ item }: { item: ScanResult }) => (
    <View style={[styles.scanItem, !item.synced && styles.unsynced]}>
      <View style={styles.scanHeader}>
        <Text style={styles.barcode}>{item.barcode}</Text>
        <View style={styles.statusContainer}>
          {item.offline && (
            <Text style={styles.offlineLabel}>OFFLINE</Text>
          )}
          <Text style={[
            styles.syncStatus,
            { color: item.synced ? '#10B981' : '#F59E0B' }
          ]}>
            {item.synced ? '✓ SYNCED' : '⏳ PENDING'}
          </Text>
        </View>
      </View>
      
      <View style={styles.scanDetails}>
        <Text style={styles.action}>Action: {item.action.toUpperCase()}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
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
          <Text style={styles.permissionText}>Camera permission is required for scanning</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Scanner</Text>
        <View style={styles.statusBar}>
          <View style={[styles.connectionStatus, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.connectionText}>
              {isOnline ? '🌐 ONLINE' : '📱 OFFLINE'}
            </Text>
          </View>
          {syncStatus.pending > 0 && (
            <TouchableOpacity style={styles.syncButton} onPress={syncOfflineData}>
              <Text style={styles.syncButtonText}>
                📤 SYNC ({syncStatus.pending})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Selection */}
      <View style={styles.actionContainer}>
        <Text style={styles.sectionTitle}>Select Action:</Text>
        <View style={styles.actionButtons}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.actionButton,
                selectedAction === action.key && { backgroundColor: action.color }
              ]}
              onPress={() => setSelectedAction(action.key as any)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[
                styles.actionLabel,
                selectedAction === action.key && { color: '#fff' }
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Manual Input */}
      <View style={styles.manualContainer}>
        <Text style={styles.sectionTitle}>Manual Entry:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.barcodeInput}
            placeholder="Enter barcode manually"
            value={manualBarcode}
            onChangeText={setManualBarcode}
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={styles.manualButton} 
            onPress={handleManualScan}
            disabled={loading}
          >
            <Text style={styles.manualButtonText}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Scanner */}
      <View style={styles.cameraContainer}>
        <TouchableOpacity
          style={styles.scannerButton}
          onPress={() => setIsScanning(true)}
          disabled={loading}
        >
          <Text style={styles.scannerButtonText}>
            📷 Open Camera Scanner
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scan Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>
          Recent Scans ({scannedItems.length})
        </Text>
        <FlatList
          data={scannedItems}
          renderItem={renderScanItem}
          keyExtractor={item => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Camera Modal */}
      <Modal visible={isScanning} animationType="slide">
        <View style={styles.cameraModal}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={({ data }) => handleBarcodeScan(data)}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13', 'ean8']
            }}
          />
          
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanInstructions}>
              Point camera at barcode to scan
            </Text>
            
            <TouchableOpacity
              style={styles.closeCameraButton}
              onPress={() => setIsScanning(false)}
            >
              <Text style={styles.closeCameraText}>✕ Close</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  syncButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
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
    bottom: 0,
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
});
