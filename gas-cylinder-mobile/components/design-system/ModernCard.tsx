import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ModernCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
  elevated?: boolean;
}

/**
 * Modern Card Component for React Native
 * Provides consistent card styling with optional gradient and elevation
 */
export default function ModernCard({ 
  children, 
  onPress,
  style,
  gradient = false,
  elevated = true
}: ModernCardProps) {
  const { colors } = useTheme();
  
  const cardStyle = [
    styles.card,
    {
      backgroundColor: gradient ? 'transparent' : colors.surface,
      borderColor: colors.border,
      ...(elevated && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      })
    },
    style
  ];

  const content = gradient ? (
    <LinearGradient
      colors={colors.gradient || [colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  ) : (
    children
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={cardStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
  },
});

