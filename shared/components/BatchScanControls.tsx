/**
 * BatchScanControls - UI controls for batch scanning
 * 
 * Provides visual interface for:
 * - Scan counter
 * - Scan rate indicator
 * - Progress tracking
 * - Action buttons (Complete, Clear, Undo)
 * - Queue preview
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface BatchScanControlsProps {
  scannedCount: number;
  uniqueCount?: number;
  scanRate: number; // scans per second
  targetCount?: number; // for progress bar
  recentScans?: Array<{ barcode: string; timestamp: number }>;
  onComplete: () => void;
  onClear: () => void;
  onUndo: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  estimatedTimeRemaining?: number; // milliseconds
}

const BatchScanControls: React.FC<BatchScanControlsProps> = ({
  scannedCount,
  uniqueCount,
  scanRate,
  targetCount,
  recentScans = [],
  onComplete,
  onClear,
  onUndo,
  onPause,
  isPaused = false,
  estimatedTimeRemaining,
}) => {
  /**
   * Format scan rate for display
   */
  const formatScanRate = (rate: number): string => {
    return rate.toFixed(1);
  };

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (ms: number): string => {
    if (ms < 1000) return '< 1s';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Calculate progress percentage
   */
  const getProgressPercentage = (): number => {
    if (!targetCount || targetCount === 0) return 0;
    return Math.min(100, (scannedCount / targetCount) * 100);
  };

  /**
   * Format barcode for display (truncate if too long)
   */
  const formatBarcode = (barcode: string): string => {
    if (barcode.length <= 20) return barcode;
    return `${barcode.substring(0, 17)}...`;
  };

  return (
    <View style={styles.container}>
      {/* Scan Counter */}
      <View style={styles.counterContainer}>
        <View style={styles.counterBadge}>
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
          <Text style={styles.counterText}>{scannedCount}</Text>
          {uniqueCount !== undefined && uniqueCount !== scannedCount && (
            <Text style={styles.uniqueText}>({uniqueCount} unique)</Text>
          )}
        </View>
        
        {/* Scan Rate */}
        <View style={styles.rateContainer}>
          <Ionicons name="speedometer-outline" size={16} color="#4CAF50" />
          <Text style={styles.rateText}>{formatScanRate(scanRate)}/sec</Text>
        </View>
      </View>

      {/* Progress Bar (if target set) */}
      {targetCount && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${getProgressPercentage()}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {scannedCount} / {targetCount}
          </Text>
        </View>
      )}

      {/* Estimated Time Remaining */}
      {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
        <View style={styles.etaContainer}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.etaText}>
            ~{formatTimeRemaining(estimatedTimeRemaining)} remaining
          </Text>
        </View>
      )}

      {/* Recent Scans Queue Preview */}
      {recentScans.length > 0 && (
        <View style={styles.queueContainer}>
          <Text style={styles.queueTitle}>Recent Scans:</Text>
          <ScrollView 
            style={styles.queueScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {recentScans.slice(-5).reverse().map((scan, index) => (
              <View key={`${scan.barcode}-${scan.timestamp}`} style={styles.queueItem}>
                <Text style={styles.queueItemText}>
                  {formatBarcode(scan.barcode)}
                </Text>
                <Text style={styles.queueItemIndex}>
                  #{scannedCount - index}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Undo Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.undoButton]}
          onPress={onUndo}
          disabled={scannedCount === 0}
        >
          <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Undo</Text>
        </TouchableOpacity>

        {/* Pause/Resume Button (if provided) */}
        {onPause && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={onPause}
          >
            <Ionicons 
              name={isPaused ? "play" : "pause"} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Clear Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={onClear}
          disabled={scannedCount === 0}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>

        {/* Complete Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={onComplete}
          disabled={scannedCount === 0}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  uniqueText: {
    color: '#AAAAAA',
    fontSize: 12,
    marginLeft: 8,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rateText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    color: '#AAAAAA',
    fontSize: 12,
    textAlign: 'right',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  etaText: {
    color: '#AAAAAA',
    fontSize: 12,
    marginLeft: 4,
  },
  queueContainer: {
    marginBottom: 12,
  },
  queueTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 6,
  },
  queueScroll: {
    flexDirection: 'row',
  },
  queueItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  queueItemText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  queueItemIndex: {
    color: '#4CAF50',
    fontSize: 10,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  pauseButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  clearButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  completeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
});

export default BatchScanControls;
