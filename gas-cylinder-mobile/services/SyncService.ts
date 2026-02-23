import logger from '../utils/logger';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { conflictResolutionService } from './ConflictResolutionService';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedItems?: number;
  failedItems?: number;
  errors?: string[];
}

export interface ConnectivityStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

interface OfflineScan {
  id: string;
  order_number?: string;
  bottle_barcode?: string;
  barcode?: string;
  mode?: string;
  scan_type?: string;
  action?: string;
  customer_id?: string;
  customer_name?: string;
  location?: string;
  timestamp?: string;
  user_id?: string;
  created_at?: string;
  synced?: boolean;
}

const OFFLINE_QUEUE_KEY = 'offline_scans';

/**
 * Consolidated sync service. Uses a single AsyncStorage key (`offline_scans`)
 * and a single sync path. Fixes: SYN-1 (competing queues), SYN-2 (idempotency),
 * SYN-3 (partial sync data loss), SYN-5 (static vs instance guard).
 */
export class SyncService {
  private static _syncInProgress = false;
  private static connectivityListener: any = null;

  static initializeConnectivityMonitoring(): void {
    if (this.connectivityListener) {
      this.connectivityListener();
    }

    this.connectivityListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.attemptBackgroundSync();
      }
    });
  }

  static cleanupConnectivityMonitoring(): void {
    if (this.connectivityListener) {
      this.connectivityListener();
      this.connectivityListener = null;
    }
  }

  private static async attemptBackgroundSync(): Promise<void> {
    if (this._syncInProgress) return;

    const offlineCount = await this.getOfflineScanCount();
    if (offlineCount === 0) return;

    await this.syncOfflineData();
  }

  /**
   * Save a scan to the offline queue. Generates a unique ID for idempotency.
   */
  static async saveOfflineScan(scanData: any): Promise<void> {
    try {
      const scans = await this.getOfflineScans();
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      scans.push({
        ...scanData,
        id,
        timestamp: scanData.timestamp || new Date().toISOString(),
        synced: false,
      });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(scans));
    } catch (error) {
      logger.error('Error saving offline scan:', error);
    }
  }

  static async getOfflineScanCount(): Promise<number> {
    try {
      const scans = await this.getOfflineScans();
      return scans.filter(s => !s.synced).length;
    } catch (error) {
      logger.error('Error getting offline scan count:', error);
      return 0;
    }
  }

  static async getOfflineScans(): Promise<OfflineScan[]> {
    try {
      const offlineData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!offlineData) return [];
      return JSON.parse(offlineData);
    } catch (error) {
      logger.error('Error getting offline scans:', error);
      return [];
    }
  }

  static async checkConnectivity(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        return false;
      }

      const { error } = await supabase
        .from('bottles')
        .select('id')
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
      logger.error('Error updating last sync time:', error);
    }
  }

  /**
   * Main sync method. Syncs all unsynced scans, marking each individually as
   * synced or leaving them for retry. Fixes partial sync data loss.
   */
  static async syncOfflineData(): Promise<SyncResult> {
    if (this._syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress',
        errors: ['Sync already in progress'],
      };
    }

    this._syncInProgress = true;

    try {
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        return {
          success: false,
          message: 'No internet connection',
          errors: ['No internet connection'],
        };
      }

      const allScans = await this.getOfflineScans();
      const unsyncedScans = allScans.filter(s => !s.synced);

      if (unsyncedScans.length === 0) {
        return {
          success: true,
          message: 'No offline data to sync',
          syncedItems: 0,
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'No user found', errors: ['No user found'] };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        return { success: false, message: 'No organization found', errors: ['No organization found'] };
      }

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const scan of unsyncedScans) {
        try {
          const barcode = scan.bottle_barcode || scan.barcode || '';
          const mode = scan.mode === 'out' ? 'SHIP'
            : scan.mode === 'in' ? 'RETURN'
            : (scan.mode || scan.scan_type || scan.action || '').toUpperCase();

          const scanData = {
            order_number: scan.order_number,
            bottle_barcode: barcode,
            mode,
            customer_id: scan.customer_id,
            customer_name: scan.customer_name,
            location: scan.location,
            timestamp: scan.timestamp || new Date().toISOString(),
            user_id: scan.user_id || user.id,
            organization_id: profile.organization_id,
            created_at: scan.created_at || new Date().toISOString(),
          };

          // Use upsert with the dedup index for idempotency
          const { error } = await supabase
            .from('bottle_scans')
            .upsert(scanData, {
              onConflict: 'organization_id,bottle_barcode,order_number,mode,timestamp',
              ignoreDuplicates: true,
            });

          if (error) {
            if (error.code === '23505') {
              scan.synced = true;
              syncedCount++;
              continue;
            }
            errors.push(`Failed to sync scan ${barcode}: ${error.message}`);
            failedCount++;
            continue;
          }

          scan.synced = true;
          syncedCount++;

          // For RETURN scans, mark bottle as empty (with org_id filter)
          if (mode === 'RETURN' && barcode) {
            const { error: updateError } = await supabase
              .from('bottles')
              .update({ status: 'empty' })
              .eq('barcode_number', barcode)
              .eq('organization_id', profile.organization_id);

            if (updateError) {
              logger.warn(`Could not update bottle status for ${barcode}:`, updateError);
            }
          }
        } catch (error: any) {
          const barcode = scan.bottle_barcode || scan.barcode || 'unknown';
          errors.push(`Error syncing scan ${barcode}: ${error?.message || error}`);
          failedCount++;
        }
      }

      // Save back: keep only unsynced items for retry
      const remaining = allScans.filter(s => !s.synced);
      if (remaining.length === 0) {
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      } else {
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      }

      if (syncedCount > 0) {
        await this.updateLastSyncTime();
      }

      return {
        success: failedCount === 0,
        message: failedCount === 0
          ? `Successfully synced ${syncedCount} items`
          : `Synced ${syncedCount} items, ${failedCount} failed (will retry)`,
        syncedItems: syncedCount,
        failedItems: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      logger.error('Error in syncOfflineData:', error);
      return {
        success: false,
        message: `Sync failed: ${error?.message || error}`,
        errors: [String(error)],
      };
    } finally {
      this._syncInProgress = false;
    }
  }

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
      syncInProgress: this._syncInProgress,
    };
  }

  // ---- Legacy instance methods (delegate to static) ----

  async syncOfflineData(): Promise<SyncResult> {
    return SyncService.syncOfflineData();
  }

  async saveOfflineData(type: string, data: any) {
    if (type === 'scans') {
      return SyncService.saveOfflineScan(data);
    }
    logger.warn(`saveOfflineData called with type="${type}" - only scans are supported in the consolidated queue`);
  }
}

export const syncService = new SyncService();
export default syncService;
