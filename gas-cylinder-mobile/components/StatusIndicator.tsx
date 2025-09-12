import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type StatusType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'pending' 
  | 'synced' 
  | 'offline'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface StatusIndicatorProps {
  status: StatusType;
  text?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'dot' | 'badge' | 'pill';
  showIcon?: boolean;
  style?: any;
}

export default function StatusIndicator({
  status,
  text,
  size = 'medium',
  variant = 'badge',
  showIcon = true,
  style,
}: StatusIndicatorProps) {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'success':
      case 'synced':
      case 'completed':
        return {
          color: '#10B981',
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          icon: '✓',
          label: text || 'Success',
        };
      
      case 'error':
      case 'cancelled':
        return {
          color: '#EF4444',
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          icon: '✕',
          label: text || 'Error',
        };
      
      case 'warning':
        return {
          color: '#F59E0B',
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          icon: '⚠',
          label: text || 'Warning',
        };
      
      case 'info':
        return {
          color: '#3B82F6',
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          icon: 'ℹ',
          label: text || 'Info',
        };
      
      case 'pending':
      case 'in_progress':
        return {
          color: '#8B5CF6',
          backgroundColor: '#F5F3FF',
          borderColor: '#C4B5FD',
          icon: '⏳',
          label: text || 'Pending',
        };
      
      case 'offline':
        return {
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderColor: '#D1D5DB',
          icon: '📱',
          label: text || 'Offline',
        };
      
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderColor: '#D1D5DB',
          icon: '●',
          label: text || status,
        };
    }
  };

  const config = getStatusConfig(status);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 10,
          iconSize: 10,
          dotSize: 6,
        };
      case 'large':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 16,
          iconSize: 16,
          dotSize: 12,
        };
      default:
        return {
          paddingHorizontal: 10,
          paddingVertical: 4,
          fontSize: 12,
          iconSize: 12,
          dotSize: 8,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === 'dot') {
    return (
      <View style={[styles.dotContainer, style]}>
        <View
          style={[
            styles.dot,
            {
              width: sizeStyles.dotSize,
              height: sizeStyles.dotSize,
              backgroundColor: config.color,
            },
          ]}
        />
        {text && (
          <Text style={[styles.dotText, { fontSize: sizeStyles.fontSize, color: config.color }]}>
            {text}
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'pill') {
    return (
      <View
        style={[
          styles.pill,
          {
            backgroundColor: config.color,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
          },
          style,
        ]}
      >
        {showIcon && (
          <Text style={[styles.pillIcon, { fontSize: sizeStyles.iconSize }]}>
            {config.icon}
          </Text>
        )}
        <Text style={[styles.pillText, { fontSize: sizeStyles.fontSize }]}>
          {config.label}
        </Text>
      </View>
    );
  }

  // Default badge variant
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        style,
      ]}
    >
      {showIcon && (
        <Text style={[styles.badgeIcon, { fontSize: sizeStyles.iconSize, color: config.color }]}>
          {config.icon}
        </Text>
      )}
      <Text style={[styles.badgeText, { fontSize: sizeStyles.fontSize, color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
  dotText: {
    fontWeight: '500',
  },
  
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    fontWeight: 'bold',
  },
  badgeText: {
    fontWeight: '600',
  },
  
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pillText: {
    color: '#fff',
    fontWeight: '600',
  },
});
