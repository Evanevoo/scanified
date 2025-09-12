import NetInfo from '@react-native-community/netinfo';
import { SyncService } from './SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConnectivityStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  strength?: number;
}

export interface ConnectivityCallback {
  onConnectivityChange: (status: ConnectivityStatus) => void;
  onConnectionRestored: () => void;
  onConnectionLost: () => void;
}

class ConnectivityService {
  private listeners: ConnectivityCallback[] = [];
  private currentStatus: ConnectivityStatus | null = null;
  private isMonitoring = false;
  private netInfoUnsubscribe: (() => void) | null = null;

  /**
   * Start monitoring connectivity changes
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🌐 Starting connectivity monitoring');

    // Subscribe to network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const newStatus: ConnectivityStatus = {
        isConnected: state.isConnected || false,
        isInternetReachable: state.isInternetReachable || false,
        type: state.type || 'unknown',
        strength: state.details?.strength,
      };

      this.handleConnectivityChange(newStatus);
    });

    // Get initial status
    this.getCurrentStatus().then((status) => {
      this.currentStatus = status;
      this.notifyListeners(status);
    });
  }

  /**
   * Stop monitoring connectivity changes
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('🌐 Stopping connectivity monitoring');

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  /**
   * Add a connectivity listener
   */
  addListener(callback: ConnectivityCallback): void {
    this.listeners.push(callback);
    
    // Immediately notify with current status if available
    if (this.currentStatus) {
      callback.onConnectivityChange(this.currentStatus);
    }
  }

  /**
   * Remove a connectivity listener
   */
  removeListener(callback: ConnectivityCallback): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Get current connectivity status
   */
  async getCurrentStatus(): Promise<ConnectivityStatus> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected || false,
        isInternetReachable: state.isInternetReachable || false,
        type: state.type || 'unknown',
        strength: state.details?.strength,
      };
    } catch (error) {
      console.error('Error getting connectivity status:', error);
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      };
    }
  }

  /**
   * Check if device is currently connected
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getCurrentStatus();
    return status.isConnected && status.isInternetReachable;
  }

  /**
   * Handle connectivity changes
   */
  private handleConnectivityChange(newStatus: ConnectivityStatus): void {
    const wasConnected = this.currentStatus?.isConnected && this.currentStatus?.isInternetReachable;
    const isNowConnected = newStatus.isConnected && newStatus.isInternetReachable;

    this.currentStatus = newStatus;

    // Notify all listeners
    this.notifyListeners(newStatus);

    // Handle connection state changes
    if (!wasConnected && isNowConnected) {
      console.log('🌐 Connection restored');
      this.handleConnectionRestored();
    } else if (wasConnected && !isNowConnected) {
      console.log('🌐 Connection lost');
      this.handleConnectionLost();
    }
  }

  /**
   * Handle connection restored
   */
  private async handleConnectionRestored(): Promise<void> {
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener.onConnectionRestored();
      } catch (error) {
        console.error('Error in connection restored callback:', error);
      }
    });

    // Check if auto-sync is enabled
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        if (parsedSettings.autoSync) {
          console.log('🔄 Auto-sync enabled, attempting background sync');
          await this.attemptAutoSync();
        } else {
          console.log('🔄 Auto-sync disabled, skipping background sync');
        }
      }
    } catch (error) {
      console.error('Error checking auto-sync setting:', error);
    }
  }

  /**
   * Handle connection lost
   */
  private handleConnectionLost(): void {
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener.onConnectionLost();
      } catch (error) {
        console.error('Error in connection lost callback:', error);
      }
    });
  }

  /**
   * Attempt automatic sync when connection is restored
   */
  private async attemptAutoSync(): Promise<void> {
    try {
      // Check if there's offline data to sync
      const offlineCount = await SyncService.getOfflineScanCount();
      if (offlineCount === 0) {
        console.log('🔄 No offline data to sync');
        return;
      }

      console.log(`🔄 Attempting to sync ${offlineCount} offline items`);
      
      // Attempt sync
      const result = await SyncService.syncOfflineData();
      
      if (result.success) {
        console.log('✅ Auto-sync successful:', result.message);
      } else {
        console.log('❌ Auto-sync failed:', result.message);
      }
    } catch (error) {
      console.error('Error during auto-sync:', error);
    }
  }

  /**
   * Notify all listeners of connectivity changes
   */
  private notifyListeners(status: ConnectivityStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener.onConnectivityChange(status);
      } catch (error) {
        console.error('Error in connectivity change callback:', error);
      }
    });
  }

  /**
   * Test connectivity with a simple request
   */
  async testConnectivity(): Promise<boolean> {
    try {
      // First check network info
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        return false;
      }

      // Then test with a simple HTTP request
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 5000 
      });
      
      return response.ok;
    } catch (error) {
      console.error('Connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get detailed connectivity information
   */
  async getDetailedStatus(): Promise<{
    status: ConnectivityStatus;
    testResult: boolean;
    timestamp: string;
  }> {
    const status = await this.getCurrentStatus();
    const testResult = await this.testConnectivity();
    
    return {
      status,
      testResult,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const connectivityService = new ConnectivityService();
export default connectivityService;
