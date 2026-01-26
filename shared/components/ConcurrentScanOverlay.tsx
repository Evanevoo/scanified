/**
 * ConcurrentScanOverlay - Visual overlay for multi-barcode detection
 * 
 * Provides visual feedback for:
 * - Colored boxes around detected barcodes
 * - Labels showing format and confidence
 * - Focus indicator for primary barcode
 * - Capture all button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetectedBarcode } from '../scanners/UnifiedScanner';
import { Highlight } from '../scanners/ConcurrentScanner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ConcurrentScanOverlayProps {
  detectedBarcodes: DetectedBarcode[];
  highlights?: Highlight[];
  highlightColor?: string;
  showLabels?: boolean;
  showCaptureAll?: boolean;
  onCaptureAll?: () => void;
  onBarcodeSelected?: (barcode: DetectedBarcode) => void;
}

const ConcurrentScanOverlay: React.FC<ConcurrentScanOverlayProps> = ({
  detectedBarcodes,
  highlights,
  highlightColor = '#4CAF50',
  showLabels = true,
  showCaptureAll = true,
  onCaptureAll,
  onBarcodeSelected,
}) => {
  /**
   * Get default highlights if not provided
   */
  const getHighlights = (): Highlight[] => {
    if (highlights) return highlights;

    // Generate default highlights from detected barcodes
    return detectedBarcodes.map((barcode, index) => ({
      barcode: barcode.barcode,
      position: barcode.bounds || {
        x: SCREEN_WIDTH * 0.2,
        y: SCREEN_HEIGHT * 0.3 + (index * 80),
        width: SCREEN_WIDTH * 0.6,
        height: 60,
      },
      color: index === 0 ? highlightColor : '#2196F3',
      priority: barcode.priority,
      label: showLabels ? `${barcode.format.toUpperCase()} • ${Math.round(barcode.confidence)}%` : undefined,
    }));
  };

  const displayHighlights = getHighlights();

  if (detectedBarcodes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Barcode Highlights */}
      {displayHighlights.map((highlight, index) => {
        const isPrimary = index === 0;
        
        return (
          <TouchableOpacity
            key={`${highlight.barcode}-${index}`}
            style={[
              styles.highlightBox,
              {
                left: highlight.position.x,
                top: highlight.position.y,
                width: highlight.position.width,
                height: highlight.position.height,
                borderColor: highlight.color,
                borderWidth: isPrimary ? 3 : 2,
              },
              isPrimary && styles.primaryHighlight,
            ]}
            onPress={() => {
              const barcode = detectedBarcodes[index];
              if (barcode && onBarcodeSelected) {
                onBarcodeSelected(barcode);
              }
            }}
            activeOpacity={0.7}
          >
            {/* Priority Badge */}
            {isPrimary && (
              <View style={[styles.priorityBadge, { backgroundColor: highlight.color }]}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
              </View>
            )}

            {/* Label */}
            {highlight.label && (
              <View style={[styles.labelContainer, { backgroundColor: highlight.color }]}>
                <Text style={styles.labelText}>{highlight.label}</Text>
              </View>
            )}

            {/* Corner Markers */}
            <View style={[styles.corner, styles.topLeft, { borderColor: highlight.color }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: highlight.color }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: highlight.color }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: highlight.color }]} />
          </TouchableOpacity>
        );
      })}

      {/* Barcode Count Badge */}
      <View style={styles.countBadge}>
        <Ionicons name="barcode" size={16} color="#FFFFFF" />
        <Text style={styles.countText}>{detectedBarcodes.length}</Text>
      </View>

      {/* Capture All Button */}
      {showCaptureAll && onCaptureAll && detectedBarcodes.length > 1 && (
        <TouchableOpacity
          style={styles.captureAllButton}
          onPress={onCaptureAll}
          activeOpacity={0.8}
        >
          <Ionicons name="scan-circle" size={24} color="#FFFFFF" />
          <Text style={styles.captureAllText}>
            Capture All ({detectedBarcodes.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {detectedBarcodes.length === 1 
            ? 'Tap barcode to scan' 
            : `${detectedBarcodes.length} barcodes detected • Tap to scan individually`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  highlightBox: {
    position: 'absolute',
    borderRadius: 8,
    borderStyle: 'solid',
  },
  primaryHighlight: {
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  priorityBadge: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  labelContainer: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: [{ translateX: -50 }],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  countBadge: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  captureAllButton: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: [{ translateX: -100 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  captureAllText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default ConcurrentScanOverlay;
