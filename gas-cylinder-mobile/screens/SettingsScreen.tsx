import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Alert,
  Linking,
  Share,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';
import { SyncService } from '../services/SyncService';
import { copyToClipboard } from '../utils/clipboard';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, profile, loading } = useAuth();
  const { settings, updateSetting, clearAllData, resetSettings, getDebugInfo } = useSettings();
  const { colors } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    loadOfflineData();
    checkConnectivity();
  }, []);

  const loadOfflineData = async () => {
    const count = await SyncService.getOfflineScanCount();
    setOfflineCount(count);
  };

  const checkConnectivity = async () => {
    const connected = await SyncService.checkConnectivity();
    setIsConnected(connected);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              // Navigation will be handled automatically by the auth state change
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!isConnected) {
      Alert.alert('No Connection', 'Please check your internet connection and try again.');
      return;
    }

    setSyncing(true);
    try {
      const result = await SyncService.syncOfflineData();
      await SyncService.updateLastSyncTime();
      await loadOfflineData();
      
      if (result.success) {
        Alert.alert(
          'Sync Complete', 
          result.message,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          result.message,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Get sync status for display
  const getSyncStatusText = () => {
    if (syncing) return 'Syncing...';
    if (!isConnected) return 'Offline';
    if (offlineCount > 0) return `${settings.lastSync} (${offlineCount} pending)`;
    return settings.lastSync;
  };

  const getSyncStatusColor = () => {
    if (syncing) return colors.primary;
    if (!isConnected) return colors.warning;
    if (offlineCount > 0) return colors.warning;
    return colors.text;
  };

  const handleTestOfflineScan = async () => {
    try {
      const testScan = {
        order_number: 'TEST_ORDER_001',
        cylinder_barcode: '123456789',
        mode: 'SHIP',
        customer_id: 'test-customer',
        location: 'Test Location',
        user_id: user?.id || 'test-user',
      };
      
      await SyncService.saveOfflineScan(testScan);
      await loadOfflineData();
      Alert.alert('Test Scan Saved', 'Test scan has been saved offline. Check the offline count above.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save test scan: ' + error.message);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will remove all local data including offline scans and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await clearAllData();
              if (success) {
                Alert.alert('Success', 'All local data has been cleared.');
                await loadOfflineData();
              } else {
                Alert.alert('Error', 'Failed to clear data. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await resetSettings();
              if (success) {
                Alert.alert('Success', 'Settings have been reset to defaults.');
              } else {
                Alert.alert('Error', 'Failed to reset settings. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@yourcompany.com?subject=Gas Cylinder App Support');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://yourcompany.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://yourcompany.com/terms');
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out this Gas Cylinder Management App!',
        url: 'https://yourcompany.com/app',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share app.');
    }
  };

  const handleDebugInfo = () => {
    const debugInfo = getDebugInfo();
    Alert.alert(
      'Debug Information',
      debugInfo,
      [
        { text: 'Copy', onPress: () => copyToClipboard(debugInfo) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will reset the entire app to factory settings. All data will be lost. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all data
              await clearAllData();
              // Reset settings
              await resetSettings();
              // Sign out user
              await supabase.auth.signOut();
              Alert.alert('Success', 'App has been reset. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Settings</Text>

      {/* Account Section */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Account</Text>
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Name</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>{profile?.full_name || user?.email?.split('@')[0] || 'N/A'}</Text>
      </View>
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Email</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>{user?.email || 'N/A'}</Text>
      </View>
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Role</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>{profile?.role || 'user'}</Text>
      </View>
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleLogout}>
        <Text style={[styles.settingText, { color: colors.danger }]}>Logout</Text>
      </TouchableOpacity>

      {/* App Preferences */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>App Preferences</Text>
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Theme</Text>
        <View style={styles.themeContainer}>
          <TouchableOpacity 
            style={[
              styles.themeButton, 
              { 
                backgroundColor: settings.theme === 'light' ? colors.primary : colors.border,
                borderColor: colors.border
              }
            ]}
            onPress={() => updateSetting('theme', 'light')}
          >
            <Text style={[
              styles.themeButtonText, 
              { color: settings.theme === 'light' ? '#fff' : colors.textSecondary }
            ]}>
              Light
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.themeButton, 
              { 
                backgroundColor: settings.theme === 'dark' ? colors.primary : colors.border,
                borderColor: colors.border
              }
            ]}
            onPress={() => updateSetting('theme', 'dark')}
          >
            <Text style={[
              styles.themeButtonText, 
              { color: settings.theme === 'dark' ? '#fff' : colors.textSecondary }
            ]}>
              Dark
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.themeButton, 
              { 
                backgroundColor: settings.theme === 'auto' ? colors.primary : colors.border,
                borderColor: colors.border
              }
            ]}
            onPress={() => updateSetting('theme', 'auto')}
          >
            <Text style={[
              styles.themeButtonText, 
              { color: settings.theme === 'auto' ? '#fff' : colors.textSecondary }
            ]}>
              Auto
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Sound</Text>
        <Switch 
          value={settings.soundEnabled} 
          onValueChange={(value) => updateSetting('soundEnabled', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={settings.soundEnabled ? '#fff' : colors.surface}
        />
      </View>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Vibration</Text>
        <Switch 
          value={settings.vibrationEnabled} 
          onValueChange={(value) => updateSetting('vibrationEnabled', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={settings.vibrationEnabled ? '#fff' : colors.surface}
        />
      </View>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Default Scan Mode</Text>
        <View style={styles.themeContainer}>
          <TouchableOpacity 
            style={[
              styles.themeButton, 
              { 
                backgroundColor: settings.defaultScanMode === 'SHIP' ? colors.primary : colors.border,
                borderColor: colors.border
              }
            ]}
            onPress={() => updateSetting('defaultScanMode', 'SHIP')}
          >
            <Text style={[
              styles.themeButtonText, 
              { color: settings.defaultScanMode === 'SHIP' ? '#fff' : colors.textSecondary }
            ]}>
              SHIP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.themeButton, 
              { 
                backgroundColor: settings.defaultScanMode === 'RETURN' ? colors.primary : colors.border,
                borderColor: colors.border
              }
            ]}
            onPress={() => updateSetting('defaultScanMode', 'RETURN')}
          >
            <Text style={[
              styles.themeButtonText, 
              { color: settings.defaultScanMode === 'RETURN' ? '#fff' : colors.textSecondary }
            ]}>
              RETURN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Offline Mode</Text>
        <Switch 
          value={settings.offlineMode} 
          onValueChange={(value) => updateSetting('offlineMode', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={settings.offlineMode ? '#fff' : colors.surface}
        />
      </View>

      {/* Sync & Data */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Sync & Data</Text>
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleManualSync} disabled={syncing}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Manual Sync</Text>
        <View style={styles.syncContainer}>
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.settingValue, { color: getSyncStatusColor() }]}>
              {getSyncStatusText()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Auto Sync</Text>
        <Switch 
          value={settings.autoSync} 
          onValueChange={(value) => updateSetting('autoSync', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={settings.autoSync ? '#fff' : colors.surface}
        />
      </View>
      
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleTestOfflineScan}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Test Offline Scan</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleClearData}>
        <Text style={[styles.settingText, { color: colors.danger }]}>Clear Local Data</Text>
      </TouchableOpacity>

      {/* Support & About */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Support & About</Text>
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleContactSupport}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Contact Support</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>support@yourcompany.com</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleShareApp}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Share App</Text>
      </TouchableOpacity>
      
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingText, { color: colors.primary }]}>App Version</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>1.0.0</Text>
      </View>
      
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePrivacyPolicy}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Privacy Policy</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleTermsOfService}>
        <Text style={[styles.settingText, { color: colors.primary }]}>Terms of Service</Text>
      </TouchableOpacity>

      {/* Admin Only */}
      {profile?.role === 'admin' && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Admin Only</Text>
          <TouchableOpacity 
            style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={[styles.settingText, { color: colors.primary }]}>Manage Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleDebugInfo}>
            <Text style={[styles.settingText, { color: colors.primary }]}>Debug Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleResetSettings}>
            <Text style={[styles.settingText, { color: colors.warning }]}>Reset Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleResetApp}>
            <Text style={[styles.settingText, { color: colors.danger }]}>Reset App</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  settingRow: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  themeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});