import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SyncService } from '../services/SyncService';
import { useTheme } from '../context/ThemeContext';

interface StatusBarProps {
  onSyncPress?: () => void;
}

export default function StatusBar({ onSyncPress }: StatusBarProps) {
  const { colors } = useTheme();
  const [isConnected, setIsConnected] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Check status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const connected = await SyncService.checkConnectivity();
    const count = await SyncService.getOfflineScanCount();
    
    setIsConnected(connected);
    setOfflineCount(count);
  };

  const handleSyncPress = async () => {
    if (!isConnected || offlineCount === 0) return;
    
    setIsSyncing(true);
    try {
      await SyncService.syncOfflineData();
      await checkStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
    
    if (onSyncPress) {
      onSyncPress();
    }
  };

  // Don't show anything if online and no pending scans
  if (isConnected && offlineCount === 0) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: isConnected ? colors.warning : colors.error }
    ]}>
      <View style={styles.content}>
        <Text style={[
          styles.statusText,
          { color: isConnected ? colors.text : colors.surface }
        ]}>
          {isConnected ? '🟡' : '🔴'} {isConnected ? 'Offline' : 'No Connection'}
          {offlineCount > 0 && ` - ${offlineCount} scan(s) pending`}
        </Text>
        
        {isConnected && offlineCount > 0 && (
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary }]}
            onPress={handleSyncPress}
            disabled={isSyncing}
          >
            <Text style={[styles.syncButtonText, { color: colors.surface }]}>
              {isSyncing ? '🔄 Syncing...' : '🔄 Sync Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 8, // Account for iOS status bar height
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 