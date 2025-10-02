import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface AccessibleProps {
  style?: ViewStyle | TextStyle;
  children?: React.ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Higher Order Component that applies accessibility styles to any component
 */
export function withAccessibility<P extends AccessibleProps>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AccessibilityEnhancedComponent(props: P) {
    const { theme, accessibilityStyles } = useTheme();
    
    // Apply accessibility styles to the component props
    const enhancedStyle: ViewStyle | TextStyle = React.useMemo(() => {
      const baseStyle = props.style || {};
      const accessibleStyle: ViewStyle | TextStyle = { ...baseStyle };
      
      // Apply font size multiplier
      if (accessibilityStyles.fontSizeMultiplier > 1.0 && 'fontSize' in baseStyle) {
        const fontSize = typeof baseStyle.fontSize === 'number' ? baseStyle.fontSize : 16;
        accessibleStyle.fontSize = fontSize * accessibilityStyles.fontSizeMultiplier;
      }
      
      // Apply bold text
      if (accessibilityStyles.fontWeight) {
        accessibleStyle.fontWeight = accessibilityStyles.fontWeight;
      }
      
      // Apply high contrast colors if needed
      if (accessibilityStyles.highContrast && accessibilityStyles.contrastColors) {
        if ('color' in enhancedStyle && 'text' in accessibilityStyles.contrastColors) {
          accessibleStyle.color = accessibilityStyles.contrastColors.text;
        }
        if ('backgroundColor' in enhancedStyle && 'background' in accessibilityStyles.contrastColors) {
          accessibleStyle.backgroundColor = accessibilityStyles.contrastColors.background;
        }
      }
      
      return accessibleStyle;
    }, [props.style, accessibilityStyles]);
    
    // Create accessibility props
    const accessibilityProps = {
      accessibilityRole: props.accessibilityRole,
      accessibilityLabel: props.accessibilityLabel,
      accessibilityHint: props.accessibilityHint,
    };
    
    return React.createElement(WrappedComponent, {
      ...props,
      style: enhancedStyle,
      ...accessibilityProps,
    });
  };
}

/**
 * Helper hook to get accessible styles for manual application
 */
export function useAccessibleStyles() {
  const { accessibilityStyles } = useTheme();
  
  return React.useMemo(() => {
    const getTextStyle = (baseStyle: TextStyle = {}): TextStyle => {
      const style: TextStyle = { ...baseStyle };
      
      if (accessibilityStyles.fontSizeMultiplier > 1.0 && baseStyle.fontSize) {
        style.fontSize = baseStyle.fontSize * accessibilityStyles.fontSizeMultiplier;
      }
      
      if (accessibilityStyles.fontWeight) {
        style.fontWeight = accessibilityStyles.fontWeight;
      }
      
      if (accessibilityStyles.highContrast && accessibilityStyles.contrastColors?.text) {
        style.color = accessibilityStyles.contrastColors.text;
      }
      
      return style;
    };
    
    const getViewStyle = (baseStyle: ViewStyle = {}): ViewStyle => {
      const style: ViewStyle = { ...baseStyle };
      
      if (accessibilityStyles.highContrast && accessibilityStyles.contrastColors?.background) {
        style.backgroundColor = accessibilityStyles.contrastColors.background;
      }
      
      if (accessibilityStyles.highContrast && accessibilityStyles.contrastColors?.primary) {
        if (style.borderColor === theme.primary) {
          style.borderColor = accessibilityStyles.contrastColors.primary;
        }
      }
      
      return style;
    };
    
    return { getTextStyle, getViewStyle };
  }, [accessibilityStyles]);
}

/**
 * Accessible Text component with built-in accessibility enhancements
 */
export const AccessibleText: React.FC<AccessibleProps> = ({ style, children, ...props }) => {
  const { theme, accessibilityStyles } = useTheme();
  const { getTextStyle } = useAccessibleStyles();
  
  return (
    <Text
      style={getTextStyle(style as TextStyle)}
      {...props}
    >
      {children}
    </Text>
  );
};

/**
 * Accessible View component with built-in accessibility enhancements
 */
export const AccessibleView: React.FC<AccessibleProps> = ({ style, children, ...props }) => {
  const { theme, accessibilityStyles } = useTheme();
  const { getViewStyle } = useAccessibleStyles();
  
  return (
    <View
      style={getViewStyle(style as ViewStyle)}
      {...props}
    >
      {children}
    </View>
  );
};
