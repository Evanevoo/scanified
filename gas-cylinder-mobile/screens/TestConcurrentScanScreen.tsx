import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MLKitScanner from '../components/MLKitScanner';
import { DetectedBarcode } from '../../shared/scanners/UnifiedScanner';
import { feedbackService } from '../services/feedbackService';

export default function TestConcurrentScanScreen() {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedBarcode[]>([]);
  const [scanner] = useState(() => new UnifiedScanner({ mode: 'concurrent' }));
  const [concurrentScanner] = useState(() => new ConcurrentScanner({ maxBarcodesPerFrame: 10 }));

  const handleMultipleDetected = async (barcodes: DetectedBarcode[]) => {
    const sorted = concurrentScanner.detectMultiple(barcodes);
    setDetected(sorted);
    
    if (sorted.length > 0) {
      await feedbackService.multiBarcodeDetected(sorted.length);
      console.log(`🔍 Detected ${sorted.length} barcodes:`, sorted.map(b => b.barcode));
    }
  };

  const captureAll = async () => {
    const all = concurrentScanner.captureAll();
    console.log('📸 Captured all barcodes:', all);
    await feedbackService.batchComplete(all.length);
    
    // Log each barcode
    all.forEach((barcode, index) => {
      console.log(`  ${index + 1}. ${barcode.barcode} (${barcode.format})`);
    });
  };

  const handleBarcodeSelected = async (barcode: DetectedBarcode) => {
    console.log('👆 Selected:', barcode.barcode);
    await feedbackService.scanSuccess(barcode.barcode);
  };

  const startScanning = async () => {
    await feedbackService.initialize();
    setScanning(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!scanning ? (
        <View style={styles.content}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Ionicons name="grid-outline" size={64} color="#FF9800" />
            <Text style={styles.title}>Concurrent Scan Test</Text>
            <Text style={styles.description}>
              Detect and highlight multiple barcodes simultaneously in a single frame. Up to 10 barcodes at once!
            </Text>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="eye" size={20} color="#FF9800" />
                <Text style={styles.featureText}>Up to 10 simultaneous</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="color-palette" size={20} color="#FF9800" />
                <Text style={styles.featureText}>Color-coded highlights</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="star" size={20} color="#FF9800" />
                <Text style={styles.featureText}>Priority sorting</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="hand-left" size={20} color="#FF9800" />
                <Text style={styles.featureText}>Tap to select</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="bulb" size={20} color="#F57C00" />
              <Text style={styles.infoText}>
                Point camera at multiple barcodes. The primary (center) barcode will be highlighted in green.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={startScanning}
            >
              <Ionicons name="scan-circle" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Concurrent Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <EnhancedExpoCameraScanner
            onBarcodeScanned={(barcode) => console.log('Single scan:', barcode)}
            onMultipleBarcodesDetected={handleMultipleDetected}
            scanner={scanner}
            scanMode="concurrent"
            enabled={true}
            onClose={() => {
              setScanning(false);
              setDetected([]);
            }}
          />
          <ConcurrentScanOverlay
            detectedBarcodes={detected}
            showCaptureAll={true}
            showLabels={true}
            onCaptureAll={captureAll}
            onBarcodeSelected={handleBarcodeSelected}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF9800',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
