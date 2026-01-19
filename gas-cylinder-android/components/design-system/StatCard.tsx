import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ModernCard from './ModernCard';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode | string;
  color?: string;
  onPress?: () => void;
}

/**
 * Modern Stat Card Component for React Native
 * Displays statistics with modern styling
 */
export default function StatCard({ 
  label, 
  value, 
  icon,
  color,
  onPress 
}: StatCardProps) {
  const { colors } = useTheme();
  const statColor = color || colors.primary;

  const content = (
    <View style={styles.content}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${statColor}20` }]}>
          {typeof icon === 'string' ? (
            <Text style={styles.iconText}>{icon}</Text>
          ) : (
            icon
          )}
        </View>
      )}
      <Text style={[styles.value, { color: statColor }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <ModernCard elevated>
          {content}
        </ModernCard>
      </TouchableOpacity>
    );
  }

  return (
    <ModernCard elevated>
      {content}
    </ModernCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconText: {
    fontSize: 24,
  },
});

