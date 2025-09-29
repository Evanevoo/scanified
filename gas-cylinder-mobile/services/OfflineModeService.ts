import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export interface OfflineData {
  scans: any[];
  customers: any[];
  cylinders: any[];
  rentals: any[];
  fills: any[];
}

export interface OfflineModeSettings {
  enabled: boolean;
  maxStorageSize: number; // in MB
  autoCleanup: boolean;
  syncOnConnect: boolean;
}

class OfflineModeService {
  private isOfflineMode = false;
  private offlineData: OfflineData = {
    scans: [],
    customers: [],
    cylinders: [],
    rentals: [],
    fills: [],
  };
  private maxStorageSize = 50; // 50MB default
  private isInitialized = false;

  /**
   * Initialize the offline mode service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📱 Initializing OfflineModeService');

      // Load offline mode settings
      await this.loadOfflineModeSettings();

      // Load existing offline data
      await this.loadOfflineData();

      this.isInitialized = true;
      console.log('📱 OfflineModeService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OfflineModeService:', error);
    }
  }

  /**
   * Load offline mode settings from storage
   */
  private async loadOfflineModeSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        this.isOfflineMode = parsedSettings.offlineMode === true;
        console.log('📱 Offline mode setting loaded:', this.isOfflineMode);
      }
    } catch (error) {
      console.error('Error loading offline mode settings:', error);
    }
  }

  /**
   * Load offline data from storage
   */
  private async loadOfflineData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('offline_data');
      if (data) {
        this.offlineData = JSON.parse(data);
        console.log('📱 Offline data loaded:', {
          scans: this.offlineData.scans.length,
          customers: this.offlineData.customers.length,
          cylinders: this.offlineData.cylinders.length,
          rentals: this.offlineData.rentals.length,
          fills: this.offlineData.fills.length,
        });
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  }

  /**
   * Save offline data to storage
   */
  private async saveOfflineData(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_data', JSON.stringify(this.offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  /**
   * Check if offline mode is enabled
   */
  isOfflineModeEnabled(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Enable or disable offline mode
   */
  async setOfflineMode(enabled: boolean): Promise<void> {
    this.isOfflineMode = enabled;
    
    // Update settings in AsyncStorage
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        parsedSettings.offlineMode = enabled;
        await AsyncStorage.setItem('app_settings', JSON.stringify(parsedSettings));
      }
    } catch (error) {
      console.error('Error updating offline mode setting:', error);
    }

    console.log('📱 Offline mode', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Store data offline when offline mode is enabled
   */
  async storeOfflineData(type: keyof OfflineData, data: any): Promise<void> {
    if (!this.isOfflineMode) {
      console.log('📱 Offline mode disabled, not storing data locally');
      return;
    }

    try {
      // Add offline metadata
      const offlineItem = {
        ...data,
        offline_id: Date.now().toString(),
        offline_timestamp: new Date().toISOString(),
        offline_type: type,
      };

      this.offlineData[type].push(offlineItem);
      await this.saveOfflineData();

      console.log(`📱 Stored ${type} data offline:`, offlineItem.offline_id);
    } catch (error) {
      console.error(`Error storing ${type} data offline:`, error);
    }
  }

  /**
   * Store scan data offline
   */
  async storeScanOffline(scanData: any): Promise<void> {
    await this.storeOfflineData('scans', scanData);
  }

  /**
   * Store customer data offline
   */
  async storeCustomerOffline(customerData: any): Promise<void> {
    await this.storeOfflineData('customers', customerData);
  }

  /**
   * Store cylinder data offline
   */
  async storeCylinderOffline(cylinderData: any): Promise<void> {
    await this.storeOfflineData('cylinders', cylinderData);
  }

  /**
   * Store rental data offline
   */
  async storeRentalOffline(rentalData: any): Promise<void> {
    await this.storeOfflineData('rentals', rentalData);
  }

  /**
   * Store fill data offline
   */
  async storeFillOffline(fillData: any): Promise<void> {
    await this.storeOfflineData('fills', fillData);
  }

  /**
   * Get offline data count
   */
  getOfflineDataCount(): { [K in keyof OfflineData]: number } {
    return {
      scans: this.offlineData.scans.length,
      customers: this.offlineData.customers.length,
      cylinders: this.offlineData.cylinders.length,
      rentals: this.offlineData.rentals.length,
      fills: this.offlineData.fills.length,
    };
  }

  /**
   * Get total offline data count
   */
  getTotalOfflineDataCount(): number {
    const counts = this.getOfflineDataCount();
    if (!counts || typeof counts !== 'object') {
      return 0;
    }
    const values = Object.values(counts);
    return (values || []).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get offline data by type
   */
  getOfflineData(type: keyof OfflineData): any[] {
    return [...this.offlineData[type]];
  }

  /**
   * Clear offline data by type
   */
  async clearOfflineData(type?: keyof OfflineData): Promise<void> {
    try {
      if (type) {
        this.offlineData[type] = [];
        console.log(`📱 Cleared offline ${type} data`);
      } else {
        this.offlineData = {
          scans: [],
          customers: [],
          cylinders: [],
          rentals: [],
          fills: [],
        };
        console.log('📱 Cleared all offline data');
      }
      
      await this.saveOfflineData();
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (!this.isOfflineMode) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('📱 Starting offline data sync');

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user found');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      // Sync scans
      for (const scan of this.offlineData.scans) {
        try {
          const scanData = {
            organization_id: profile.organization_id,
            bottle_barcode: scan.bottle_barcode || scan.barcode,
            mode: scan.mode || scan.action,
            customer_id: scan.customer_id,
            customer_name: scan.customer_name,
            location: scan.location,
            scan_date: scan.scan_date || scan.timestamp || new Date().toISOString(),
            timestamp: scan.timestamp || new Date().toISOString(),
            user_id: scan.user_id || user.id,
            order_number: scan.order_number,
            notes: scan.notes,
            created_at: scan.created_at || new Date().toISOString()
          };

          const { error } = await supabase
            .from('bottle_scans')
            .insert(scanData);

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync scan ${scan.offline_id}: ${error}`);
        }
      }

      // Sync customers
      for (const customer of this.offlineData.customers) {
        try {
          const { error } = await supabase
            .from('customers')
            .upsert({
              ...customer,
              organization_id: profile.organization_id,
            });

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync customer ${customer.offline_id}: ${error}`);
        }
      }

      // Sync cylinders
      for (const cylinder of this.offlineData.cylinders) {
        try {
          const { error } = await supabase
            .from('bottles')
            .upsert({
              ...cylinder,
              organization_id: profile.organization_id,
            });

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync cylinder ${cylinder.offline_id}: ${error}`);
        }
      }

      // Sync rentals
      for (const rental of this.offlineData.rentals) {
        try {
          const { error } = await supabase
            .from('rentals')
            .upsert({
              ...rental,
              organization_id: profile.organization_id,
            });

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync rental ${rental.offline_id}: ${error}`);
        }
      }

      // Sync fills
      for (const fill of this.offlineData.fills) {
        try {
          const { error } = await supabase
            .from('cylinder_fills')
            .upsert({
              ...fill,
              organization_id: profile.organization_id,
            });

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync fill ${fill.offline_id}: ${error}`);
        }
      }

      // Clear synced data
      if (syncedCount > 0) {
        await this.clearOfflineData();
      }

      console.log(`📱 Offline data sync complete: ${syncedCount} items synced, ${errors.length} errors`);
      
      return {
        success: errors.length === 0,
        syncedCount,
        errors,
      };
    } catch (error) {
      console.error('Error syncing offline data:', error);
      return {
        success: false,
        syncedCount,
        errors: [...errors, `Sync failed: ${error}`],
      };
    }
  }

  /**
   * Check storage size and cleanup if needed
   */
  async checkStorageSize(): Promise<{ size: number; needsCleanup: boolean }> {
    try {
      const data = await AsyncStorage.getItem('offline_data');
      if (!data) return { size: 0, needsCleanup: false };

      const sizeInBytes = new Blob([data]).size;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      const needsCleanup = sizeInMB > this.maxStorageSize;

      return { size: sizeInMB, needsCleanup };
    } catch (error) {
      console.error('Error checking storage size:', error);
      return { size: 0, needsCleanup: false };
    }
  }

  /**
   * Cleanup old offline data to free space
   */
  async cleanupOldData(): Promise<void> {
    try {
      const { needsCleanup } = await this.checkStorageSize();
      if (!needsCleanup) return;

      console.log('📱 Cleaning up old offline data');

      // Remove oldest 25% of data from each category
      for (const type of Object.keys(this.offlineData) as (keyof OfflineData)[]) {
        const data = this.offlineData[type];
        if (data.length > 0) {
          const removeCount = Math.ceil(data.length * 0.25);
          this.offlineData[type] = data.slice(removeCount);
        }
      }

      await this.saveOfflineData();
      console.log('📱 Old offline data cleaned up');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Get offline mode status
   */
  getStatus(): {
    enabled: boolean;
    dataCount: number;
    storageSize: number;
    needsCleanup: boolean;
  } {
    return {
      enabled: this.isOfflineMode,
      dataCount: this.getTotalOfflineDataCount(),
      storageSize: 0, // Will be updated by checkStorageSize
      needsCleanup: false, // Will be updated by checkStorageSize
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isInitialized = false;
    console.log('📱 OfflineModeService cleaned up');
  }
}

// Export singleton instance
export const offlineModeService = new OfflineModeService();
export default offlineModeService;
