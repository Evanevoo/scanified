import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

/**
 * Modern Button Component for React Native
 * High-contrast CTA buttons with modern styling
 */
export default function ModernButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ModernButtonProps) {
  const { colors } = useTheme();

  const buttonStyle = [
    styles.button,
    styles[size],
    fullWidth && styles.fullWidth,
    variant === 'outline' && {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${size}Text`],
    variant === 'primary' && { color: '#ffffff' },
    variant === 'secondary' && { color: '#ffffff' },
    variant === 'outline' && { color: colors.primary },
    (disabled || loading) && styles.disabledText,
    textStyle,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? colors.primary : '#ffffff'} 
          size="small" 
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </>
  );

  if (variant === 'primary' || variant === 'secondary') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled || loading}
        style={buttonStyle}
      >
        <LinearGradient
          colors={variant === 'primary' 
            ? [colors.primary, colors.secondary] 
            : [colors.secondary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles[size]]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

