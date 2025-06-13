import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, profile, loading } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [defaultScanMode, setDefaultScanMode] = useState<'SHIP' | 'RETURN'>('SHIP');
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Never');

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleManualSync = async () => {
    setSyncing(true);
    // TODO: Add real sync logic
    setTimeout(() => {
      setLastSync(new Date().toLocaleString());
      setSyncing(false);
      Alert.alert('Sync Complete', 'Data synced successfully.');
    }, 1200);
  };

  const handleClearData = () => {
    Alert.alert('Clear Local Data', 'Are you sure? This will remove all local data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {/* TODO: Clear local data */} },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Account */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Name</Text>
        <Text style={styles.settingValue}>{profile?.full_name || 'N/A'}</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Email</Text>
        <Text style={styles.settingValue}>{profile?.email || user?.email || 'N/A'}</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Role</Text>
        <Text style={styles.settingValue}>{profile?.role || 'user'}</Text>
      </View>
      <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
        <Text style={[styles.settingText, { color: '#ff5a1f' }]}>Logout</Text>
      </TouchableOpacity>

      {/* App Preferences */}
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Theme</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setTheme('light')}><Text style={[styles.themeOption, theme === 'light' && styles.themeSelected]}>Light</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setTheme('dark')}><Text style={[styles.themeOption, theme === 'dark' && styles.themeSelected]}>Dark</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setTheme('auto')}><Text style={[styles.themeOption, theme === 'auto' && styles.themeSelected]}>Auto</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Sound/Vibration</Text>
        <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Default Scan Mode</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setDefaultScanMode('SHIP')}><Text style={[styles.themeOption, defaultScanMode === 'SHIP' && styles.themeSelected]}>SHIP</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setDefaultScanMode('RETURN')}><Text style={[styles.themeOption, defaultScanMode === 'RETURN' && styles.themeSelected]}>RETURN</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Offline Mode</Text>
        <Switch value={offlineMode} onValueChange={setOfflineMode} />
      </View>

      {/* Sync & Data */}
      <Text style={styles.sectionTitle}>Sync & Data</Text>
      <TouchableOpacity style={styles.settingRow} onPress={handleManualSync}>
        <Text style={styles.settingText}>Manual Sync</Text>
        <Text style={styles.settingValue}>{syncing ? 'Syncing...' : lastSync}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
        <Text style={[styles.settingText, { color: '#ff5a1f' }]}>Clear Local Data</Text>
      </TouchableOpacity>

      {/* Support/About */}
      <Text style={styles.sectionTitle}>Support & About</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Contact Support</Text>
        <Text style={styles.settingValue}>support@yourcompany.com</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>App Version</Text>
        <Text style={styles.settingValue}>1.0.0</Text>
      </View>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Terms of Service</Text>
      </TouchableOpacity>

      {/* Admin Only */}
      {profile?.role === 'admin' && (
        <>
          <Text style={styles.sectionTitle}>Admin Only</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('UserManagement')}>
            <Text style={styles.settingText}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Debug Info', 'Show debug info here.') }>
            <Text style={styles.settingText}>Debug Info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Reset App', 'Are you sure? This will reset the app.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => {/* TODO: Reset app logic */} },
          ])}>
            <Text style={[styles.settingText, { color: '#ff5a1f' }]}>Reset App</Text>
          </TouchableOpacity>
        </>
      )}
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
  settingValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: 'normal',
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