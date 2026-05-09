import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
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
  const motion = colors.motion;

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
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(config.opacity, { duration: motion.timingMs });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(1, { duration: motion.timingMs });
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: gradient ? 'transparent' : colors.glassSurface,
      borderColor: colors.borderSoft || colors.border,
      ...(elevated && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
        elevation: 10,
      }),
      ...(disabled && {
        opacity: 0.5,
      }),
    },
    style
  ];

  const content = gradient ? (
    <LinearGradient
      colors={(colors.gradient || [colors.primary, colors.secondary]) as [string, string, ...string[]]}
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    minHeight: 80, // Ensure adequate touch target
  },
  gradient: {
    borderRadius: 22,
    padding: 18,
  },
});

