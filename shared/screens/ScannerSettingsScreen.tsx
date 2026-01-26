/**
 * ScannerSettingsScreen - Configuration screen for enhanced scanner
 * 
 * Allows users to configure:
 * - Scanning mode (single/batch/concurrent)
 * - Image processing options
 * - Performance settings
 * - Batch scanning options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@scanner_settings';

export interface ScannerSettings {
  // Scanning mode
  mode: 'single' | 'batch' | 'concurrent';
  
  // Image processing
  imageProcessing: {
    multiFrame: boolean;
    lowLight: boolean;
    damageRecovery: boolean;
    enhancement: boolean;
  };
  
  // Performance
  performance: {
    fps: number | 'auto';
    cacheSize: number;
    workerThreads: number;
    skipSimilarFrames: boolean;
  };
  
  // Batch settings
  batch: {
    duplicateCooldown: number;
    autoCompleteThreshold?: number;
    targetRate?: number;
  };
}

const defaultSettings: ScannerSettings = {
  mode: 'single',
  imageProcessing: {
    multiFrame: true,
    lowLight: true,
    damageRecovery: false,
    enhancement: true,
  },
  performance: {
    fps: 'auto',
    cacheSize: 100,
    workerThreads: 2,
    skipSimilarFrames: true,
  },
  batch: {
    duplicateCooldown: 500,
  },
};

const ScannerSettingsScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<ScannerSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load scanner settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setHasChanges(false);
      Alert.alert('Success', 'Scanner settings saved successfully');
    } catch (error) {
      console.error('Failed to save scanner settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all scanner settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings(defaultSettings);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const updateSettings = (updates: Partial<ScannerSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateImageProcessing = (key: keyof ScannerSettings['imageProcessing'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      imageProcessing: {
        ...prev.imageProcessing,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const updatePerformance = (key: keyof ScannerSettings['performance'], value: any) => {
    setSettings(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Scanner Settings</Text>
        <TouchableOpacity onPress={resetToDefaults} style={styles.resetButton}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Scanning Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scanning Mode</Text>
          
          <TouchableOpacity
            style={[styles.option, settings.mode === 'single' && styles.optionSelected]}
            onPress={() => updateSettings({ mode: 'single' })}
          >
            <Ionicons 
              name="radio-button-on" 
              size={24} 
              color={settings.mode === 'single' ? '#007AFF' : '#CCC'} 
            />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Single Scan</Text>
              <Text style={styles.optionDescription}>Scan one barcode at a time</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, settings.mode === 'batch' && styles.optionSelected]}
            onPress={() => updateSettings({ mode: 'batch' })}
          >
            <Ionicons 
              name="radio-button-on" 
              size={24} 
              color={settings.mode === 'batch' ? '#007AFF' : '#CCC'} 
            />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Batch Scan</Text>
              <Text style={styles.optionDescription}>Rapid sequential scanning (2-5 scans/sec)</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, settings.mode === 'concurrent' && styles.optionSelected]}
            onPress={() => updateSettings({ mode: 'concurrent' })}
          >
            <Ionicons 
              name="radio-button-on" 
              size={24} 
              color={settings.mode === 'concurrent' ? '#007AFF' : '#CCC'} 
            />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Concurrent Scan</Text>
              <Text style={styles.optionDescription}>Detect multiple barcodes simultaneously</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Image Processing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Image Processing</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Multi-Frame Analysis</Text>
              <Text style={styles.settingDescription}>Combine results from multiple frames</Text>
            </View>
            <Switch
              value={settings.imageProcessing.multiFrame}
              onValueChange={value => updateImageProcessing('multiFrame', value)}
              trackColor={{ false: '#CCC', true: '#007AFF' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Low-Light Optimization</Text>
              <Text style={styles.settingDescription}>Enhance scanning in dark environments</Text>
            </View>
            <Switch
              value={settings.imageProcessing.lowLight}
              onValueChange={value => updateImageProcessing('lowLight', value)}
              trackColor={{ false: '#CCC', true: '#007AFF' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Damage Recovery</Text>
              <Text style={styles.settingDescription}>Attempt to read damaged barcodes</Text>
            </View>
            <Switch
              value={settings.imageProcessing.damageRecovery}
              onValueChange={value => updateImageProcessing('damageRecovery', value)}
              trackColor={{ false: '#CCC', true: '#007AFF' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Image Enhancement</Text>
              <Text style={styles.settingDescription}>Auto-adjust contrast and brightness</Text>
            </View>
            <Switch
              value={settings.imageProcessing.enhancement}
              onValueChange={value => updateImageProcessing('enhancement', value)}
              trackColor={{ false: '#CCC', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Frame Rate</Text>
              <Text style={styles.settingDescription}>
                Current: {settings.performance.fps === 'auto' ? 'Auto' : `${settings.performance.fps} FPS`}
              </Text>
            </View>
            <View style={styles.fpsOptions}>
              {['auto', 5, 10, 15, 30].map(fps => (
                <TouchableOpacity
                  key={fps}
                  style={[
                    styles.fpsButton,
                    settings.performance.fps === fps && styles.fpsButtonSelected,
                  ]}
                  onPress={() => updatePerformance('fps', fps)}
                >
                  <Text
                    style={[
                      styles.fpsButtonText,
                      settings.performance.fps === fps && styles.fpsButtonTextSelected,
                    ]}
                  >
                    {fps === 'auto' ? 'Auto' : fps}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Cache Size</Text>
              <Text style={styles.settingDescription}>
                Store last {settings.performance.cacheSize} scans
              </Text>
            </View>
            <View style={styles.fpsOptions}>
              {[50, 100, 200].map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fpsButton,
                    settings.performance.cacheSize === size && styles.fpsButtonSelected,
                  ]}
                  onPress={() => updatePerformance('cacheSize', size)}
                >
                  <Text
                    style={[
                      styles.fpsButtonText,
                      settings.performance.cacheSize === size && styles.fpsButtonTextSelected,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Skip Similar Frames</Text>
              <Text style={styles.settingDescription}>Improve performance by skipping duplicates</Text>
            </View>
            <Switch
              value={settings.performance.skipSimilarFrames}
              onValueChange={value => updatePerformance('skipSimilarFrames', value)}
              trackColor={{ false: '#CCC', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Batch Settings */}
        {settings.mode === 'batch' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batch Scanning</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Duplicate Cooldown</Text>
                <Text style={styles.settingDescription}>
                  {settings.batch.duplicateCooldown}ms between same barcode
                </Text>
              </View>
              <View style={styles.fpsOptions}>
                {[200, 500, 1000, 2000].map(cooldown => (
                  <TouchableOpacity
                    key={cooldown}
                    style={[
                      styles.fpsButton,
                      settings.batch.duplicateCooldown === cooldown && styles.fpsButtonSelected,
                    ]}
                    onPress={() =>
                      updateSettings({
                        batch: { ...settings.batch, duplicateCooldown: cooldown },
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.fpsButtonText,
                        settings.batch.duplicateCooldown === cooldown && styles.fpsButtonTextSelected,
                      ]}
                    >
                      {cooldown}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionSelected: {
    backgroundColor: '#F0F7FF',
  },
  optionContent: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  fpsOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fpsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fpsButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fpsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  fpsButtonTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ScannerSettingsScreen;

// Export helper to load settings
export async function loadScannerSettings(): Promise<ScannerSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load scanner settings:', error);
  }
  return defaultSettings;
}

// Export helper to save settings
export async function saveScannerSettings(settings: ScannerSettings): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save scanner settings:', error);
    return false;
  }
}
