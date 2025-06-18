import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedItems?: number;
  errors?: string[];
}

export interface ConnectivityStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export class SyncService {
  private static syncInProgress = false;
  private static connectivityListener: any = null;

  // Initialize connectivity monitoring
  static initializeConnectivityMonitoring(): void {
    if (this.connectivityListener) {
      this.connectivityListener();
    }

    this.connectivityListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Connection restored - attempt to sync offline data
        this.attemptBackgroundSync();
      }
    });
  }

  // Clean up connectivity monitoring
  static cleanupConnectivityMonitoring(): void {
    if (this.connectivityListener) {
      this.connectivityListener();
      this.connectivityListener = null;
    }
  }

  // Attempt background sync when connection is restored
  private static async attemptBackgroundSync(): Promise<void> {
    if (this.syncInProgress) return;

    const offlineCount = await this.getOfflineScanCount();
    if (offlineCount === 0) return;

    this.syncInProgress = true;
    try {
      await this.syncOfflineData();
      await this.updateLastSyncTime();
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  static async syncOfflineData(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress',
      };
    }

    this.syncInProgress = true;
    try {
      // Check connectivity first
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        return {
          success: false,
          message: 'No internet connection available',
        };
      }

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
      console.log(`Starting sync of ${scans.length} offline scans`);
      let syncedCount = 0;
      const errors: string[] = [];

      // Sync each offline scan
      for (const scan of scans) {
        try {
          // Insert scan data into database - handle both field name variations
          const scanData = {
            order_number: scan.order_number,
            bottle_barcode: scan.bottle_barcode || scan.barcode, // Handle both field names
            mode: scan.mode || scan.scan_type, // Handle both field names
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
            console.error(`Sync error for scan ${scan.bottle_barcode || scan.barcode}:`, error);
          } else {
            syncedCount++;
            console.log(`Successfully synced scan ${scan.bottle_barcode || scan.barcode}`);
            
            // If this is a return scan, mark the bottle as empty
            if (scanData.mode === 'RETURN') {
              const { error: updateError } = await supabase
                .from('bottles')
                .update({ status: 'empty' })
                .eq('barcode_number', scanData.bottle_barcode);
              
              if (updateError) {
                console.warn(`Could not update bottle status for ${scanData.bottle_barcode}:`, updateError);
              } else {
                console.log(`Marked bottle ${scanData.bottle_barcode} as empty`);
              }
            }
          }
        } catch (error) {
          errors.push(`Error syncing scan ${scan.bottle_barcode || scan.barcode}: ${error}`);
        }
      }

      // Remove synced data from offline storage only if all items were synced successfully
      if (syncedCount === scans.length) {
        await AsyncStorage.removeItem('offline_scans');
      } else if (syncedCount > 0) {
        // Remove only the successfully synced items
        const remainingScans = scans.slice(syncedCount);
        await AsyncStorage.setItem('offline_scans', JSON.stringify(remainingScans));
      }

      return {
        success: errors.length === 0,
        message: `Synced ${syncedCount} of ${scans.length} items successfully`,
        syncedItems: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error}`,
        errors: [error.toString()],
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  static async saveOfflineScan(scanData: any): Promise<void> {
    try {
      console.log('Saving offline scan:', scanData);
      const existingData = await AsyncStorage.getItem('offline_scans');
      const scans = existingData ? JSON.parse(existingData) : [];
      scans.push({
        ...scanData,
        timestamp: new Date().toISOString(),
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique offline ID
      });
      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));
      console.log(`Offline scan saved. Total offline scans: ${scans.length}`);
    } catch (error) {
      console.error('Error saving offline scan:', error);
      throw error; // Re-throw to let calling code handle it
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

  static async getOfflineScans(): Promise<any[]> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) return [];
      return JSON.parse(offlineData);
    } catch (error) {
      console.error('Error getting offline scans:', error);
      return [];
    }
  }

  static async checkConnectivity(): Promise<boolean> {
    try {
      // Check network info first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        return false;
      }

      // Then verify with a quick database query
      const { error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  static async getConnectivityStatus(): Promise<ConnectivityStatus> {
    try {
      const netInfo = await NetInfo.fetch();
      return {
        isConnected: netInfo.isConnected || false,
        isInternetReachable: netInfo.isInternetReachable || false,
        type: netInfo.type || 'unknown',
      };
    } catch (error) {
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      };
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

  // Clear all offline data
  static async clearOfflineData(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem('offline_scans');
      await AsyncStorage.removeItem('last_sync_time');
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }

  // Get sync status
  static async getSyncStatus(): Promise<{
    isConnected: boolean;
    offlineCount: number;
    lastSync: string;
    syncInProgress: boolean;
  }> {
    const isConnected = await this.checkConnectivity();
    const offlineCount = await this.getOfflineScanCount();
    const lastSync = await this.getLastSyncTime();

    return {
      isConnected,
      offlineCount,
      lastSync,
      syncInProgress: this.syncInProgress,
    };
  }
} 