import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, AccessibilityInfo, Platform } from 'react-native';
import { customizationService } from '../services/customizationService';

interface AccessibilityHelperProps {
  children: React.ReactNode;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: any;
  onAccessibilityAction?: (event: any) => void;
  speakOnMount?: boolean;
  speakOnFocus?: boolean;
  speakOnPress?: boolean;
  speakText?: string;
  priority?: 'low' | 'normal' | 'high';
}

export default function AccessibilityHelper({
  children,
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  onAccessibilityAction,
  speakOnMount = false,
  speakOnFocus = false,
  speakOnPress = false,
  speakText,
  priority = 'normal',
}: AccessibilityHelperProps) {
  const elementRef = useRef<any>(null);

  useEffect(() => {
    if (speakOnMount && speakText) {
      customizationService.speakText(speakText, priority);
    }
  }, [speakOnMount, speakText, priority]);

  const handleFocus = () => {
    if (speakOnFocus && speakText) {
      customizationService.speakText(speakText, priority);
    }
  };

  const handlePress = () => {
    if (speakOnPress && speakText) {
      customizationService.speakText(speakText, priority);
    }
  };

  const handleAccessibilityAction = (event: any) => {
    if (onAccessibilityAction) {
      onAccessibilityAction(event);
    }
    
    // Handle default accessibility actions
    switch (event.nativeEvent.actionName) {
      case 'activate':
        handlePress();
        break;
      case 'focus':
        handleFocus();
        break;
    }
  };

  // Clone children and add accessibility props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as any, {
        accessible,
        accessibilityLabel: accessibilityLabel || child.props.accessibilityLabel,
        accessibilityHint: accessibilityHint || child.props.accessibilityHint,
        accessibilityRole: accessibilityRole || child.props.accessibilityRole,
        accessibilityState: accessibilityState || child.props.accessibilityState,
        onAccessibilityAction: handleAccessibilityAction,
        onFocus: handleFocus,
        onPress: (e: any) => {
          handlePress();
          if (child.props.onPress) {
            child.props.onPress(e);
          }
        },
        ref: elementRef,
      });
    }
    return child;
  });

  return <>{enhancedChildren}</>;
}

// Accessibility wrapper for scan results
export function AccessibleScanResult({ 
  barcode, 
  action, 
  timestamp, 
  onPress 
}: {
  barcode: string;
  action: string;
  timestamp: number;
  onPress: () => void;
}) {
  const speakText = `Scanned ${barcode} for ${action} at ${new Date(timestamp).toLocaleTimeString()}`;
  
  return (
    <AccessibilityHelper
      speakOnPress={true}
      speakText={speakText}
      priority="high"
      accessibilityRole="button"
      accessibilityLabel={`Scan result: ${barcode}`}
      accessibilityHint={`Double tap to ${action} this item`}
    >
      <TouchableOpacity onPress={onPress}>
        <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{barcode}</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{action.toUpperCase()}</Text>
          <Text style={{ fontSize: 12, color: '#999' }}>
            {new Date(timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </TouchableOpacity>
    </AccessibilityHelper>
  );
}

// Accessibility wrapper for buttons
export function AccessibleButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const getButtonStyle = () => {
    const baseStyle = {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#9CA3AF' : '#2563EB',
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#F3F4F6' : '#F3F4F6',
          borderWidth: 1,
          borderColor: disabled ? '#D1D5DB' : '#D1D5DB',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#FCA5A5' : '#EF4444',
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: '600' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: disabled ? '#6B7280' : '#fff',
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: disabled ? '#9CA3AF' : '#374151',
        };
      case 'danger':
        return {
          ...baseStyle,
          color: disabled ? '#6B7280' : '#fff',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <AccessibilityHelper
      speakOnPress={true}
      speakText={title}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled}
        accessible={true}
      >
        <Text style={getTextStyle()}>{title}</Text>
      </TouchableOpacity>
    </AccessibilityHelper>
  );
}

// Accessibility wrapper for input fields
export function AccessibleInput({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  multiline = false,
  numberOfLines = 1,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  const inputRef = useRef<any>(null);

  const speakValue = () => {
    if (value) {
      customizationService.speakText(`Current value: ${value}`, 'normal');
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <AccessibilityHelper
          speakOnMount={true}
          speakText={label}
          accessibilityRole="text"
        >
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            {label}
          </Text>
        </AccessibilityHelper>
      )}
      
      <AccessibilityHelper
        speakOnFocus={true}
        speakText={placeholder || 'Input field'}
        accessibilityRole="text"
        accessibilityLabel={label || placeholder}
        accessibilityHint={error ? `Error: ${error}` : 'Enter text'}
        accessibilityState={{ 
          invalid: !!error,
          expanded: multiline 
        }}
      >
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: error ? '#EF4444' : '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fff',
            minHeight: multiline ? 80 : 44,
          }}
          onPress={() => {
            inputRef.current?.focus();
            speakValue();
          }}
          accessible={true}
        >
          <Text
            ref={inputRef}
            style={{
              fontSize: 16,
              color: value ? '#1F2937' : '#9CA3AF',
              minHeight: multiline ? 60 : 24,
            }}
            editable={false} // We'll handle this differently for actual input
          >
            {value || placeholder}
          </Text>
        </TouchableOpacity>
      </AccessibilityHelper>
      
      {error && (
        <AccessibilityHelper
          speakOnMount={true}
          speakText={`Error: ${error}`}
          priority="high"
          accessibilityRole="text"
        >
          <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4 }}>
            {error}
          </Text>
        </AccessibilityHelper>
      )}
    </View>
  );
}

// Screen reader announcement component
export function ScreenReaderAnnouncement({ 
  text, 
  priority = 'normal',
  delay = 0 
}: {
  text: string;
  priority?: 'low' | 'normal' | 'high';
  delay?: number;
}) {
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        customizationService.speakText(text, priority);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      customizationService.speakText(text, priority);
    }
  }, [text, priority, delay]);

  return null;
}

// Accessibility context provider
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize accessibility features
    const initializeAccessibility = async () => {
      try {
        // Check if screen reader is enabled
        const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        
        if (isScreenReaderEnabled) {
          // Enable accessibility features
          customizationService.updateAccessibilityOptions({
            screenReader: true,
            speakScanResults: true,
            speakErrors: true,
            speakSuccess: true,
          });
        }
      } catch (error) {
        console.warn('Failed to initialize accessibility:', error);
      }
    };

    initializeAccessibility();
  }, []);

  return <>{children}</>;
}
