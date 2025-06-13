import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultScanMode: 'SHIP' | 'RETURN';
  offlineMode: boolean;
  lastSync: string;
  autoSync: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  clearAllData: () => Promise<void>;
  resetSettings: () => Promise<void>;
  getDebugInfo: () => string;
}

const defaultSettings: Settings = {
  theme: 'auto',
  soundEnabled: true,
  vibrationEnabled: true,
  defaultScanMode: 'SHIP',
  offlineMode: false,
  lastSync: 'Never',
  autoSync: true,
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

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('app_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
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
      console.error('Error clearing data:', error);
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      await saveSettings(defaultSettings);
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
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

  if (!isLoaded) {
    return null; // Or a loading component
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        clearAllData,
        resetSettings,
        getDebugInfo,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 