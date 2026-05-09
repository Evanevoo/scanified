import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
 * High-contrast CTA buttons with Scanified gradients and press motion.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const motion = colors.motion;
  const interactive = !disabled && !loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!interactive) return;
    scale.value = withSpring(motion.pressScale, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(motion.pressOpacity, { duration: motion.timingMs });
  };

  const handlePressOut = () => {
    if (!interactive) return;
    scale.value = withSpring(1, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(1, { duration: motion.timingMs });
  };

  const buttonStyle = [
    styles.button,
    styles[size],
    fullWidth && styles.fullWidth,
    (variant === 'primary' || variant === 'secondary') && {
      shadowColor: colors.shadowStrong,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 8,
    },
    variant === 'outline' && {
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.glassSurface,
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

  const gradientColors = (variant === 'primary'
    ? (colors.buttonGradient || [colors.primary, colors.primaryDark])
    : [colors.secondary, colors.primary]) as [string, string, ...string[]];

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? colors.primary : '#ffffff'} 
          size="small" 
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </View>
  );

  if (variant === 'primary' || variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[buttonStyle, animatedStyle]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[buttonStyle, animatedStyle]}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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

