import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Offline Storage Service for Mobile App
 * Handles local data caching and sync when online
 */

interface OfflineData {
  id: string;
  type: 'scan' | 'cylinder_update' | 'customer_update' | 'rental_update';
  data: any;
  timestamp: number;
  organizationId: string;
  userId: string;
  synced: boolean;
}

interface CachedData {
  bottles: any[];
  customers: any[];
  rentals: any[];
  lastSync: number;
  organizationId: string;
}

export class OfflineStorageService {
  private static OFFLINE_QUEUE_KEY = 'offline_queue';
  private static CACHED_DATA_KEY = 'cached_data';
  private static LAST_SYNC_KEY = 'last_sync';

  /**
   * Check if device is online
   */
  static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  }

  /**
   * Store data for offline use
   */
  static async cacheData(organizationId: string, data: Partial<CachedData>): Promise<void> {
    try {
      const existingData = await this.getCachedData(organizationId) || {};
      
      const cachedData: CachedData = {
        bottles: data.bottles || existingData.bottles || [],
        customers: data.customers || existingData.customers || [],
        rentals: data.rentals || existingData.rentals || [],
        lastSync: Date.now(),
        organizationId
      };

      await AsyncStorage.setItem(
        `${this.CACHED_DATA_KEY}_${organizationId}`, 
        JSON.stringify(cachedData)
      );

      console.log('📱 Data cached for offline use:', {
        bottles: cachedData.bottles.length,
        customers: cachedData.customers.length,
        rentals: cachedData.rentals.length
      });

    } catch (error) {
      console.error('❌ Error caching data:', error);
    }
  }

  /**
   * Get cached data for offline use
   */
  static async getCachedData(organizationId: string): Promise<CachedData | null> {
    try {
      const data = await AsyncStorage.getItem(`${this.CACHED_DATA_KEY}_${organizationId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Add operation to offline queue
   */
  static async addToOfflineQueue(operation: Omit<OfflineData, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      
      const newOperation: OfflineData = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        synced: false,
        ...operation
      };

      queue.push(newOperation);
      
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      console.log('📱 Added to offline queue:', newOperation.type, newOperation.id);

    } catch (error) {
      console.error('❌ Error adding to offline queue:', error);
    }
  }

  /**
   * Get offline queue
   */
  static async getOfflineQueue(): Promise<OfflineData[]> {
    try {
      const data = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Sync offline operations when online
   */
  static async syncOfflineOperations(supabase: any): Promise<{ success: number; failed: number }> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        console.log('📱 Device is offline, skipping sync');
        return { success: 0, failed: 0 };
      }

      const queue = await this.getOfflineQueue();
      const unsyncedOperations = queue.filter(op => !op.synced);

      if (unsyncedOperations.length === 0) {
        console.log('📱 No offline operations to sync');
        return { success: 0, failed: 0 };
      }

      console.log(`📱 Syncing ${unsyncedOperations.length} offline operations...`);

      let successCount = 0;
      let failedCount = 0;

      for (const operation of unsyncedOperations) {
        try {
          await this.syncOperation(supabase, operation);
          
          // Mark as synced
          operation.synced = true;
          successCount++;
          
        } catch (error) {
          console.error(`❌ Failed to sync operation ${operation.id}:`, error);
          failedCount++;
        }
      }

      // Update queue with sync status
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      console.log(`📱 Sync completed: ${successCount} success, ${failedCount} failed`);
      
      return { success: successCount, failed: failedCount };

    } catch (error) {
      console.error('❌ Error syncing offline operations:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Sync individual operation
   */
  private static async syncOperation(supabase: any, operation: OfflineData): Promise<void> {
    switch (operation.type) {
      case 'scan':
        await this.syncScanOperation(supabase, operation);
        break;
      case 'cylinder_update':
        await this.syncCylinderUpdate(supabase, operation);
        break;
      case 'customer_update':
        await this.syncCustomerUpdate(supabase, operation);
        break;
      case 'rental_update':
        await this.syncRentalUpdate(supabase, operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Sync scan operation
   */
  private static async syncScanOperation(supabase: any, operation: OfflineData): Promise<void> {
    console.log('🔄 Syncing scan operation:', {
      organizationId: operation.organizationId,
      userId: operation.userId,
      customerId: operation.data.customer_id,
      orderNumber: operation.data.order_number
    });

    const { data, error } = await supabase
      .from('scans')
      .insert([{
        organization_id: operation.organizationId || null,
        barcode_number: operation.data.barcode_number,
        action: operation.data.action,
        location: operation.data.location || null,
        notes: operation.data.notes || null,
        scanned_by: operation.userId || null,
        order_number: operation.data.order_number || null,
        customer_name: operation.data.customer_name || null,
        customer_id: operation.data.customer_id || null
      }]);

    if (error) {
      console.error('❌ Scan sync error:', error);
      throw error;
    }
    
    console.log('✅ Scan synced successfully');
  }

  /**
   * Sync cylinder update
   */
  private static async syncCylinderUpdate(supabase: any, operation: OfflineData): Promise<void> {
    const { data, error } = await supabase
      .from('bottles')
      .upsert([{
        ...operation.data,
        organization_id: operation.organizationId,
        updated_at: new Date(operation.timestamp).toISOString()
      }]);

    if (error) throw error;
  }

  /**
   * Sync customer update
   */
  private static async syncCustomerUpdate(supabase: any, operation: OfflineData): Promise<void> {
    const { data, error } = await supabase
      .from('customers')
      .upsert([{
        ...operation.data,
        organization_id: operation.organizationId,
        updated_at: new Date(operation.timestamp).toISOString()
      }]);

    if (error) throw error;
  }

  /**
   * Sync rental update
   */
  private static async syncRentalUpdate(supabase: any, operation: OfflineData): Promise<void> {
    const { data, error } = await supabase
      .from('rentals')
      .upsert([{
        ...operation.data,
        organization_id: operation.organizationId,
        updated_at: new Date(operation.timestamp).toISOString()
      }]);

    if (error) throw error;
  }

  /**
   * Clear synced operations from queue
   */
  static async clearSyncedOperations(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const unsyncedOperations = queue.filter(op => !op.synced);
      
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(unsyncedOperations));
      
      console.log(`📱 Cleared ${queue.length - unsyncedOperations.length} synced operations`);

    } catch (error) {
      console.error('❌ Error clearing synced operations:', error);
    }
  }

  /**
   * Get offline queue statistics
   */
  static async getQueueStats(): Promise<{ total: number; pending: number; synced: number }> {
    try {
      const queue = await this.getOfflineQueue();
      const pending = queue.filter(op => !op.synced).length;
      const synced = queue.filter(op => op.synced).length;

      return {
        total: queue.length,
        pending,
        synced
      };

    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      return { total: 0, pending: 0, synced: 0 };
    }
  }

  /**
   * Clear all cached data (for logout/reset)
   */
  static async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const relevantKeys = keys.filter(key => 
        key.startsWith(this.CACHED_DATA_KEY) || 
        key.startsWith(this.OFFLINE_QUEUE_KEY) ||
        key.startsWith(this.LAST_SYNC_KEY)
      );

      await AsyncStorage.multiRemove(relevantKeys);
      
      console.log('📱 Cleared all offline data');

    } catch (error) {
      console.error('❌ Error clearing offline data:', error);
    }
  }

  /**
   * Check if data is stale and needs refresh
   */
  static async isDataStale(organizationId: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const cachedData = await this.getCachedData(organizationId);
      if (!cachedData) return true;

      const age = Date.now() - cachedData.lastSync;
      return age > maxAge;

    } catch (error) {
      console.error('❌ Error checking data staleness:', error);
      return true;
    }
  }

  /**
   * Preload essential data for offline use
   */
  static async preloadEssentialData(supabase: any, organizationId: string): Promise<void> {
    try {
      console.log('📱 Preloading essential data for offline use...');

      const [bottlesResult, customersResult, rentalsResult] = await Promise.allSettled([
        supabase.from('bottles').select('*').eq('organization_id', organizationId).limit(1000),
        supabase.from('customers').select('*').eq('organization_id', organizationId).limit(500),
        supabase.from('rentals').select('*').eq('organization_id', organizationId).eq('status', 'active').limit(500)
      ]);

      const bottles = bottlesResult.status === 'fulfilled' ? bottlesResult.value.data || [] : [];
      const customers = customersResult.status === 'fulfilled' ? customersResult.value.data || [] : [];
      const rentals = rentalsResult.status === 'fulfilled' ? rentalsResult.value.data || [] : [];

      await this.cacheData(organizationId, { bottles, customers, rentals });

      console.log('📱 Essential data preloaded successfully');

    } catch (error) {
      console.error('❌ Error preloading essential data:', error);
    }
  }
}

export default OfflineStorageService;
