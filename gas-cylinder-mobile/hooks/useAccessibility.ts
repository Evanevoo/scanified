import { useState, useEffect } from 'react';
import { customizationService, AccessibilityOptions } from '../services/customizationService';

export interface AccessibilityStyles {
  fontSizeMultiplier: number;
  fontWeight: string | undefined;
  highContrast: boolean;
  contrastColors?: {
    text: string;
    background: string;
    primary: string;
    secondary: string;
  };
}

export function useAccessibility() {
  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccessibilitySettings();
  }, []);

  const loadAccessibilitySettings = async () => {
    try {
      await customizationService.initialize();
      const settings = customizationService.getSettings();
      if (settings?.accessibility) {
        setAccessibilityOptions(settings.accessibility);
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessibilityStyles = (): AccessibilityStyles => {
    if (!accessibilityOptions) {
      return {
        fontSizeMultiplier: 1.0,
        fontWeight: undefined,
        highContrast: false,
      };
    }

    const styles: AccessibilityStyles = {
      fontSizeMultiplier: 1.0,
      fontWeight: undefined,
      highContrast: accessibilityOptions.highContrast,
    };

    // Apply font size multiplier based on Large Text setting
    if (accessibilityOptions.largeText) {
      styles.fontSizeMultiplier = 1.3;
    }

    // Apply bold text
    if (accessibilityOptions.boldText) {
      styles.fontWeight = 'bold';
    }

    // Apply high contrast colors
    if (accessibilityOptions.highContrast) {
      styles.contrastColors = {
        text: '#FFFFFF',
        background: '#000000',
        primary: '#00FFFF',
        secondary: '#FFFF00',
      };
    }

    return styles;
  };

  const updateAccessibilityOption = async (key: keyof AccessibilityOptions, value: boolean) => {
    try {
      customizationService.updateAccessibilityOptions({ [key]: value });
      
      // Reload settings to get updated values
      const updatedSettings = customizationService.getSettings();
      if (updatedSettings?.accessibility) {
        setAccessibilityOptions(updatedSettings.accessibility);
      }
    } catch (error) {
      console.error('Failed to update accessibility option:', error);
    }
  };

  return {
    accessibilityOptions,
    isLoading,
    getAccessibilityStyles,
    updateAccessibilityOption,
    reloadSettings: loadAccessibilitySettings,
  };
}
