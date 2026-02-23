import logger from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase';
import { SyncService } from '../services/SyncService';
import { useErrorHandler } from './useErrorHandler';

interface SyncStatus {
  isOnline: boolean;
  pendingScans: number;
  lastSyncTime: string;
  isSyncing: boolean;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    pendingScans: 0,
    lastSyncTime: 'Never',
    isSyncing: false,
  });

  const { handleError } = useErrorHandler();

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    const isOnline = await SyncService.checkConnectivity();
    setSyncStatus(prev => ({ ...prev, isOnline }));
    return isOnline;
  }, []);

  const getPendingScans = useCallback(async (): Promise<number> => {
    return SyncService.getOfflineScanCount();
  }, []);

  const getLastSyncTime = useCallback(async (): Promise<string> => {
    return SyncService.getLastSyncTime();
  }, []);

  const syncOfflineData = useCallback(async (): Promise<boolean> => {
    if (!(await checkConnectivity())) {
      handleError(new Error('No internet connection'), 'Sync Failed');
      return false;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await SyncService.syncOfflineData();

      const pendingScans = await getPendingScans();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        pendingScans,
        lastSyncTime: result.syncedItems ? new Date().toISOString() : prev.lastSyncTime,
      }));

      if (result.errors && result.errors.length > 0) {
        handleError(new Error(`Sync completed with ${result.errors.length} errors`), 'Sync Warning');
      } else if (result.syncedItems && result.syncedItems > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${result.syncedItems} items`);
      }

      return result.success;
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      handleError(error, 'Sync Failed');
      return false;
    }
  }, [checkConnectivity, handleError, getPendingScans]);

  const saveOfflineScan = useCallback(async (scanData: any): Promise<void> => {
    try {
      await SyncService.saveOfflineScan(scanData);
      const pendingScans = await getPendingScans();
      setSyncStatus(prev => ({ ...prev, pendingScans }));
    } catch (error) {
      handleError(error, 'Save Failed');
    }
  }, [handleError, getPendingScans]);

  const updateSyncStatus = useCallback(async () => {
    const [isOnline, pendingScans, lastSyncTime] = await Promise.all([
      checkConnectivity(),
      getPendingScans(),
      getLastSyncTime(),
    ]);

    setSyncStatus({
      isOnline,
      pendingScans,
      lastSyncTime,
      isSyncing: false,
    });
  }, [checkConnectivity, getPendingScans, getLastSyncTime]);

  useEffect(() => {
    updateSyncStatus();

    const interval = setInterval(updateSyncStatus, 30000);

    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  return {
    syncStatus,
    syncOfflineData,
    saveOfflineScan,
    checkConnectivity,
    updateSyncStatus,
  };
};
