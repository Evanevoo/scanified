import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';
import { SyncService } from '../services/SyncService';
import { connectivityService } from '../services/ConnectivityService';
import { notificationService } from '../services/NotificationService';
import { offlineModeService } from '../services/OfflineModeService';
import { customizationService, LayoutOptions } from '../services/customizationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useAccessibility } from '../hooks/useAccessibility';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, profile, loading } = useAuth();
  const { settings, updateSetting, clearAllData, resetSettings } = useSettings();
  const { colors } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // Customization settings
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions | null>(null);
  const { accessibilityOptions, updateAccessibilityOption } = useAccessibility();

  useEffect(() => {
    loadOfflineData();
    checkConnectivity();
    loadCustomizationSettings();
  }, []);

  const loadOfflineData = async () => {
    const count = await SyncService.getOfflineScanCount();
    setOfflineCount(count);
  };

  const checkConnectivity = async () => {
    const connected = await SyncService.checkConnectivity();
    setIsConnected(connected);
  };

  const loadCustomizationSettings = async () => {
    try {
      const customizationSettings = customizationService.getSettings();
      if (customizationSettings) {
        setLayoutOptions(customizationSettings.layout);
      }
    } catch (error) {
      console.error('Failed to load customization settings:', error);
    }
  };

  const updateLayoutOption = (key: keyof LayoutOptions, value: any) => {
    if (!layoutOptions) return;

    const updated = { ...layoutOptions, [key]: value };
    setLayoutOptions(updated);
    customizationService.updateLayoutOptions({ [key]: value });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await SyncService.syncOfflineData();
      await loadOfflineData();
      
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Sync Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Sync Failed', error.message || 'Unknown error occurred');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              await supabase.auth.signOut();
              await AsyncStorage.clear();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all offline data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadOfflineData();
            Alert.alert('Success', 'All data cleared');
          },
        },
      ]
    );
  };

  // Individual toggle handlers to prevent interference
  const handleAutoSyncToggle = useCallback(async (value: boolean) => {
    console.log('🔄 Auto Sync toggle:', value);
    updateSetting('autoSync', value);
    
    // Send notification about auto-sync change
    await notificationService.sendSyncNotification(
      true, 
      `Auto-sync ${value ? 'enabled' : 'disabled'}. ${value ? 'Data will sync automatically when connected.' : 'Manual sync required.'}`
    );
  }, [updateSetting]);

  const handleOfflineModeToggle = useCallback(async (value: boolean) => {
    console.log('🔄 Offline Mode toggle:', value);
    updateSetting('offlineMode', value);
    
    // Update offline mode service
    await offlineModeService.setOfflineMode(value);
    
    // Send notification about offline mode change
    await notificationService.sendOfflineModeNotification(value);
  }, [updateSetting]);

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    console.log('🔄 Notifications toggle:', value);
    updateSetting('notifications', value);
    
    // Update notification service settings
    await notificationService.updateNotificationSettings({ enabled: value });
    
    // Send test notification if enabling
    if (value) {
      await notificationService.sendLocalNotification({
        title: 'Notifications Enabled',
        body: 'You will now receive notifications for scans, syncs, and important updates.',
        priority: 'default',
      });
    }
  }, [updateSetting]);

  const handleSoundEffectsToggle = useCallback((value: boolean) => {
    console.log('🔄 Sound Effects toggle:', value);
    updateSetting('soundEnabled', value);
  }, [updateSetting]);

  const handleHapticFeedbackToggle = useCallback((value: boolean) => {
    console.log('🔄 Haptic Feedback toggle:', value);
    updateSetting('hapticFeedback', value);
  }, [updateSetting]);

  const SettingItem = ({ title, subtitle, onPress, rightComponent, showBorder = true }) => (
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
        !showBorder && { borderBottomWidth: 0 }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileInfo}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileAvatarText}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {profile?.full_name || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
              <Text style={[styles.profileRole, { color: colors.primary }]}>
                {profile?.role?.charAt(0)?.toUpperCase() + profile?.role?.slice(1) || 'User'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sync & Data Section */}
        <SectionHeader title="SYNC & DATA" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Sync Data"
            subtitle={`${offlineCount} items pending sync`}
            onPress={handleSync}
            rightComponent={
              syncing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
              )
            }
          />
          <SettingItem
            title="Auto Sync"
            subtitle="Automatically sync when connected"
            rightComponent={
              <Switch
                key="autoSync"
                value={settings.autoSync}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={settings.autoSync ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Offline Mode"
            subtitle="Work without internet connection"
            rightComponent={
              <Switch
                key="offlineMode"
                value={settings.offlineMode}
                onValueChange={handleOfflineModeToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={settings.offlineMode ? colors.primary : colors.textSecondary}
              />
            }
            showBorder={false}
          />
        </View>

        {/* App Preferences */}
        <SectionHeader title="APP PREFERENCES" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Notifications"
            subtitle="Push notifications and alerts"
            rightComponent={
              <Switch
                key="notifications"
                value={settings.notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={settings.notifications ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Sound Effects"
            subtitle="Scan sounds and feedback"
            rightComponent={
              <Switch
                key="soundEnabled"
                value={settings.soundEnabled}
                onValueChange={handleSoundEffectsToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={settings.soundEnabled ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Haptic Feedback"
            subtitle="Vibration on interactions"
            rightComponent={
              <Switch
                key="hapticFeedback"
                value={settings.hapticFeedback}
                onValueChange={handleHapticFeedbackToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={settings.hapticFeedback ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Font Size"
            subtitle="Text size for better readability"
            rightComponent={
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={layoutOptions?.fontSize || 'medium'}
                  onValueChange={(value) => updateLayoutOption('fontSize', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="S" value="small" />
                  <Picker.Item label="M" value="medium" />
                  <Picker.Item label="L" value="large" />
                  <Picker.Item label="XL" value="extra-large" />
                </Picker>
              </View>
            }
          />
          <SettingItem
            title="Button Size"
            subtitle="Touch target size"
            rightComponent={
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={layoutOptions?.buttonSize || 'comfortable'}
                  onValueChange={(value) => updateLayoutOption('buttonSize', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="S" value="compact" />
                  <Picker.Item label="M" value="comfortable" />
                  <Picker.Item label="L" value="large" />
                </Picker>
              </View>
            }
          />
          <SettingItem
            title="Spacing"
            subtitle="Element spacing and layout"
            rightComponent={
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={layoutOptions?.spacing || 'normal'}
                  onValueChange={(value) => updateLayoutOption('spacing', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Tight" value="tight" />
                  <Picker.Item label="Normal" value="normal" />
                  <Picker.Item label="Wide" value="relaxed" />
                </Picker>
              </View>
            }
            showBorder={false}
          />
        </View>

        {/* Accessibility */}
        <SectionHeader title="ACCESSIBILITY" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Large Text"
            subtitle="Increase text size for better readability"
            rightComponent={
              <Switch
                key="largeText"
                value={accessibilityOptions?.largeText || false}
                onValueChange={(value) => updateAccessibilityOption('largeText', value)}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={accessibilityOptions?.largeText ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Bold Text"
            subtitle="Make text bolder for better visibility"
            rightComponent={
              <Switch
                key="boldText"
                value={accessibilityOptions?.boldText || false}
                onValueChange={(value) => updateAccessibilityOption('boldText', value)}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={accessibilityOptions?.boldText ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="High Contrast"
            subtitle="Increase contrast for better visibility"
            rightComponent={
              <Switch
                key="highContrast"
                value={accessibilityOptions?.highContrast || false}
                onValueChange={(value) => updateAccessibilityOption('highContrast', value)}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={accessibilityOptions?.highContrast ? colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingItem
            title="Reduce Motion"
            subtitle="Minimize animations and transitions"
            rightComponent={
              <Switch
                key="reduceMotion"
                value={layoutOptions?.reduceMotion || false}
                onValueChange={(value) => updateLayoutOption('reduceMotion', value)}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={layoutOptions?.reduceMotion ? colors.primary : colors.textSecondary}
              />
            }
            showBorder={false}
          />
        </View>

        {/* Data Management */}
        <SectionHeader title="DATA MANAGEMENT" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={() => {
              Alert.alert(
                'Clear Cache',
                'This will clear app cache and reset settings to defaults. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await resetSettings();
                        Alert.alert('Success', 'Cache and settings cleared successfully');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to clear cache');
                      }
                    }
                  }
                ]
              );
            }}
            rightComponent={<Text style={[styles.actionText, { color: colors.primary }]}>Clear</Text>}
          />
          <SettingItem
            title="Clear All Data"
            subtitle="Remove all offline data"
            onPress={handleClearData}
            rightComponent={<Text style={[styles.actionText, { color: '#EF4444' }]}>Clear</Text>}
            showBorder={false}
          />
        </View>

        {/* Support & Info */}
        <SectionHeader title="SUPPORT & INFO" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => {
              Alert.alert(
                'Help & Support',
                'Choose how you\'d like to contact support:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Email Support',
                    onPress: () => {
                      // In a real app, you'd use Linking.openURL to open email client
                      Alert.alert('Email Support', 'support@scanified.com\n\nCopy this email address to contact our support team.');
                    }
                  },
                  {
                    text: 'Phone Support',
                    onPress: () => {
                      Alert.alert('Phone Support', 'Call us at: +1 (555) 123-4567\n\nAvailable Monday-Friday, 9 AM - 5 PM EST');
                    }
                  },
                  {
                    text: 'Live Chat',
                    onPress: () => {
                      Alert.alert('Live Chat', 'Live chat is available on our website at scanified.com/support');
                    }
                  }
                ]
              );
            }}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => {
              Alert.alert('Privacy Policy', 'Privacy policy would open here');
            }}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Version"
            subtitle="1.0.0"
            rightComponent={null}
            showBorder={false}
          />
        </View>

        {/* Account Management */}
        <SectionHeader title="ACCOUNT MANAGEMENT" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            title="Delete Account"
            subtitle="Permanently delete your account and all associated data"
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'This action cannot be undone. All your data will be permanently deleted. Are you sure you want to continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // Delete user data from profiles table
                        const { error: profileError } = await supabase
                          .from('profiles')
                          .delete()
                          .eq('id', user?.id);

                        if (profileError) throw profileError;

                        // Delete user authentication
                        const { error: deleteError } = await supabase.auth.admin.deleteUser(
                          user?.id
                        );

                        if (deleteError) throw deleteError;

                        // Clear local storage and sign out
                        await AsyncStorage.clear();
                        await supabase.auth.signOut();

                        Alert.alert(
                          'Account Deleted',
                          'Your account has been successfully deleted.'
                        );
                      } catch (error) {
                        console.error('Error deleting account:', error);
                        Alert.alert(
                          'Error',
                          'Failed to delete account. Please try again or contact support.'
                        );
                      }
                    },
                  },
                ]
              );
            }}
            rightComponent={<Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>}
            showBorder={false}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text style={[styles.signOutText, { color: '#EF4444' }]}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  profileSection: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 32,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  pickerContainer: {
    flex: 1,
    maxWidth: 100,
  },
  picker: {
    height: 40,
  },
});