import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  TouchableOpacity 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';

interface MobileInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

/**
 * Mobile-Optimized Input Component
 * Enhanced with animations and proper touch targets
 */
export default function MobileInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
}: MobileInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useSharedValue(0);
  const borderWidthAnim = useSharedValue(1);
  const borderColorAnim = useSharedValue<string>(colors.border);

  useEffect(() => {
    // Animate focus state
    focusAnim.value = withTiming(isFocused || value ? 1 : 0, { duration: 200 });
    
    // Animate border width
    borderWidthAnim.value = withTiming(isFocused ? 2 : 1, { duration: 200 });
    
    // Update border color based on state (direct assignment for color changes)
    // Note: Reanimated doesn't support animating color strings directly with withTiming
    // So we update it directly when the condition changes
    if (error) {
      borderColorAnim.value = colors.error;
    } else if (isFocused) {
      borderColorAnim.value = colors.primary;
    } else {
      borderColorAnim.value = colors.border;
    }
  }, [isFocused, error, value, colors.error, colors.primary, colors.border]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            focusAnim.value,
            [0, 1],
            [0, -20]
          ),
        },
        {
          scale: interpolate(
            focusAnim.value,
            [0, 1],
            [1, 0.85]
          ),
        },
      ],
      opacity: interpolate(
        focusAnim.value,
        [0, 1],
        [0.6, 1]
      ),
    };
  });

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderColor: borderColorAnim.value,
      borderWidth: borderWidthAnim.value,
    };
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.Text 
          style={[
            styles.label, 
            { color: colors.textSecondary },
            animatedLabelStyle
          ]}
        >
          {label}
        </Animated.Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
          animatedBorderStyle,
          error && { borderColor: colors.error },
          disabled && { opacity: 0.5 },
        ]}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon as any} 
            size={20} 
            color={colors.textSecondary} 
            style={styles.leftIcon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconButton}
          >
            <Ionicons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconButton}
          >
            <Ionicons 
              name={rightIcon as any} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48, // Minimum touch target
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16, // Prevents iOS zoom
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  leftIcon: {
    marginRight: 12,
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

