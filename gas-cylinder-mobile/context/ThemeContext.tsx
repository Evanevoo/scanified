import logger from '../utils/logger';
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccessibility } from '../hooks/useAccessibility';

// Mobile theme definitions — aligned with Scanified web app (teal + purple, soft surfaces)
const mobileThemes = {
  light: {
    primary: '#40B5AD', // Scanified teal
    primaryDark: '#2E9B94',
    primaryLight: '#5FCDC5',
    secondary: '#8B7BA8', // Scanified purple
    secondaryLight: '#A599C1',
    background: '#F4F2FA', // Soft lavender canvas (matches web body wash)
    surface: '#FFFFFF',
    surfaceSoft: '#F9FAFB',
    glassSurface: 'rgba(255, 255, 255, 0.88)',
    text: '#1F2937',
    textSecondary: '#6B7280',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
    border: '#E5E7EB',
    borderSoft: 'rgba(255, 255, 255, 0.82)',
    shadow: 'rgba(99, 102, 241, 0.18)', // Soft purple-tinted shadow
    shadowStrong: 'rgba(64, 181, 173, 0.28)',
    cardBackground: '#FFFFFF',
    statusBar: 'dark-content' as const,
    gradient: ['#40B5AD', '#8B7BA8'], // Teal → purple to match web CTAs
    heroGradient: ['#F0F2F7', '#F4F2FF', '#FFF5F8'],
    buttonGradient: ['#40B5AD', '#2E9B94'],
    motion: {
      pressScale: 0.96,
      pressOpacity: 0.9,
      springDamping: 16,
      springStiffness: 320,
      timingMs: 120,
    },
  },
  dark: {
    primary: '#5FCDC5',
    primaryDark: '#40B5AD',
    primaryLight: '#8CE0DA',
    secondary: '#A599C1',
    secondaryLight: '#C7BEE0',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSoft: '#172033',
    glassSurface: 'rgba(30, 41, 59, 0.88)',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
    border: '#334155',
    borderSoft: 'rgba(148, 163, 184, 0.22)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowStrong: 'rgba(95, 205, 197, 0.24)',
    cardBackground: '#1E293B',
    statusBar: 'light-content' as const,
    gradient: ['#5FCDC5', '#A599C1'],
    heroGradient: ['#0F172A', '#182236', '#241B36'],
    buttonGradient: ['#5FCDC5', '#40B5AD'],
    motion: {
      pressScale: 0.96,
      pressOpacity: 0.9,
      springDamping: 16,
      springStiffness: 320,
      timingMs: 120,
    },
  },
  blue: {
    primary: '#1e40af',
    primaryDark: '#1e3a8a',
    primaryLight: '#60a5fa',
    secondary: '#0891b2',
    secondaryLight: '#67e8f9',
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceSoft: '#f1f5f9',
    glassSurface: 'rgba(255, 255, 255, 0.88)',
    text: '#111827',
    textSecondary: '#6b7280',
    error: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    info: '#0891b2',
    border: '#e5e7eb',
    borderSoft: 'rgba(255, 255, 255, 0.82)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(30, 64, 175, 0.24)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
    gradient: ['#1e40af', '#0891b2'],
    heroGradient: ['#eff6ff', '#f8fafc', '#ecfeff'],
    buttonGradient: ['#2563eb', '#1e40af'],
    motion: {
      pressScale: 0.96,
      pressOpacity: 0.9,
      springDamping: 16,
      springStiffness: 320,
      timingMs: 120,
    },
  },
  green: {
    primary: '#16a34a',
    primaryDark: '#15803d',
    primaryLight: '#4ade80',
    secondary: '#0891b2',
    secondaryLight: '#67e8f9',
    background: '#f7fdf7',
    surface: '#ffffff',
    surfaceSoft: '#f0fdf4',
    glassSurface: 'rgba(255, 255, 255, 0.88)',
    text: '#14532d',
    textSecondary: '#16a34a',
    error: '#dc2626',
    warning: '#ca8a04',
    success: '#16a34a',
    info: '#0891b2',
    border: '#d1fae5',
    borderSoft: 'rgba(255, 255, 255, 0.82)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(22, 163, 74, 0.24)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
    gradient: ['#16a34a', '#0891b2'],
    heroGradient: ['#f0fdf4', '#f7fdf7', '#ecfeff'],
    buttonGradient: ['#22c55e', '#16a34a'],
    motion: {
      pressScale: 0.96,
      pressOpacity: 0.9,
      springDamping: 16,
      springStiffness: 320,
      timingMs: 120,
    },
  },
  orange: {
    primary: '#ea580c',
    primaryDark: '#c2410c',
    primaryLight: '#fb923c',
    secondary: '#dc2626',
    secondaryLight: '#f87171',
    background: '#fffbf5',
    surface: '#ffffff',
    surfaceSoft: '#fff7ed',
    glassSurface: 'rgba(255, 255, 255, 0.88)',
    text: '#7c2d12',
    textSecondary: '#ea580c',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#0891b2',
    border: '#fde4c4',
    borderSoft: 'rgba(255, 255, 255, 0.82)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(234, 88, 12, 0.24)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
    gradient: ['#ea580c', '#dc2626'],
    heroGradient: ['#fff7ed', '#fffbf5', '#fef2f2'],
    buttonGradient: ['#fb923c', '#ea580c'],
    motion: {
      pressScale: 0.96,
      pressOpacity: 0.9,
      springDamping: 16,
      springStiffness: 320,
      timingMs: 120,
    },
  },
};

