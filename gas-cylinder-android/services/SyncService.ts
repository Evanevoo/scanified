import logger from '../utils/logger';
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

interface OfflineData {
  customers: any[];
  cylinders: any[];
  rentals: any[];
  scans: any[];
  fills: any[];
}

export class SyncService {
  private static syncInProgress = false;
  private static connectivityListener: any = null;
  private isOnline = true;
  private syncQueue: any[] = [];

  constructor() {
    this.checkOnlineStatus();
    this.setupNetworkListener();
  }

  private async checkOnlineStatus() {
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
  }

  private setupNetworkListener() {
    // Listen for network changes
    // This would typically use NetInfo or similar
    // For now, we'll check periodically
    setInterval(() => this.checkOnlineStatus(), 30000);
  }

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
      logger.error('Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncOfflineData(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    
    try {
      const offlineData = await this.getOfflineData();
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.log('No user found, skipping sync');
        return {
          success: true,
          message: 'No user found, skipping sync',
          syncedItems: 0,
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        logger.log('No organization found, skipping sync');
        return {
          success: true,
          message: 'No organization found, skipping sync',
          syncedItems: 0,
        };
      }

      // Sync customers
      for (const customer of offlineData.customers) {
        await this.syncCustomer(customer, profile.organization_id);
      }

      // Sync cylinders
      for (const cylinder of offlineData.cylinders) {
        await this.syncCylinder(cylinder, profile.organization_id);
      }

      // Sync rentals
      for (const rental of offlineData.rentals) {
        await this.syncRental(rental, profile.organization_id);
      }

      // Sync fills
      for (const fill of offlineData.fills) {
        await this.syncFill(fill, profile.organization_id);
      }

      // Clear synced data
      await this.clearOfflineData();
      
      logger.log('Offline data synced successfully');
      return {
        success: true,
        message: 'Offline data synced successfully',
        syncedItems: 0,
      };
    } catch (error) {
      logger.error('Error syncing offline data:', error);
      return {
        success: false,
        message: `Sync failed: ${error}`,
        errors: [error.toString()],
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncCustomer(customer: any, organizationId: string) {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert({
          ...customer,
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error syncing customer:', error);
    }
  }

  private async syncCylinder(cylinder: any, organizationId: string) {
    try {
      const { error } = await supabase
        .from('bottles')
        .upsert({
          ...cylinder,
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error syncing cylinder:', error);
    }
  }

  private async syncRental(rental: any, organizationId: string) {
    try {
      const { error } = await supabase
        .from('rentals')
        .upsert({
          ...rental,
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error syncing rental:', error);
    }
  }

  private async syncFill(fill: any, organizationId: string) {
    try {
      const { error } = await supabase
        .from('cylinder_fills')
        .upsert({
          ...fill,
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error syncing fill:', error);
    }
  }

  async saveOfflineData(type: keyof OfflineData, data: any) {
    try {
      const offlineData = await this.getOfflineData();
      offlineData[type].push({
        ...data,
        offline_id: Date.now().toString(),
        created_at: new Date().toISOString()
      });
      
      await AsyncStorage.setItem('offlineData', JSON.stringify(offlineData));
    } catch (error) {
      logger.error('Error saving offline data:', error);
    }
  }

  private async getOfflineData(): Promise<OfflineData> {
    try {
      const data = await AsyncStorage.getItem('offlineData');
      return data ? JSON.parse(data) : {
        customers: [],
        cylinders: [],
        rentals: [],
        scans: [],
        fills: []
      };
    } catch (error) {
      logger.error('Error getting offline data:', error);
      return {
        customers: [],
        cylinders: [],
        rentals: [],
        scans: [],
        fills: []
      };
    }
  }

  private async clearOfflineData() {
    try {
      await AsyncStorage.removeItem('offlineData');
    } catch (error) {
      logger.error('Error clearing offline data:', error);
    }
  }

  async getDataWithOrganization<T>(table: string, query?: any): Promise<T[]> {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return [];

      // Build query with organization filter
      let supabaseQuery = supabase
        .from(table)
        .select('*')
        .eq('organization_id', profile.organization_id);

      // Apply additional filters if provided
      if (query) {
        Object.keys(query).forEach(key => {
          supabaseQuery = supabaseQuery.eq(key, query[key]);
        });
      }

      const { data, error } = await supabaseQuery;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching ${table}:`, error);
      return [];
    }
  }

  async insertWithOrganization(table: string, data: any) {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data: result, error } = await supabase
        .from(table)
        .insert({
          ...data,
          organization_id: profile.organization_id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      logger.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  async updateWithOrganization(table: string, id: string, data: any) {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data: result, error } = await supabase
        .from(table)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', profile.organization_id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      logger.error(`Error updating ${table}:`, error);
      throw error;
    }
  }

  async deleteWithOrganization(table: string, id: string) {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  static async getOfflineScanCount(): Promise<number> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) return 0;
      const scans = JSON.parse(offlineData);
      return scans.length;
    } catch (error) {
      logger.error('Error getting offline scan count:', error);
      return 0;
    }
  }

  static async getOfflineScans(): Promise<any[]> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_scans');
      if (!offlineData) return [];
      return JSON.parse(offlineData);
    } catch (error) {
      logger.error('Error getting offline scans:', error);
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
      logger.error('Error updating last sync time:', error);
    }
  }

  // Static method for syncing offline data (used by SettingsScreen)
  static async syncOfflineData(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress',
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    
    try {
      // Check connectivity first
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        return {
          success: false,
          message: 'No internet connection',
          errors: ['No internet connection'],
        };
      }

      // Get offline scans
      const offlineScans = await this.getOfflineScans();
      if (offlineScans.length === 0) {
        return {
          success: true,
          message: 'No offline data to sync',
          syncedItems: 0,
        };
      }

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'No user found',
          errors: ['No user found'],
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        return {
          success: false,
          message: 'No organization found',
          errors: ['No organization found'],
        };
      }

      let syncedCount = 0;
      const errors: string[] = [];

      // Sync each offline scan
      for (const scan of offlineScans) {
        try {
          const scanData = {
            order_number: scan.order_number,
            bottle_barcode: scan.bottle_barcode || scan.barcode,
            mode: scan.mode === 'out' ? 'SHIP' : scan.mode === 'in' ? 'RETURN' : (scan.mode || scan.scan_type || scan.action)?.toUpperCase(),
            customer_id: scan.customer_id,
            customer_name: scan.customer_name,
            location: scan.location,
            // scan_date: scan.scan_date || scan.timestamp || new Date().toISOString(), // Removed - column doesn't exist in bottle_scans
            timestamp: scan.timestamp || new Date().toISOString(),
            user_id: scan.user_id,
            organization_id: profile.organization_id,
            created_at: scan.created_at || new Date().toISOString(),
            // notes: scan.notes // Removed - column doesn't exist in bottle_scans
          };

          const { error } = await supabase
            .from('bottle_scans')
            .insert(scanData);

          if (error) {
            errors.push(`Failed to sync scan ${scan.bottle_barcode || scan.barcode}: ${error.message}`);
          } else {
            syncedCount++;
            
            // NOTE: Bottles should NOT be assigned/unassigned here - this bypasses verification
            // Bottle assignment should ONLY happen during approval/verification via assignBottlesToCustomer()
            // This sync only creates scan records, not bottle assignments
            
            // If this is a return scan, we can mark the bottle as empty (status only, no customer unassignment)
            // Customer unassignment will happen during verification
            if (scanData.mode === 'RETURN') {
              const { error: updateError } = await supabase
                .from('bottles')
                .update({ status: 'empty' })
                .eq('barcode_number', scanData.bottle_barcode)
                .eq('organization_id', profile.organization_id);
              
              if (updateError) {
                logger.warn(`Could not update bottle status for ${scanData.bottle_barcode}:`, updateError);
              }
            }
            // NOTE: For SHIP/DELIVERY scans, we do NOT assign bottles here - verification will handle that
          }
        } catch (error) {
          errors.push(`Error syncing scan ${scan.bottle_barcode || scan.barcode}: ${error}`);
        }
      }

      // Clear synced data if successful
      if (syncedCount > 0) {
        await AsyncStorage.removeItem('offline_scans');
        await this.updateLastSyncTime();
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Successfully synced ${syncedCount} items` 
          : `Synced ${syncedCount} items with ${errors.length} errors`,
        syncedItems: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      logger.error('Error in static syncOfflineData:', error);
      return {
        success: false,
        message: `Sync failed: ${error}`,
        errors: [error.toString()],
      };
    } finally {
      this.syncInProgress = false;
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

export const syncService = new SyncService();
export default syncService; 