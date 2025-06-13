import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedItems?: number;
  errors?: string[];
}

export class SyncService {
  static async syncOfflineData(): Promise<SyncResult> {
    try {
      // Get offline data from AsyncStorage
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) {
        return {
          success: true,
          message: 'No offline data to sync',
          syncedItems: 0,
        };
      }

      const scans = JSON.parse(offlineData);
      let syncedCount = 0;
      const errors: string[] = [];

      // Sync each offline scan
      for (const scan of scans) {
        try {
          // Insert scan data into database
          const { error } = await supabase
            .from('scans')
            .insert({
              barcode: scan.barcode,
              customer_id: scan.customer_id,
              order_number: scan.order_number,
              scan_type: scan.scan_type,
              location: scan.location,
              timestamp: scan.timestamp,
              user_id: scan.user_id,
            });

          if (error) {
            errors.push(`Failed to sync scan ${scan.barcode}: ${error.message}`);
          } else {
            syncedCount++;
          }
        } catch (error) {
          errors.push(`Error syncing scan ${scan.barcode}: ${error}`);
        }
      }

      // Remove synced data from offline storage
      if (syncedCount > 0) {
        await AsyncStorage.removeItem('offline_scans');
      }

      return {
        success: errors.length === 0,
        message: `Synced ${syncedCount} items successfully`,
        syncedItems: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error}`,
        errors: [error.toString()],
      };
    }
  }

  static async saveOfflineScan(scanData: any): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem('offline_scans');
      const scans = existingData ? JSON.parse(existingData) : [];
      scans.push({
        ...scanData,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));
    } catch (error) {
      console.error('Error saving offline scan:', error);
    }
  }

  static async getOfflineScanCount(): Promise<number> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) return 0;
      const scans = JSON.parse(offlineData);
      return scans.length;
    } catch (error) {
      console.error('Error getting offline scan count:', error);
      return 0;
    }
  }

  static async checkConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity check by trying to fetch a small amount of data
      const { error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  static async getLastSyncTime(): Promise<string> {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      return lastSync || 'Never';
    } catch (error) {
      return 'Never';
    }
  }

  static async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }
} 