type ThemeType = keyof typeof mobileThemes;
type Theme = (typeof mobileThemes)[ThemeType];

interface ThemeContextType {
  theme: Theme;
  currentTheme: ThemeType;
  isDarkMode: boolean;
  changeTheme: (themeName: ThemeType) => void;
  toggleDarkMode: () => void;
  availableThemes: typeof mobileThemes;
  accessibilityStyles: any; // Accessibility styles for dynamic styling
}

// Create context with default theme
const defaultTheme = mobileThemes.light;
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  currentTheme: 'light',
  isDarkMode: false,
  changeTheme: () => {},
  toggleDarkMode: () => {},
  availableThemes: mobileThemes,
  accessibilityStyles: { fontSizeMultiplier: 1.0, fontWeight: undefined, highContrast: false },
});

// Hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default theme if context is not available
    const defaultTheme = mobileThemes.light;
    return {
      theme: defaultTheme,
      colors: defaultTheme, // Add colors as alias for theme
      currentTheme: 'light',
      isDarkMode: false,
      changeTheme: () => {},
      toggleDarkMode: () => {},
      availableThemes: mobileThemes,
    };
  }
  // Add colors as alias for theme in the returned context
  return {
    ...context,
    colors: context.theme, // Add colors as alias for theme
  };
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get accessibility styles
  const { getAccessibilityStyles } = useAccessibility();

  // Load theme from AsyncStorage on app start
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app-theme');
      const savedDarkMode = await AsyncStorage.getItem('app-dark-mode');
      
      if (savedTheme && mobileThemes[savedTheme as ThemeType]) {
        setCurrentTheme(savedTheme as ThemeType);
      }
      
      if (savedDarkMode === 'true') {
        setIsDarkMode(true);
      }
    } catch (error) {
      logger.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (themeName: ThemeType, darkMode: boolean) => {
    try {
      await AsyncStorage.setItem('app-theme', themeName);
      await AsyncStorage.setItem('app-dark-mode', darkMode.toString());
    } catch (error) {
      logger.error('Error saving theme:', error);
    }
  };

  const changeTheme = (themeName: ThemeType) => {
    setCurrentTheme(themeName);
    const newDarkMode = themeName === 'dark';
    setIsDarkMode(newDarkMode);
    saveTheme(themeName, newDarkMode);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    const newTheme = newDarkMode ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    setIsDarkMode(newDarkMode);
    saveTheme(newTheme, newDarkMode);
  };

  const baseTheme = mobileThemes[currentTheme] || mobileThemes.light;
  const accessibilityStyles = getAccessibilityStyles();
  
  // Apply accessibility modifications to theme
  let theme = { ...baseTheme };
  
  if (accessibilityStyles.fontSizeMultiplier > 1.0) {
    // Font size adjustments will be applied via dynamic styles
    logger.log(`Accessibility: Font size multiplier set to ${accessibilityStyles.fontSizeMultiplier}`);
  }
  
  if (accessibilityStyles.contrastColors) {
    // Apply high contrast colors
    theme = {
      ...theme,
      ...accessibilityStyles.contrastColors,
    };
    logger.log('Accessibility: High contrast mode enabled');
  }

  const contextValue: ThemeContextType = {
    theme,
    currentTheme,
    isDarkMode,
    changeTheme,
    toggleDarkMode,
    availableThemes: mobileThemes,
    accessibilityStyles, // Add accessibility styles to context
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme metadata for mobile
export const mobileThemeMetadata = {
  light: {
    name: 'Light',
    description: 'Clean light theme',
    category: 'Default',
  },
  dark: {
    name: 'Dark',
    description: 'Dark theme for low-light use',
    category: 'Default',
  },
  blue: {
    name: 'Corporate Blue',
    description: 'Professional blue theme',
    category: 'Professional',
  },
  green: {
    name: 'Eco Green',
    description: 'Nature-inspired green theme',
    category: 'Themed',
  },
  orange: {
    name: 'Energy Orange',
    description: 'Vibrant orange theme',
    category: 'Themed',
  },
};

export default ThemeProvider; 