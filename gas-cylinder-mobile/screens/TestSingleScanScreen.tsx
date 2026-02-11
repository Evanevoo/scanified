import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScanArea from '../components/ScanArea';
import { feedbackService } from '../services/feedbackService';

export default function TestSingleScanScreen() {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);

  const handleScan = async (barcode: string, result?: { format: string; confidence: number }) => {
    setLastScan(barcode);
    setScanCount(prev => prev + 1);
    await feedbackService.scanSuccess(barcode);
    
    console.log('✅ Scanned:', barcode);
    console.log('📊 Result:', result);
    
    // Show alert with scan details
    Alert.alert(
      '✅ Scan Successful',
      `Barcode: ${barcode}\n` +
      `Format: ${result?.format || 'Unknown'}\n` +
      `Confidence: ${result?.confidence || 100}%\n` +
      `Source: ${result?.source || 'native'}`,
      [{ text: 'OK' }]
    );
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
            <Ionicons name="barcode-outline" size={64} color="#4CAF50" />
            <Text style={styles.title}>Single Scan Test</Text>
            <Text style={styles.description}>
              Test basic barcode scanning functionality. Scan one barcode at a time with full feedback.
            </Text>

            {lastScan && (
              <View style={styles.lastScanCard}>
                <Text style={styles.lastScanLabel}>Last Scan:</Text>
                <Text style={styles.lastScanValue}>{lastScan}</Text>
                <Text style={styles.scanCountText}>Total Scans: {scanCount}</Text>
              </View>
            )}

            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="flash" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Flash Control</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="expand" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Zoom Support</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="volume-high" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Audio Feedback</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={async () => {
                await feedbackService.initialize();
                setScanning(true);
              }}
            >
              <Ionicons name="scan" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScanArea
          onScanned={handleScan}
          onClose={() => setScanning(false)}
          label="Single Scan Test - Scan a barcode"
          validationPattern={/^[\dA-Za-z\-%]+$/}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
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
  lastScanCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  lastScanLabel: {
    fontSize: 13,
    color: '#2E7D32',
    marginBottom: 8,
    fontWeight: '600',
  },
  lastScanValue: {
    fontSize: 18,
    color: '#1B5E20',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  scanCountText: {
    fontSize: 13,
    color: '#2E7D32',
    marginTop: 8,
  },
  features: {
    width: '100%',
    marginBottom: 32,
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
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
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
