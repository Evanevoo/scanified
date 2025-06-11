import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [offlineMode, setOfflineMode] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(15);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Account */}
      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Profile Info</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Change Password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Logout</Text>
      </TouchableOpacity>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Push Notifications</Text>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Email Notifications</Text>
        <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
      </View>

      {/* App Preferences */}
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Theme</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setTheme('light')}>
            <Text style={[styles.themeOption, theme === 'light' && styles.themeSelected]}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTheme('dark')}>
            <Text style={[styles.themeOption, theme === 'dark' && styles.themeSelected]}>Dark</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTheme('auto')}>
            <Text style={[styles.themeOption, theme === 'auto' && styles.themeSelected]}>Auto</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Offline Mode</Text>
        <Switch value={offlineMode} onValueChange={setOfflineMode} />
      </View>

      {/* Sync & Data */}
      <Text style={styles.sectionTitle}>Sync & Data</Text>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Manual Sync</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Clear Local Data</Text>
      </TouchableOpacity>

      {/* Security */}
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Biometric Login</Text>
        <Switch value={biometric} onValueChange={setBiometric} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Session Timeout (min): {sessionTimeout}</Text>
        {/* You can add a stepper or dropdown for this */}
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>App Version</Text>
        <Text style={styles.settingText}>1.0.0</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Privacy Policy</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Terms of Service</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 18,
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  settingRow: {
    backgroundColor: '#fff',
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
  },
  settingText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  themeOption: {
    marginHorizontal: 8,
    color: '#888',
    fontWeight: 'bold',
  },
  themeSelected: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});