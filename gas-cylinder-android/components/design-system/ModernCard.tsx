import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ModernCard({ 
  children, 
  onPress,
  style,
  gradient = false,
  elevated = true
}: ModernCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const motion = colors.motion;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.985, {
      damping: motion.springDamping,
      stiffness: motion.springStiffness,
    });
    opacity.value = withTiming(0.94, { duration: motion.timingMs });
  };

  const handlePressOut = () => {
    if (!onPress) return;
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
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
      })
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

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle]}
      >
        {content}
      </AnimatedPressable>
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  gradient: {
    borderRadius: 22,
    padding: 18,
  },
});

