import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobile theme definitions
const mobileThemes = {
  light: {
    primary: '#2563eb',
    secondary: '#10b981',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
    border: '#e2e8f0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#10b981',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
    border: '#334155',
    shadow: 'rgba(0, 0, 0, 0.3)',
    cardBackground: '#1e293b',
    statusBar: 'light-content' as const,
  },
  blue: {
    primary: '#1e40af',
    secondary: '#0891b2',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    error: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    info: '#0891b2',
    border: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.1)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
  },
  green: {
    primary: '#16a34a',
    secondary: '#0891b2',
    background: '#f7fdf7',
    surface: '#ffffff',
    text: '#14532d',
    textSecondary: '#16a34a',
    error: '#dc2626',
    warning: '#ca8a04',
    success: '#16a34a',
    info: '#0891b2',
    border: '#d1fae5',
    shadow: 'rgba(0, 0, 0, 0.1)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
  },
  orange: {
    primary: '#ea580c',
    secondary: '#dc2626',
    background: '#fffbf5',
    surface: '#ffffff',
    text: '#7c2d12',
    textSecondary: '#ea580c',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#0891b2',
    border: '#fde4c4',
    shadow: 'rgba(0, 0, 0, 0.1)',
    cardBackground: '#ffffff',
    statusBar: 'dark-content' as const,
  },
};

type ThemeType = keyof typeof mobileThemes;
type Theme = typeof mobileThemes.light;

interface ThemeContextType {
  theme: Theme;
  currentTheme: ThemeType;
  isDarkMode: boolean;
  changeTheme: (themeName: ThemeType) => void;
  toggleDarkMode: () => void;
  availableThemes: typeof mobileThemes;
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
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (themeName: ThemeType, darkMode: boolean) => {
    try {
      await AsyncStorage.setItem('app-theme', themeName);
      await AsyncStorage.setItem('app-dark-mode', darkMode.toString());
    } catch (error) {
      console.error('Error saving theme:', error);
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

  const theme = mobileThemes[currentTheme] || mobileThemes.light;

  const contextValue: ThemeContextType = {
    theme,
    currentTheme,
    isDarkMode,
    changeTheme,
    toggleDarkMode,
    availableThemes: mobileThemes,
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