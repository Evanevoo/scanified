import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ProgressIndicatorProps {
  progress: number; // 0 to 1
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  style?: any;
}

export default function ProgressIndicator({
  progress,
  size = 'medium',
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showPercentage = true,
  label,
  style,
}: ProgressIndicatorProps) {
  const animatedProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { height: 4, borderRadius: 2 };
      case 'large':
        return { height: 12, borderRadius: 6 };
      default:
        return { height: 8, borderRadius: 4 };
    }
  };

  const sizeStyles = getSizeStyles();
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, sizeStyles, { backgroundColor }]}>
          <Animated.View
            style={[
              styles.progressFill,
              sizeStyles,
              {
                backgroundColor: color,
                width: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        
        {showPercentage && (
          <Text style={[styles.percentage, size === 'small' && styles.smallPercentage]}>
            {percentage}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 32,
    textAlign: 'right',
  },
  smallPercentage: {
    fontSize: 10,
    minWidth: 28,
  },
});
