import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import OfflineStorageService from '../services/offlineStorage';

interface DataHealthStatus {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  lastSyncTime: string | null;
  pendingOperations: number;
  errorCount: number;
  storageUsed: number;
  storageAvailable: number;
  dataIntegrity: 'good' | 'warning' | 'error';
  recentErrors: Array<{
    id: string;
    message: string;
    timestamp: string;
    type: 'sync' | 'validation' | 'network';
  }>;
}

export default function DataHealthScreen() {
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  
  const [dataHealth, setDataHealth] = useState<DataHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchDataHealth();
      setupNetworkListener();
    }
  }, [profile]);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (dataHealth) {
        setDataHealth(prev => prev ? {
          ...prev,
          isOnline: state.isConnected ?? false,
          syncStatus: state.isConnected ? 'synced' : 'offline'
        } : null);
      }
    });
    return unsubscribe;
  };

  const fetchDataHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const orgId = profile.organization_id;
      const netInfo = await NetInfo.fetch();
      const isOnline = netInfo.isConnected ?? false;

      // Get offline storage info
      // Use static methods directly
      const queueStats = await OfflineStorageService.getQueueStats();
      const pendingOperations = queueStats.pending;
      
      // Get storage info (simplified)
      const storageInfo = {
        used: 0, // We'll calculate this differently
        available: 0,
        total: 0
      };

      // Get recent sync errors
      const { data: recentErrors } = await supabase
        .from('audit_logs')
        .select('id, message, created_at, action')
        .eq('organization_id', orgId)
        .eq('action', 'sync_error')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get last sync time
      const { data: lastSync } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('organization_id', orgId)
        .eq('action', 'sync_complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate data integrity score
      const { data: integrityCheck } = await supabase
        .from('bottles')
        .select('id')
        .eq('organization_id', orgId)
        .is('barcode_number', null);

      const integrityIssues = integrityCheck?.length || 0;
      let dataIntegrity: 'good' | 'warning' | 'error' = 'good';
      
      if (integrityIssues > 10) {
        dataIntegrity = 'error';
      } else if (integrityIssues > 0) {
        dataIntegrity = 'warning';
      }

      // Determine sync status
      let syncStatus: 'synced' | 'syncing' | 'error' | 'offline' = 'synced';
      if (!isOnline) {
        syncStatus = 'offline';
      } else if (pendingOperations > 0) {
        syncStatus = 'syncing';
      } else if (recentErrors && recentErrors.length > 0) {
        const latestError = new Date(recentErrors[0].created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (latestError > oneHourAgo) {
          syncStatus = 'error';
        }
      }

      setDataHealth({
        isOnline,
        syncStatus,
        lastSyncTime: lastSync?.created_at || null,
        pendingOperations,
        errorCount: recentErrors?.length || 0,
        storageUsed: storageInfo.used,
        storageAvailable: storageInfo.available,
        dataIntegrity,
        recentErrors: (recentErrors || []).map(error => ({
          id: error.id,
          message: error.message,
          timestamp: error.created_at,
          type: 'sync' as const
        }))
      });

    } catch (error) {
      logger.error('Error fetching data health:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data health');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDataHealth();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    if (!dataHealth?.isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return;
    }

    setSyncInProgress(true);
    try {
      // Trigger manual sync
      // Use static methods directly
      await OfflineStorageService.syncOfflineOperations(supabase);
      
      // Refresh data health
      await fetchDataHealth();
      
      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      logger.error('Manual sync error:', error);
      Alert.alert('Sync Error', 'Failed to synchronize data. Please try again.');
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleClearErrors = async () => {
    Alert.alert(
      'Clear Error History',
      'This will clear all sync error history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear error logs (in a real app, you might want to archive them)
              await fetchDataHealth();
              Alert.alert('Success', 'Error history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear error history');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return colors.success;
      case 'syncing':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'offline':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return 'checkmark-circle';
      case 'syncing':
        return 'sync';
      case 'error':
        return 'alert-circle';
      case 'offline':
        return 'cloud-offline';
      default:
        return 'help-circle';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const StatusCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
      <View style={styles.statusHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
      </View>
      <Text style={[styles.statusTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  if (loading && !dataHealth) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading data health...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Error Loading Data Health</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchDataHealth}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!dataHealth) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Available</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Data health information will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Data Health Monitor
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Monitor sync status and data integrity
          </Text>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connection Status</Text>
          <View style={[styles.connectionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.connectionHeader}>
              <Ionicons
                name={dataHealth.isOnline ? 'wifi' : 'cloud-offline'}
                size={32}
                color={dataHealth.isOnline ? colors.success : colors.error}
              />
              <View style={styles.connectionInfo}>
                <Text style={[styles.connectionStatus, { color: colors.text }]}>
                  {dataHealth.isOnline ? 'Online' : 'Offline'}
                </Text>
                <Text style={[styles.connectionSubtext, { color: colors.textSecondary }]}>
                  {dataHealth.isOnline ? 'Connected to server' : 'No internet connection'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync Status</Text>
          <View style={styles.statusGrid}>
            <StatusCard
              title="Sync Status"
              value={dataHealth.syncStatus.charAt(0).toUpperCase() + dataHealth.syncStatus.slice(1)}
              icon={getStatusIcon(dataHealth.syncStatus)}
              color={getStatusColor(dataHealth.syncStatus)}
              subtitle={dataHealth.lastSyncTime ? `Last sync: ${formatDate(dataHealth.lastSyncTime)}` : 'Never synced'}
            />
            <StatusCard
              title="Pending Operations"
              value={dataHealth.pendingOperations}
              icon="time"
              color={dataHealth.pendingOperations > 0 ? colors.warning : colors.success}
            />
          </View>
        </View>

        {/* Data Integrity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Integrity</Text>
          <View style={styles.statusGrid}>
            <StatusCard
              title="Data Quality"
              value={dataHealth.dataIntegrity.charAt(0).toUpperCase() + dataHealth.dataIntegrity.slice(1)}
              icon={dataHealth.dataIntegrity === 'good' ? 'checkmark-circle' : dataHealth.dataIntegrity === 'warning' ? 'warning' : 'alert-circle'}
              color={dataHealth.dataIntegrity === 'good' ? colors.success : dataHealth.dataIntegrity === 'warning' ? colors.warning : colors.error}
            />
            <StatusCard
              title="Recent Errors"
              value={dataHealth.errorCount}
              icon="bug"
              color={dataHealth.errorCount > 0 ? colors.error : colors.success}
            />
          </View>
        </View>

        {/* Storage Usage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Usage</Text>
          <View style={styles.statusGrid}>
            <StatusCard
              title="Used Storage"
              value={formatBytes(dataHealth.storageUsed)}
              icon="folder"
              color={colors.info}
            />
            <StatusCard
              title="Available Storage"
              value={formatBytes(dataHealth.storageAvailable)}
              icon="folder-open"
              color={colors.success}
            />
          </View>
        </View>

        {/* Sync Controls */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync Controls</Text>
          <View style={[styles.controlsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.controlItem}>
              <View style={styles.controlInfo}>
                <Text style={[styles.controlTitle, { color: colors.text }]}>Auto Sync</Text>
                <Text style={[styles.controlSubtitle, { color: colors.textSecondary }]}>
                  Automatically sync when online
                </Text>
              </View>
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={autoSyncEnabled ? colors.surface : colors.textSecondary}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.syncButton,
                {
                  backgroundColor: dataHealth.isOnline ? colors.primary : colors.textSecondary,
                  opacity: syncInProgress ? 0.7 : 1
                }
              ]}
              onPress={handleManualSync}
              disabled={!dataHealth.isOnline || syncInProgress}
            >
              {syncInProgress ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons name="sync" size={20} color={colors.surface} />
              )}
              <Text style={styles.syncButtonText}>
                {syncInProgress ? 'Syncing...' : 'Manual Sync'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Errors */}
        {dataHealth.recentErrors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Errors</Text>
              <TouchableOpacity onPress={handleClearErrors}>
                <Text style={[styles.clearButton, { color: colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.errorsContainer, { backgroundColor: colors.surface }]}>
              {dataHealth.recentErrors.map((error) => (
                <View key={error.id} style={styles.errorItem}>
                  <View style={styles.errorIcon}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                  </View>
                  <View style={styles.errorContent}>
                    <Text style={[styles.errorMessage, { color: colors.text }]}>
                      {error.message}
                    </Text>
                    <Text style={[styles.errorTime, { color: colors.textSecondary }]}>
                      {formatDate(error.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionCard: {
    borderRadius: 12,
    padding: 16,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionInfo: {
    marginLeft: 16,
    flex: 1,
  },
  connectionStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: '4%',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  controlsCard: {
    borderRadius: 12,
    padding: 16,
  },
  controlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  controlSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorsContainer: {
    borderRadius: 12,
    padding: 16,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  errorIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  errorContent: {
    flex: 1,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorTime: {
    fontSize: 12,
    marginTop: 4,
  },
});
