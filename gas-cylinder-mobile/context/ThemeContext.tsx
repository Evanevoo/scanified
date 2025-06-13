import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from './SettingsContext';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  danger: string;
}

const lightTheme: ThemeColors = {
  primary: '#2563eb',
  secondary: '#64748b',
  background: '#F8FAFC',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ff5a1f',
};

const darkTheme: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#94a3b8',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  error: '#f87171',
  warning: '#fbbf24',
  success: '#34d399',
  danger: '#fb7185',
};

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let shouldBeDark = false;
    
    switch (settings.theme) {
      case 'light':
        shouldBeDark = false;
        break;
      case 'dark':
        shouldBeDark = true;
        break;
      case 'auto':
        shouldBeDark = systemColorScheme === 'dark';
        break;
    }
    
    setIsDark(shouldBeDark);
  }, [settings.theme, systemColorScheme]);

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}; 