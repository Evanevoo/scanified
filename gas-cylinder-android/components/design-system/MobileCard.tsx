import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MobileCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
  elevated?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Mobile-Optimized Card Component
 * Enhanced with 3D touch effects and smooth animations
 */
export default function MobileCard({ 
  children, 
  onPress,
  style,
  gradient = false,
  elevated = true,
  intensity = 'medium',
  disabled = false
}: MobileCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const intensityMap = {
    light: { scale: 0.98, opacity: 0.9 },
    medium: { scale: 0.96, opacity: 0.85 },
    strong: { scale: 0.94, opacity: 0.8 },
  };

  const config = intensityMap[intensity];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(config.scale, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(config.opacity, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: gradient ? 'transparent' : colors.surface,
      borderColor: colors.border,
      ...(elevated && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }),
      ...(disabled && {
        opacity: 0.5,
      }),
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

  if (onPress && !disabled) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle]}
        disabled={disabled}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[cardStyle, animatedStyle]}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    minHeight: 80, // Ensure adequate touch target
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
  },
});

