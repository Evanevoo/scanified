import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TextInput, Vibration, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../supabase';
import { SyncService } from '../services/SyncService';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ScanCylindersActionScreen() {
  const route = useRoute();
  const { customer, orderNumber } = route.params || {};
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState('SHIP'); // 'SHIP' or 'RETURN'
  const [shipCount, setShipCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedShip, setScannedShip] = useState([]);
  const [scannedReturn, setScannedReturn] = useState([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualMode, setManualMode] = useState('SHIP');
  const [manualError, setManualError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  const isValidBarcode = (barcode) => {
    // Enhanced validation with better error messages
    if (!barcode || typeof barcode !== 'string') return false;
    const trimmed = barcode.trim();
    
    // Check for 9-digit numeric pattern (existing requirement)
    if (!/^\d{9}$/.test(trimmed)) return false;
    
    // Additional validation - check for common invalid patterns
    if (trimmed === '000000000' || trimmed === '123456789') return false;
    
    return true;
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

  const handleBarcodeScanned = ({ data }) => {
    const barcode = data.trim();
    
    if (!isValidBarcode(barcode)) {
      setScanError('Invalid barcode: must be exactly 9 numbers');
      setScanned(true);
      playBeep();
      setTimeout(() => {
        setScanned(false);
        setScanError('');
      }, 2500); // Slightly longer display time
      return;
    }

    // Check for duplicate in opposite list and move if found
    if (mode === 'SHIP' && scannedReturn.includes(barcode)) {
      setScannedReturn(list => list.filter(c => c !== barcode));
      setReturnCount(count => Math.max(0, count - 1));
      setScannedShip(list => [...list, barcode]);
      setShipCount(count => count + 1);
      setScanned(true);
      setLastScanned(barcode);
      playBeep();
      setTimeout(() => setScanned(false), 1000);
      return;
    }

    if (mode === 'RETURN' && scannedShip.includes(barcode)) {
      setScannedShip(list => list.filter(c => c !== barcode));
      setShipCount(count => Math.max(0, count - 1));
      setScannedReturn(list => [...list, barcode]);
      setReturnCount(count => count + 1);
      setScanned(true);
      setLastScanned(barcode);
      playBeep();
      setTimeout(() => setScanned(false), 1000);
      return;
    }

    // Check for duplicate in same list
    if ((mode === 'SHIP' && scannedShip.includes(barcode)) || 
        (mode === 'RETURN' && scannedReturn.includes(barcode))) {
      setScanError('Barcode already scanned in this list');
      setScanned(true);
      playBeep();
      setTimeout(() => {
        setScanned(false);
        setScanError('');
      }, 2000);
      return;
    }

    // Add to appropriate list
    setScanned(true);
    setLastScanned(barcode);
    playBeep();
    
    if (mode === 'SHIP') {
      setShipCount(count => count + 1);
      setScannedShip(list => [...list, barcode]);
    } else {
      setReturnCount(count => count + 1);
      setScannedReturn(list => [...list, barcode]);
    }
    
    setTimeout(() => setScanned(false), 800);
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
            asset_barcode: bc, 
            mode: 'SHIP',
            customer_id: customer?.id,
            location: customer?.location || 'Unknown',
            user_id: userId
          })),
          ...scannedReturn.map(bc => ({ 
            order_number: orderNumber, 
            asset_barcode: bc, 
            mode: 'RETURN',
            customer_id: customer?.id,
            location: customer?.location || 'Unknown',
            user_id: userId
          })),
        ];

        // Save each scan offline
        for (const scan of allBarcodes) {
          await SyncService.saveOfflineScan(scan);
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
        const allBarcodes = [
          ...scannedShip.map(bc => ({ order_number: orderNumber, asset_barcode: bc, mode: 'SHIP' })),
          ...scannedReturn.map(bc => ({ order_number: orderNumber, asset_barcode: bc, mode: 'RETURN' })),
        ];

        const { error } = await supabase.from('asset_scans').insert(allBarcodes);
        
        if (error) {
          setSyncResult('Error: ' + error.message);
        } else {
          // Mark returned bottles as empty
          if (scannedReturn.length > 0) {
            const { error: updateError } = await supabase
              .from('assets')
              .update({ status: 'empty' })
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
      setSyncResult('Error: ' + e.message);
    }
    setSyncing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Text style={[styles.header, { color: colors.primary }]}>SCAN HERE</Text>
      
      {/* Connection Status */}
      <View style={[styles.connectionStatus, { backgroundColor: isConnected ? colors.success : colors.warning }]}>
        <Text style={[styles.connectionText, { color: colors.text }]}>
          {isConnected ? '🟢 Online' : '🟡 Offline'}
        </Text>
        {offlineCount > 0 && (
          <Text style={[styles.connectionText, { color: colors.text }]}>
            {offlineCount} scan(s) pending sync
          </Text>
        )}
      </View>
      
      {scannedReturn.length > 0 && (
        <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
          💡 Returned bottles will be automatically marked as empty when synced
        </Text>
      )}
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
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 
                  'code128', 'pdf417', 'aztec', 'datamatrix', 'itf14', 'interleaved2of5'
                ],
                regionOfInterest: {
                  x: 0.1, // 10% from left
                  y: 0.35, // 35% from top
                  width: 0.8, // 80% width
                  height: 0.3, // 30% height
                }
              }}
            />
            
            {/* Enhanced scanning frame */}
            <View style={styles.scanningFrame} />
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            
            {/* Scanning status indicator */}
            {lastScanned && !scanError && (
              <View style={styles.successOverlay}>
                <Text style={styles.successText}>✓ Scanned: {lastScanned}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {/* Counters below scan area */}
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
      {/* Mode Toggle */}
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
      {/* Manual Entry Button */}
      <TouchableOpacity style={styles.manualButton} onPress={() => setShowManual(true)}>
        <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
      </TouchableOpacity>
      {/* Manual Entry Modal (optional, can be implemented as needed) */}
      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <View style={styles.manualModalBg}>
          <View style={styles.manualModalBox}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Manual Entry</Text>
            {/* Mode Toggle */}
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.toggleButton, manualMode === 'SHIP' && styles.toggleButtonActive]}
                onPress={() => setManualMode('SHIP')}
              >
                <Text style={[styles.toggleText, manualMode === 'SHIP' && styles.toggleTextActive]}>SHIP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, manualMode === 'RETURN' && styles.toggleButtonActive]}
                onPress={() => setManualMode('RETURN')}
              >
                <Text style={[styles.toggleText, manualMode === 'RETURN' && styles.toggleTextActive]}>RETURN</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Enter barcode (numbers only)"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              autoFocus
            />
            {manualError ? <Text style={{ color: '#ff5a1f', marginBottom: 8 }}>{manualError}</Text> : null}
            <TouchableOpacity
              style={[styles.manualButton, { marginBottom: 8 }]}
              onPress={() => {
                const barcode = manualBarcode.trim();
                if (!isValidBarcode(barcode)) {
                  setManualError('Invalid barcode: must be exactly 9 numbers');
                  return;
                }
                // If barcode is in the other list, move it
                if (manualMode === 'SHIP' && scannedReturn.includes(barcode)) {
                  setScannedReturn(list => list.filter(c => c !== barcode));
                  setReturnCount(count => Math.max(0, count - 1));
                  setScannedShip(list => [...list, barcode]);
                  setShipCount(count => count + 1);
                  setManualBarcode('');
                  setManualError('');
                  setShowManual(false);
                  return;
                }
                if (manualMode === 'RETURN' && scannedShip.includes(barcode)) {
                  setScannedShip(list => list.filter(c => c !== barcode));
                  setShipCount(count => Math.max(0, count - 1));
                  setScannedReturn(list => [...list, barcode]);
                  setReturnCount(count => count + 1);
                  setManualBarcode('');
                  setManualError('');
                  setShowManual(false);
                  return;
                }
                // Prevent duplicate in the same list
                if ((manualMode === 'SHIP' && scannedShip.includes(barcode)) || (manualMode === 'RETURN' && scannedReturn.includes(barcode))) {
                  setManualError('Barcode already scanned');
                  return;
                }
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
              }}
            >
              <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowManual(false)} style={styles.permissionButton}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Finish Button */}
      <View style={{ width: '100%', alignItems: 'center', marginTop: 16 }}>
        <TouchableOpacity
          style={[styles.manualButton, { backgroundColor: '#2563eb', marginBottom: 8 }]}
          disabled={syncing || (scannedShip.length === 0 && scannedReturn.length === 0)}
          onPress={() => setShowConfirm(true)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Finish & Sync</Text>
        </TouchableOpacity>
        {syncing && <Text style={{ color: '#2563eb', marginTop: 8 }}>Syncing...</Text>}
        {syncResult ? <Text style={{ color: syncResult.startsWith('Error') ? '#ff5a1f' : '#2563eb', marginTop: 8 }}>{syncResult}</Text> : null}
      </View>
      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.manualModalBg}>
          <View style={[styles.manualModalBox, { maxHeight: '80%' }]}> 
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Confirm Sync</Text>
            <Text style={{ marginBottom: 8 }}>Please review all scanned/entered barcodes before syncing:</Text>
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
                <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualButton, { backgroundColor: '#2563eb', flex: 1, marginLeft: 8 }]}
                onPress={handleFinishAndSync}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm & Sync</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    overflow: 'hidden',
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
}); 