import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScanArea from '../components/ScanArea';
import BatchScanControls from '../../shared/components/BatchScanControls';
import { UnifiedScanner, ScanResult } from '../../shared/scanners/UnifiedScanner';
import { BatchScanner } from '../../shared/scanners/BatchScanner';
import { feedbackService } from '../services/feedbackService';

export default function TestBatchScanScreen() {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const scanner = useRef(new UnifiedScanner({ mode: 'batch' })).current;
  const batchScanner = useRef(new BatchScanner()).current;
  const [session, setSession] = useState<any>(null);

  const startBatch = async () => {
    await feedbackService.initialize();
    const newSession = batchScanner.startBatch({
      duplicateCooldown: 500,
      autoCompleteThreshold: 20,
    });
    setSession(newSession);
    setScanning(true);
    await feedbackService.startBatch();
  };

  const handleScan = async (barcode: string, result?: ScanResult) => {
    if (!result) return;

    const operationResult = batchScanner.processScan(result);
    
    if (operationResult.accepted) {
      await feedbackService.scanSuccess(barcode);
      
      // Progress feedback every 5 scans
      if (operationResult.sessionStats.totalScans % 5 === 0) {
        await feedbackService.batchProgress(operationResult.sessionStats.totalScans);
      }
      
      // Update session state
      const currentSession = batchScanner.getActiveSession();
      setSession(currentSession);
      
      console.log('✅ Added to batch:', barcode, operationResult.sessionStats);
    } else {
      await feedbackService.scanDuplicate(barcode);
      console.log('⚠️ Duplicate or rejected:', barcode, operationResult.reason);
    }
  };

  const completeBatch = async () => {
    const summary = batchScanner.completeBatch();
    await feedbackService.batchComplete(summary.totalScans);
    
    Alert.alert(
      '✅ Batch Complete',
      `Total Scans: ${summary.totalScans}\n` +
      `Unique Items: ${summary.uniqueBarcodes}\n` +
      `Duplicates: ${summary.duplicates}\n` +
      `Scan Rate: ${summary.scansPerSecond.toFixed(2)} scans/sec\n` +
      `Duration: ${(summary.duration / 1000).toFixed(1)} seconds`,
      [
        {
          text: 'OK',
          onPress: () => {
            setScanning(false);
            setSession(null);
            scanner.reset();
            batchScanner.reset();
          }
        }
      ]
    );
  };

  const clearBatch = () => {
    Alert.alert(
      'Clear Batch',
      'Are you sure you want to clear all scans?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            batchScanner.clearScans();
            const currentSession = batchScanner.getActiveSession();
            setSession(currentSession);
          }
        }
      ]
    );
  };

  const undoLast = async () => {
    const removed = batchScanner.undoLastScan();
    if (removed) {
      await feedbackService.quickAction('Undo');
      const currentSession = batchScanner.getActiveSession();
      setSession(currentSession);
    }
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
            <Ionicons name="albums-outline" size={64} color="#2196F3" />
            <Text style={styles.title}>Batch Scan Test</Text>
            <Text style={styles.description}>
              Rapid sequential scanning mode. Scan multiple items quickly with duplicate detection and real-time statistics.
            </Text>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="flash" size={20} color="#2196F3" />
                <Text style={styles.featureText}>2-5 scans per second</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="filter" size={20} color="#2196F3" />
                <Text style={styles.featureText}>Duplicate detection</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="stats-chart" size={20} color="#2196F3" />
                <Text style={styles.featureText}>Real-time statistics</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="time" size={20} color="#2196F3" />
                <Text style={styles.featureText}>500ms cooldown</Text>
              </View>
            </View>

            <View style={styles.targetCard}>
              <Text style={styles.targetText}>🎯 Target: 20 scans</Text>
              <Text style={styles.targetSubtext}>Auto-complete when reached</Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={startBatch}
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Batch Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScanArea
            onScanned={(barcode) => {
              handleScan(barcode, { 
                barcode, 
                format: 'unknown', 
                confidence: 1,
                frame: 0,
                timestamp: Date.now(),
                enhanced: true,
                source: 'native'
              });
            }}
            label="Batch Scan Mode - Scan multiple barcodes"
            validationPattern={/^[\dA-Za-z\-%]+$/}
            style={{ flex: 1, backgroundColor: '#000' }}
          />
          {session && (
            <BatchScanControls
              scannedCount={session.scans.length}
              uniqueCount={new Set(session.scans.map((s: ScanResult) => s.barcode)).size}
              scanRate={batchScanner.calculateStats(session).averageRate}
              targetCount={20}
              recentScans={session.scans.slice(-5).map((s: ScanResult) => ({
                barcode: s.barcode,
                timestamp: s.timestamp,
              }))}
              onComplete={completeBatch}
              onClear={clearBatch}
              onUndo={undoLast}
            />
          )}
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
  targetCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  targetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  targetSubtext: {
    fontSize: 13,
    color: '#1976D2',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
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
