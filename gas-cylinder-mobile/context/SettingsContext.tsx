import logger from '../utils/logger';
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultScanMode: 'SHIP' | 'RETURN';
  offlineMode: boolean;
  lastSync: string;
  autoSync: boolean;
  notifications: boolean;
  hapticFeedback: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  clearAllData: () => Promise<void>;
  resetSettings: () => Promise<void>;
  getDebugInfo: () => string;
  isLoaded: boolean;
}

const defaultSettings: Settings = {
  theme: 'auto',
  soundEnabled: true,
  vibrationEnabled: true,
  defaultScanMode: 'SHIP',
  offlineMode: false,
  lastSync: 'Never',
  autoSync: true,
  notifications: true,
  hapticFeedback: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from AsyncStorage on app start
  useEffect(() => {
    loadSettings();
  }, []);

  const migrateSettings = (storedSettings: any): Settings => {
    // Ensure all required properties exist with defaults
    return {
      theme: storedSettings.theme || defaultSettings.theme,
      soundEnabled: storedSettings.soundEnabled !== undefined ? storedSettings.soundEnabled : defaultSettings.soundEnabled,
      vibrationEnabled: storedSettings.vibrationEnabled !== undefined ? storedSettings.vibrationEnabled : defaultSettings.vibrationEnabled,
      defaultScanMode: storedSettings.defaultScanMode || defaultSettings.defaultScanMode,
      offlineMode: storedSettings.offlineMode !== undefined ? storedSettings.offlineMode : defaultSettings.offlineMode,
      lastSync: storedSettings.lastSync || defaultSettings.lastSync,
      autoSync: storedSettings.autoSync !== undefined ? storedSettings.autoSync : defaultSettings.autoSync,
      notifications: storedSettings.notifications !== undefined ? storedSettings.notifications : defaultSettings.notifications,
      hapticFeedback: storedSettings.hapticFeedback !== undefined ? storedSettings.hapticFeedback : defaultSettings.hapticFeedback,
    };
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('app_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Migrate settings to ensure all properties exist
        const migratedSettings = migrateSettings(parsedSettings);
        logger.log('🔧 Loading settings:', { stored: parsedSettings, migrated: migratedSettings });
        setSettings(migratedSettings);
        // Save migrated settings back to storage
        await saveSettings(migratedSettings);
      } else {
        logger.log('🔧 No stored settings found, using defaults');
        setSettings(defaultSettings);
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
      // Keep default settings if loading fails
      setSettings(defaultSettings);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      logger.error('Error saving settings:', error);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    logger.log('🔧 Updating setting:', { key, value, currentSettings: settings });
    
    // Use functional update to ensure we get the latest state
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings, [key]: value };
      logger.log('🔧 New settings:', newSettings);
      
      // Save to storage asynchronously
      saveSettings(newSettings);
      
      return newSettings;
    });
  };

  const clearAllData = async () => {
    try {
      // Clear all AsyncStorage data
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      
      // Reset settings to defaults
      setSettings(defaultSettings);
      await saveSettings(defaultSettings);
      
      return true;
    } catch (error) {
      logger.error('Error clearing data:', error);
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      await saveSettings(defaultSettings);
      return true;
    } catch (error) {
      logger.error('Error resetting settings:', error);
      return false;
    }
  };

  const getDebugInfo = () => {
    return JSON.stringify({
      settings,
      appVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      storageKeys: AsyncStorage.getAllKeys().then(keys => keys.length),
    }, null, 2);
  };

  // Always provide the context, even while loading
  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        clearAllData,
        resetSettings,
        getDebugInfo,
        isLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 