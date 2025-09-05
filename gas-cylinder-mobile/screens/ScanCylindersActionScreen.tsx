import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TextInput, Vibration, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase';
import { SyncService } from '../services/SyncService';
import { useTheme } from '../context/ThemeContext';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import ScanOverlay from '../components/ScanOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormatValidationService } from '../services/FormatValidationService';
import { Platform } from '../utils/platform';

const { width } = Dimensions.get('window');

export default function ScanCylindersActionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { customer, orderNumber } = route.params as { customer?: any; orderNumber?: string } || {};
  const { colors } = useTheme();
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState('SHIP'); // 'SHIP' or 'RETURN'
  const [shipCount, setShipCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedShip, setScannedShip] = useState<string[]>([]);
  const [scannedReturn, setScannedReturn] = useState<string[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualMode, setManualMode] = useState('SHIP');
  const [manualError, setManualError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasUserClosedCamera, setHasUserClosedCamera] = useState(false);
  const [formatConfig, setFormatConfig] = useState<any>(null);

  const isValidBarcode = (barcode: string) => {
    // Enhanced validation with better error messages
    if (!barcode || typeof barcode !== 'string') return false;
    const trimmed = barcode.trim();
    
    // Use organization format configuration if available
    if (formatConfig?.barcode_format?.enabled) {
      try {
        const regex = new RegExp(formatConfig.barcode_format.pattern);
        if (!regex.test(trimmed)) return false;
      } catch (error) {
        console.warn('Invalid regex pattern in barcode config:', error);
        // Fall back to basic validation
      }
    } else {
      // Fall back to default validation (9-digit numeric pattern)
      if (!/^\d{9}$/.test(trimmed)) return false;
    }
    
    // Additional validation - check for common invalid patterns
    if (trimmed === '000000000' || trimmed === '123456789') return false;
    
    return true;
  };

  // Load format configuration
  useEffect(() => {
    loadFormatConfig();
  }, [profile]);

  const loadFormatConfig = async () => {
    try {
      if (!profile?.organization_id) return;

      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('format_configuration')
        .eq('id', profile.organization_id)
        .single();

      if (error) {
        console.warn('Error loading format configuration:', error);
        return;
      }

      if (orgData?.format_configuration) {
        setFormatConfig(orgData.format_configuration);
      }
    } catch (error) {
      console.warn('Error loading format configuration:', error);
    }
  };

  // Check connectivity and offline status
  useEffect(() => {
    checkConnectivity();
    loadOfflineCount();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      checkConnectivity();
      loadOfflineCount();
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Auto-open camera when screen loads - DISABLED to show full interface
  // useEffect(() => {
  //   if (permission?.granted && !scannerVisible && !hasUserClosedCamera) {
  //     // Open camera immediately when permission is granted
  //     setScannerVisible(true);
  //   }
  // }, [permission?.granted, scannerVisible, hasUserClosedCamera]);

  const checkConnectivity = async () => {
    const connected = await SyncService.checkConnectivity();
    setIsConnected(connected);
  };

  const loadOfflineCount = async () => {
    const count = await SyncService.getOfflineScanCount();
    setOfflineCount(count);
  };

  const playBeep = async () => {
    try {
      // Enhanced feedback with different patterns
      if (scanError) {
        // Error pattern: multiple short vibrations
        Vibration.vibrate([50, 50, 50, 50, 100]);
      } else {
        // Success pattern: single strong vibration
        Vibration.vibrate(100);
      }
    } catch (error) {
      console.log('Vibration failed:', error);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const barcode = data.trim();
    
    if (!isValidBarcode(barcode)) {
      const errorMessage = formatConfig?.barcode_format?.enabled 
        ? `Invalid barcode: ${formatConfig.barcode_format.description}`
        : 'Invalid barcode: must be exactly 9 numbers';
      setScanError(errorMessage);
      setScanned(true);
      playBeep();
      setTimeout(() => {
        setScanned(false);
        setScanError('');
      }, 2000);
      return;
    }

    // Check if already scanned
    if (scannedShip.includes(barcode) || scannedReturn.includes(barcode)) {
      setScanError('Barcode already scanned');
      setScanned(true);
      playBeep();
      setTimeout(() => {
        setScanned(false);
        setScanError('');
      }, 2000);
      return;
    }

    // Add to appropriate list based on current mode
    if (mode === 'SHIP') {
      setScannedShip(list => [...list, barcode]);
      setShipCount(count => count + 1);
    } else {
      setScannedReturn(list => [...list, barcode]);
      setReturnCount(count => count + 1);
    }

    setLastScanned(barcode);
    setScanned(true);
    playBeep();
    setTimeout(() => setScanned(false), 1500);
  };

  const handleManualSubmit = () => {
    const barcode = manualBarcode.trim();
    if (!isValidBarcode(barcode)) {
      const errorMessage = formatConfig?.barcode_format?.enabled 
        ? `Invalid barcode: ${formatConfig.barcode_format.description}`
        : 'Invalid barcode: must be exactly 9 numbers';
      setManualError(errorMessage);
      return;
    }

    // Check if already scanned
    if (scannedShip.includes(barcode) || scannedReturn.includes(barcode)) {
      setManualError('Barcode already scanned');
      return;
    }

    // Add to appropriate list based on manual mode
    if (manualMode === 'SHIP') {
      setScannedShip(list => [...list, barcode]);
      setShipCount(count => count + 1);
    } else {
      setScannedReturn(list => [...list, barcode]);
      setReturnCount(count => count + 1);
    }

    setManualBarcode('');
    setManualError('');
    setShowManual(false);
  };

  const handleFinishAndSync = async () => {
    setShowConfirm(false);
    setSyncing(true);
    setSyncResult('');

    try {
      // Check connectivity first
      await checkConnectivity();

      // Get user ID first
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!isConnected) {
        // Save scans offline
        const allBarcodes = [
          ...scannedShip.map(bc => ({ 
            order_number: orderNumber, 
            bottle_barcode: bc, 
            mode: 'SHIP',
            customer_id: customer?.id,
            location: customer?.location || 'Unknown',
            user_id: userId
          })),
          ...scannedReturn.map(bc => ({ 
            order_number: orderNumber, 
            bottle_barcode: bc, 
            mode: 'RETURN',
            customer_id: customer?.id,
            location: customer?.location || 'Unknown',
            user_id: userId
          })),
        ];

        // Save each scan offline
        for (const scan of allBarcodes) {
          try {
            const existingData = await AsyncStorage.getItem('offline_scans');
            const scans = existingData ? JSON.parse(existingData) : [];
            scans.push({
              ...scan,
              timestamp: new Date().toISOString(),
            });
            await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));
          } catch (error) {
            console.error('Error saving offline scan:', error);
          }
        }

        await loadOfflineCount();
        setSyncResult(`Saved ${allBarcodes.length} scans offline. Will sync when connection is restored.`);
        
        // Clear the scanned lists
        setScannedShip([]);
        setScannedReturn([]);
        setShipCount(0);
        setReturnCount(0);
        setLastScanned('');
      } else {
        // Online - sync immediately
        if (!profile?.organization_id) {
          setSyncResult('Error: No organization found');
          setSyncing(false);
          return;
        }

        const allBarcodes = [
          ...scannedShip.map(bc => ({ 
            order_number: orderNumber, 
            bottle_barcode: bc, 
            mode: 'SHIP',
            organization_id: profile.organization_id
          })),
          ...scannedReturn.map(bc => ({ 
            order_number: orderNumber, 
            bottle_barcode: bc, 
            mode: 'RETURN',
            organization_id: profile.organization_id
          })),
        ];

        const { error } = await supabase.from('bottle_scans').insert(allBarcodes);
        
        if (error) {
          setSyncResult('Error: ' + error.message);
        } else {
          // Mark returned bottles as empty
          if (scannedReturn.length > 0 && profile?.organization_id) {
            const { error: updateError } = await supabase
              .from('bottles')
              .update({ status: 'empty' })
              .eq('organization_id', profile.organization_id)
              .in('barcode_number', scannedReturn);
            
            if (updateError) {
              console.warn('Could not update bottle statuses:', updateError);
            }
          }
          
          // Update sales_orders.scanned_at for this order
          const { error: updateError } = await supabase
            .from('sales_orders')
            .update({ scanned_at: new Date().toISOString() })
            .eq('sales_order_number', orderNumber);
          
          if (updateError) {
            setSyncResult('Error updating order: ' + updateError.message);
          } else {
            let successMsg = 'Synced successfully!';
            if (scannedReturn.length > 0) {
              successMsg += ` ${scannedReturn.length} returned bottle(s) marked as empty.`;
            }
            setSyncResult(successMsg);
            
            // Clear the scanned lists
            setScannedShip([]);
            setScannedReturn([]);
            setShipCount(0);
            setReturnCount(0);
            setLastScanned('');
          }
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      setSyncResult('Error: ' + errorMessage);
    }
    setSyncing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Connection Status - only show offline count if there are pending scans */}
      {offlineCount > 0 && (
        <View style={[styles.connectionStatus, { backgroundColor: colors.warning }]}>
          <Text style={[styles.connectionText, { color: colors.text }]}>
            {offlineCount} scan(s) pending sync
          </Text>
        </View>
      )}
      
      {/* Mode Selection */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'SHIP' && styles.toggleButtonActive]}
          onPress={() => setMode('SHIP')}
        >
          <Text style={[styles.toggleText, mode === 'SHIP' && styles.toggleTextActive]}>SHIP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'RETURN' && styles.toggleButtonActive]}
          onPress={() => setMode('RETURN')}
        >
          <Text style={[styles.toggleText, mode === 'RETURN' && styles.toggleTextActive]}>RETURN</Text>
        </TouchableOpacity>
      </View>

      {/* Counters */}
      <View style={styles.counterRowModern}>
        <TouchableOpacity
          style={[styles.counterBoxModern, mode === 'SHIP' && styles.counterBoxActiveModern]}
          onPress={() => setMode('SHIP')}
        >
          <Text style={[styles.counterNumberModern, mode === 'SHIP' && styles.counterNumberActiveModern]}>{shipCount}</Text>
          <Text style={[styles.counterLabelModern, mode === 'SHIP' && styles.counterLabelActiveModern]}>SHIP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.counterBoxModern, mode === 'RETURN' && styles.counterBoxActiveModern]}
          onPress={() => setMode('RETURN')}
        >
          <Text style={[styles.counterNumberModern, mode === 'RETURN' && styles.counterNumberActiveModern]}>{returnCount}</Text>
          <Text style={[styles.counterLabelModern, mode === 'RETURN' && styles.counterLabelActiveModern]}>RETURN</Text>
        </TouchableOpacity>
      </View>

      {lastScanned ? (
        <Text style={styles.lastScanned}>Last scanned: {lastScanned}</Text>
      ) : null}

      {/* Scan Area */}
      <View style={styles.scanAreaWrapper}>
        {scanError ? (
          <View style={{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
            <View style={{ 
              backgroundColor: colors.error, 
              paddingVertical: 12, 
              paddingHorizontal: 24, 
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5
            }}>
              <Text style={{ color: colors.surface, fontWeight: 'bold', fontSize: 16 }}>
                ⚠️ {scanError}
              </Text>
            </View>
          </View>
        ) : null}
        
        {!permission ? (
          <Text style={{ color: colors.text }}>Requesting camera permission...</Text>
        ) : !permission.granted ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.text, marginBottom: 16 }}>We need your permission to show the camera</Text>
            <TouchableOpacity onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.surface, fontWeight: 'bold' }}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.cameraContainer}
            onPress={() => {
              setScannerVisible(true);
              setHasUserClosedCamera(false);
            }}
          >
            <Text style={styles.cameraPlaceholderText}>📷 Camera Scanner</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Manual Entry Button */}
      <TouchableOpacity style={styles.manualButton} onPress={() => setShowManual(true)}>
        <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
      </TouchableOpacity>

      {/* Scanned Barcodes List */}
      <View style={{ width: '90%', maxWidth: 400, marginBottom: 12 }}>
        {scannedShip.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: 4 }}>Scanned for SHIP:</Text>
            {scannedShip.map((code, idx) => (
              <View key={code} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, backgroundColor: '#e0e7ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ flex: 1, color: '#222', fontSize: 15 }}>{code}</Text>
                <TouchableOpacity onPress={() => {
                  setScannedShip(list => list.filter(c => c !== code));
                  setShipCount(count => Math.max(0, count - 1));
                }} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#ff5a1f', fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {scannedReturn.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: 4 }}>Scanned for RETURN:</Text>
            {scannedReturn.map((code, idx) => (
              <View key={code} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, backgroundColor: '#e0e7ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ flex: 1, color: '#222', fontSize: 15 }}>{code}</Text>
                <TouchableOpacity onPress={() => {
                  setScannedReturn(list => list.filter(c => c !== code));
                  setReturnCount(count => Math.max(0, count - 1));
                }} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#ff5a1f', fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Next Button - appears when items are scanned */}
      {(scannedShip.length > 0 || scannedReturn.length > 0) && (
        <View style={{ width: '100%', alignItems: 'center', marginTop: 16 }}>
          <TouchableOpacity
            style={[styles.manualButton, { backgroundColor: '#2563eb', marginBottom: 8 }]}
            onPress={() => setShowConfirm(true)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Next</Text>
          </TouchableOpacity>
          {syncing && <Text style={{ color: '#2563eb', marginTop: 8 }}>Syncing...</Text>}
          {syncResult ? <Text style={{ color: syncResult.startsWith('Error') ? '#ff5a1f' : '#2563eb', marginTop: 8 }}>{syncResult}</Text> : null}
        </View>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <Modal visible={showManual} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manual Entry</Text>
              
              {/* Mode Selection */}
              <View style={styles.modalModeSelection}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Select Mode:</Text>
                <View style={styles.modalToggleRow}>
                  <TouchableOpacity
                    style={[styles.modalToggleButton, manualMode === 'SHIP' && { backgroundColor: colors.primary }]}
                    onPress={() => setManualMode('SHIP')}
                  >
                    <Text style={[styles.modalToggleText, manualMode === 'SHIP' && { color: colors.surface }]}>SHIP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalToggleButton, manualMode === 'RETURN' && { backgroundColor: colors.primary }]}
                    onPress={() => setManualMode('RETURN')}
                  >
                    <Text style={[styles.modalToggleText, manualMode === 'RETURN' && { color: colors.surface }]}>RETURN</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={[styles.modalInput, { borderColor: colors.primary, color: colors.text }]}
                placeholder="Enter 9-digit barcode"
                placeholderTextColor={colors.textSecondary}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="numeric"
                maxLength={9}
              />
              
              {manualError ? (
                <Text style={[styles.modalError, { color: colors.error }]}>{manualError}</Text>
              ) : null}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.error }]}
                  onPress={() => {
                    setShowManual(false);
                    setManualBarcode('');
                    setManualError('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleManualSubmit}
                >
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.manualModalBg}>
          <View style={[styles.manualModalBox, { maxHeight: '80%' }]}> 
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Review Scanned Items</Text>
            <Text style={{ marginBottom: 8 }}>Please review all scanned/entered barcodes:</Text>
            {scannedShip.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: 2 }}>SHIP:</Text>
                {scannedShip.map((code, idx) => (
                  <Text key={code} style={{ color: '#222', fontSize: 15 }}>{code}</Text>
                ))}
              </View>
            )}
            {scannedReturn.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: 2 }}>RETURN:</Text>
                {scannedReturn.map((code, idx) => (
                  <Text key={code} style={{ color: '#222', fontSize: 15 }}>{code}</Text>
                ))}
              </View>
            )}
            {scannedReturn.length > 0 && (
              <Text style={{ color: '#f59e0b', fontSize: 14, marginBottom: 8, fontStyle: 'italic' }}>
                Note: Returned bottles will be automatically marked as empty.
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.manualButton, { backgroundColor: '#e0e7ff', flex: 1, marginRight: 8 }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualButton, { backgroundColor: '#2563eb', flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  setShowConfirm(false);
                  handleFinishAndSync();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Finish & Sync</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Scanner Modal */}
      {scannerVisible && (
        <Modal visible={scannerVisible} animationType="slide">
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'code93', 'codabar', 'ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
            />
            <ScanOverlay 
              title="Scan Cylinder Barcode"
              subtitle="Position the barcode within the frame"
              isScanning={scanned}
              hideScanningLine={Platform.OS === 'ios'}
              onClose={() => {
                setScannerVisible(false);
                setHasUserClosedCamera(true);
                navigation.goBack();
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const scanAreaSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    paddingTop: 24,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
    letterSpacing: 1,
  },
  scanAreaWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  cameraContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  cameraPlaceholder: {
    width: '80%',
    height: '60%',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholderText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  scanningFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: scanAreaSize * 0.8, // 80% of scan area
    height: scanAreaSize * 0.6, // 60% of scan area
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    zIndex: 10,
  },
  successText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: scanAreaSize * 0.2,
    height: scanAreaSize * 0.2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: scanAreaSize * 0.2,
    height: scanAreaSize * 0.2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: scanAreaSize * 0.2,
    height: scanAreaSize * 0.2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scanAreaSize * 0.2,
    height: scanAreaSize * 0.2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    marginHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#fff',
  },
  counterRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    marginTop: 24,
  },
  counterBoxModern: {
    flex: 1,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    marginHorizontal: 8,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBoxActiveModern: {
    backgroundColor: '#2563eb',
  },
  counterNumberModern: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  counterNumberActiveModern: {
    color: '#fff',
  },
  counterLabelModern: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  counterLabelActiveModern: {
    color: '#fff',
  },
  manualButton: {
    marginTop: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  manualButtonText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  manualModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualModalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  infoNote: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  lastScanned: {
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  connectionStatus: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectionText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    width: '100%',
    marginBottom: 12,
  },
  modalError: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  modalModeSelection: {
    width: '100%',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  modalToggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 