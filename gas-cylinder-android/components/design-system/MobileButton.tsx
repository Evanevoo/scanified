import React from 'react';
import { 
  View,
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  Pressable 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MobileButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  gradient?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Mobile-Optimized Button Component
 * Enhanced with touch feedback and smooth animations
 * Minimum 48px height for proper touch targets
 */
export default function MobileButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  gradient = true,
}: MobileButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const motion = colors.motion;

  const sizeMap = {
    small: { height: 40, padding: 12, fontSize: 14 },
    medium: { height: 48, padding: 16, fontSize: 16 },
    large: { height: 56, padding: 20, fontSize: 18 },
  };

  const sizeConfig = sizeMap[size];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(motion.pressScale, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(motion.pressOpacity, { duration: motion.timingMs });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(1, { duration: motion.timingMs });
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      minHeight: sizeConfig.height,
      paddingHorizontal: sizeConfig.padding,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...(fullWidth && { width: '100%' }),
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: gradient ? 'transparent' : colors.primary,
          shadowColor: colors.shadowStrong,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 18,
          elevation: 8,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary,
          shadowColor: colors.shadowStrong,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.22,
          shadowRadius: 16,
          elevation: 7,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: colors.glassSurface,
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: sizeConfig.fontSize,
      fontWeight: '600',
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, color: '#FFFFFF' };
      case 'secondary':
        return { ...baseStyle, color: '#FFFFFF' };
      case 'outline':
        return { ...baseStyle, color: colors.primary };
      case 'ghost':
        return { ...baseStyle, color: colors.primary };
      default:
        return { ...baseStyle, color: '#FFFFFF' };
    }
  };

  const gradientColors = (variant === 'primary'
    ? (colors.buttonGradient || [colors.primary, colors.primaryDark])
    : [colors.secondary, colors.primary]) as [string, string, ...string[]];

  const buttonContent = gradient && (variant === 'primary' || variant === 'secondary') ? (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  ) : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        getButtonStyle(),
        style,
        animatedStyle,
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {buttonContent}
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : colors.primary} 
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 8,
  },
});

