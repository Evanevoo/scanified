import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
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
  
  const { handleError, withErrorHandling } = useErrorHandler();

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);
      
      const isOnline = !error;
      setSyncStatus(prev => ({ ...prev, isOnline }));
      return isOnline;
    } catch {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      return false;
    }
  }, []);

  const getPendingScans = useCallback(async (): Promise<number> => {
    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) return 0;
      const scans = JSON.parse(offlineData);
      return scans.length;
    } catch {
      return 0;
    }
  }, []);

  const getLastSyncTime = useCallback(async (): Promise<string> => {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      return lastSync || 'Never';
    } catch {
      return 'Never';
    }
  }, []);

  const syncOfflineData = useCallback(async (): Promise<boolean> => {
    if (!(await checkConnectivity())) {
      handleError(new Error('No internet connection'), 'Sync Failed');
      return false;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) {
        setSyncStatus(prev => ({ ...prev, isSyncing: false }));
        return true;
      }

      const scans = JSON.parse(offlineData);
      let syncedCount = 0;
      const errors: string[] = [];

      for (const scan of scans) {
        try {
          // Insert scan data into database - handle both field name variations
          const scanData = {
            order_number: scan.order_number,
            bottle_barcode: scan.bottle_barcode || scan.barcode, // Handle both field names
            mode: scan.mode === 'out' ? 'SHIP' : scan.mode === 'in' ? 'RETURN' : (scan.mode || scan.scan_type)?.toUpperCase(), // Map to database expected values
            customer_id: scan.customer_id,
            location: scan.location,
            timestamp: scan.timestamp,
            user_id: scan.user_id,
          };

          const { error } = await supabase
            .from('bottle_scans')
            .insert(scanData);

          if (error) {
            errors.push(`Failed to sync scan ${scan.bottle_barcode || scan.barcode}: ${error.message}`);
          } else {
            syncedCount++;
            
            // If this is a return scan, mark the bottle as empty
            if (scanData.mode === 'RETURN') {
              const { error: updateError } = await supabase
                .from('bottles')
                .update({ status: 'empty' })
                .eq('barcode_number', scanData.bottle_barcode);
              
              if (updateError) {
                console.warn(`Could not update bottle status for ${scanData.bottle_barcode}:`, updateError);
              }
            }
          }
        } catch (error) {
          errors.push(`Error syncing scan ${scan.bottle_barcode || scan.barcode}: ${error}`);
        }
      }

      if (syncedCount > 0) {
        await AsyncStorage.removeItem('offline_scans');
        await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        pendingScans: 0,
        lastSyncTime: new Date().toISOString(),
      }));

      if (errors.length > 0) {
        handleError(new Error(`Sync completed with ${errors.length} errors`), 'Sync Warning');
      } else if (syncedCount > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${syncedCount} items`);
      }

      return errors.length === 0;
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      handleError(error, 'Sync Failed');
      return false;
    }
  }, [checkConnectivity, handleError]);

  const saveOfflineScan = useCallback(async (scanData: any): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem('offline_scans');
      const scans = existingData ? JSON.parse(existingData) : [];
      scans.push({
        ...scanData,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));
      
      setSyncStatus(prev => ({ ...prev, pendingScans: scans.length }));
    } catch (error) {
      handleError(error, 'Save Failed');
    }
  }, [handleError]);

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
    
    // Check connectivity every 30 seconds
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