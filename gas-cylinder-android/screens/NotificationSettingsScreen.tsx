import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/NotificationService';
import { Ionicons } from '@expo/vector-icons';

interface NotificationSettings {
  scanComplete: boolean;
  syncStatus: boolean;
  maintenanceReminders: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    scanComplete: true,
    syncStatus: true,
    maintenanceReminders: true,
    systemUpdates: true,
    marketingEmails: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load settings from local storage or user preferences
      // For now, we'll use default settings
      // In a real app, you'd load from AsyncStorage or user profile
      
    } catch (error) {
      logger.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      setPermissionsGranted(enabled);
    } catch (error) {
      logger.error('Error checking notification permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      setPermissionsGranted(granted);
      
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted');
      } else {
        Alert.alert('Permission Denied', 'Notification permissions are required for push notifications');
      }
    } catch (error) {
      logger.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      setSaving(true);
      
      // Update local state
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Save to storage/user preferences
      // In a real app, you'd save to AsyncStorage or update user profile
      
      // Show success feedback
      setTimeout(() => setSaving(false), 500);
      
    } catch (error) {
      logger.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification setting');
      setSaving(false);
    }
  };

  const testNotification = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permissions Required', 'Please enable notification permissions first');
      return;
    }

    try {
      await notificationService.sendLocalNotification({
        title: 'Test Notification',
        body: 'This is a test notification from Scanified',
        categoryId: 'scan_complete',
        data: { test: true }
      });
      
      Alert.alert('Success', 'Test notification sent');
    } catch (error) {
      logger.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon, 
    disabled = false 
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || saving}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.surface : colors.textSecondary}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading notification settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Notification Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your notification preferences
          </Text>
        </View>

        {/* Permission Status */}
        <View style={styles.section}>
          <View style={[styles.permissionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.permissionHeader}>
              <Ionicons
                name={permissionsGranted ? 'notifications' : 'notifications-off'}
                size={32}
                color={permissionsGranted ? colors.success : colors.error}
              />
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionTitle, { color: colors.text }]}>
                  {permissionsGranted ? 'Notifications Enabled' : 'Notifications Disabled'}
                </Text>
                <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
                  {permissionsGranted 
                    ? 'You will receive push notifications' 
                    : 'Enable notifications to receive updates'
                  }
                </Text>
              </View>
            </View>
            
            {!permissionsGranted && (
              <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                onPress={requestPermissions}
              >
                <Text style={styles.permissionButtonText}>Enable Notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notification Types</Text>
          
          <SettingItem
            title="Scan Complete"
            subtitle="Get notified when scans are completed"
            value={settings.scanComplete}
            onValueChange={(value) => updateSetting('scanComplete', value)}
            icon="scan"
            disabled={!permissionsGranted}
          />
          
          <SettingItem
            title="Sync Status"
            subtitle="Notifications about data synchronization"
            value={settings.syncStatus}
            onValueChange={(value) => updateSetting('syncStatus', value)}
            icon="sync"
            disabled={!permissionsGranted}
          />
          
          <SettingItem
            title="Maintenance Reminders"
            subtitle="Reminders for scheduled maintenance"
            value={settings.maintenanceReminders}
            onValueChange={(value) => updateSetting('maintenanceReminders', value)}
            icon="construct"
            disabled={!permissionsGranted}
          />
          
          <SettingItem
            title="System Updates"
            subtitle="Important system announcements"
            value={settings.systemUpdates}
            onValueChange={(value) => updateSetting('systemUpdates', value)}
            icon="information-circle"
            disabled={!permissionsGranted}
          />
          
          <SettingItem
            title="Marketing Emails"
            subtitle="Promotional content and tips"
            value={settings.marketingEmails}
            onValueChange={(value) => updateSetting('marketingEmails', value)}
            icon="mail"
            disabled={!permissionsGranted}
          />
        </View>

        {/* Test Notification */}
        {permissionsGranted && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Notifications</Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={testNotification}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons name="send" size={20} color={colors.surface} />
              )}
              <Text style={styles.testButtonText}>
                {saving ? 'Sending...' : 'Send Test Notification'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notification Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiet Hours</Text>
          <View style={[styles.quietHoursCard, { backgroundColor: colors.surface }]}>
            <View style={styles.quietHoursHeader}>
              <Ionicons name="moon" size={24} color={colors.textSecondary} />
              <View style={styles.quietHoursInfo}>
                <Text style={[styles.quietHoursTitle, { color: colors.text }]}>
                  Quiet Hours
                </Text>
                <Text style={[styles.quietHoursSubtitle, { color: colors.textSecondary }]}>
                  No notifications between 10 PM and 8 AM
                </Text>
              </View>
              <Switch
                value={false}
                onValueChange={() => {}}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textSecondary}
              />
            </View>
            <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>
              Coming soon in a future update
            </Text>
          </View>
        </View>

        {/* Help */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Help</Text>
          <View style={[styles.helpCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.helpItem}>
              <Ionicons name="help-circle" size={20} color={colors.primary} />
              <Text style={[styles.helpText, { color: colors.text }]}>
                How do notifications work?
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.helpItem}>
              <Ionicons name="settings" size={20} color={colors.primary} />
              <Text style={[styles.helpText, { color: colors.text }]}>
                Manage system notification settings
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 16,
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  permissionCard: {
    borderRadius: 12,
    padding: 16,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionInfo: {
    marginLeft: 16,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quietHoursCard: {
    borderRadius: 12,
    padding: 16,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quietHoursInfo: {
    marginLeft: 16,
    flex: 1,
  },
  quietHoursTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  quietHoursSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  comingSoon: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  helpCard: {
    borderRadius: 12,
    padding: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
