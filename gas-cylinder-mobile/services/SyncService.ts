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
      console.error('Background sync failed:', error);
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
        console.log('No user found, skipping sync');
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
        console.log('No organization found, skipping sync');
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
      
      console.log('Offline data synced successfully');
      return {
        success: true,
        message: 'Offline data synced successfully',
        syncedItems: 0,
      };
    } catch (error) {
      console.error('Error syncing offline data:', error);
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
      console.error('Error syncing customer:', error);
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
      console.error('Error syncing cylinder:', error);
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
      console.error('Error syncing rental:', error);
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
      console.error('Error syncing fill:', error);
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
      console.error('Error saving offline data:', error);
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
      console.error('Error getting offline data:', error);
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
      console.error('Error clearing offline data:', error);
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
      console.error(`Error fetching ${table}:`, error);
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
      console.error(`Error inserting into ${table}:`, error);
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
      console.error(`Error updating ${table}:`, error);
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
      console.error(`Error deleting from ${table}:`, error);
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