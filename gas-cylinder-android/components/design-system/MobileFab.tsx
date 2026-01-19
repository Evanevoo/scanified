import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface MobileFabProps {
  onPress: () => void;
  icon: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  gradient?: boolean;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Mobile Floating Action Button
 * Enhanced with animations and proper positioning
 */
export default function MobileFab({
  onPress,
  icon,
  position = 'bottom-right',
  size = 'medium',
  color,
  gradient = false,
  disabled = false,
}: MobileFabProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const sizeMap = {
    small: { width: 48, iconSize: 20 },
    medium: { width: 56, iconSize: 24 },
    large: { width: 64, iconSize: 28 },
  };

  const sizeConfig = sizeMap[size];
  const fabColor = color || colors.primary;

  const positionStyle: ViewStyle = {
    position: 'absolute',
    ...(position === 'bottom-right' && { bottom: 24, right: 24 }),
    ...(position === 'bottom-left' && { bottom: 24, left: 24 }),
    ...(position === 'top-right' && { top: 24, right: 24 }),
    ...(position === 'top-left' && { top: 24, left: 24 }),
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const buttonContent = gradient ? (
    <LinearGradient
      colors={colors.gradient || [colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.fab,
        {
          width: sizeConfig.width,
          height: sizeConfig.width,
          borderRadius: sizeConfig.width / 2,
        },
      ]}
    >
      <Ionicons name={icon as any} size={sizeConfig.iconSize} color="#FFFFFF" />
    </LinearGradient>
  ) : (
    <View
      style={[
        styles.fab,
        {
          width: sizeConfig.width,
          height: sizeConfig.width,
          borderRadius: sizeConfig.width / 2,
          backgroundColor: fabColor,
        },
      ]}
    >
      <Ionicons name={icon as any} size={sizeConfig.iconSize} color="#FFFFFF" />
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[positionStyle, animatedStyle, disabled && { opacity: 0.5 }]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

