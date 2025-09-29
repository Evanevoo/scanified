import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

export interface NotificationSettings {
  enabled: boolean;
  scanNotifications: boolean;
  syncNotifications: boolean;
  errorNotifications: boolean;
  batchCompleteNotifications: boolean;
}

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
}

class NotificationService {
  private isInitialized = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing NotificationService (Basic Mode)');
      this.isInitialized = true;
      console.log('🔔 NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Check if notifications are enabled in settings
   */
  private async areNotificationsEnabled(): Promise<boolean> {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        return parsedSettings.notifications === true;
      }
      return true; // Default to enabled if no settings found
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return true;
    }
  }

  /**
   * Send a local notification (using Alert for now)
   */
  async sendLocalNotification(notification: NotificationData): Promise<void> {
    try {
      // Check if notifications are enabled
      const enabled = await this.areNotificationsEnabled();
      if (!enabled) {
        console.log('🔔 Notifications disabled, skipping notification');
        return;
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      // For now, use Alert as a fallback
      console.log('🔔 Showing notification:', notification.title, notification.body);
      
      // In a real implementation, you would use expo-notifications here
      // For now, we'll just log and show alerts for important notifications
      if (notification.priority === 'high') {
        Alert.alert(notification.title, notification.body);
      }
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Send scan success notification
   */
  async sendScanSuccessNotification(barcode?: string, count?: number): Promise<void> {
    const title = count ? `Batch Scan Complete` : `Scan Successful`;
    const body = count 
      ? `${count} items scanned successfully`
      : barcode 
        ? `Barcode ${barcode} scanned successfully`
        : `Item scanned successfully`;

    await this.sendLocalNotification({
      title,
      body,
      data: { action: 'view_scan', barcode, count },
      priority: 'default',
    });
  }

  /**
   * Send scan error notification
   */
  async sendScanErrorNotification(error: string): Promise<void> {
    await this.sendLocalNotification({
      title: 'Scan Failed',
      body: error,
      data: { action: 'error' },
      priority: 'high',
    });
  }

  /**
   * Send sync notification
   */
  async sendSyncNotification(success: boolean, message: string, count?: number): Promise<void> {
    const title = success ? 'Sync Complete' : 'Sync Failed';
    const body = success 
      ? count 
        ? `Successfully synced ${count} items`
        : message
      : message;

    await this.sendLocalNotification({
      title,
      body,
      data: { action: 'sync', success, count },
      priority: success ? 'default' : 'high',
    });
  }

  /**
   * Send batch complete notification
   */
  async sendBatchCompleteNotification(count: number): Promise<void> {
    await this.sendLocalNotification({
      title: 'Batch Complete',
      body: `Successfully scanned ${count} items`,
      data: { action: 'batch_complete', count },
      priority: 'default',
    });
  }

  /**
   * Send offline mode notification
   */
  async sendOfflineModeNotification(enabled: boolean): Promise<void> {
    const title = enabled ? 'Offline Mode Enabled' : 'Offline Mode Disabled';
    const body = enabled 
      ? 'Data will be stored locally until connection is restored'
      : 'Data will sync automatically when connected';

    await this.sendLocalNotification({
      title,
      body,
      data: { action: 'offline_mode', enabled },
      priority: 'low',
    });
  }

  /**
   * Send connection status notification
   */
  async sendConnectionNotification(connected: boolean): Promise<void> {
    const title = connected ? 'Connection Restored' : 'Connection Lost';
    const body = connected 
      ? 'Internet connection restored. Auto-sync will attempt to sync offline data.'
      : 'Internet connection lost. Data will be stored offline.';

    await this.sendLocalNotification({
      title,
      body,
      data: { action: 'connection', connected },
      priority: 'default',
    });
  }

  /**
   * Show alert notification (fallback for when push notifications fail)
   */
  showAlertNotification(title: string, message: string): void {
    Alert.alert(title, message);
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        return JSON.parse(settings);
      }
      
      // Return default settings
      return {
        enabled: true,
        scanNotifications: true,
        syncNotifications: true,
        errorNotifications: true,
        batchCompleteNotifications: true,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: true,
        scanNotifications: true,
        syncNotifications: true,
        errorNotifications: true,
        batchCompleteNotifications: true,
      };
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getNotificationSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
      console.log('🔔 Notification settings updated:', newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      console.log('🔔 All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(delivery: any, organization: any): Promise<void> {
    try {
      const notificationData: NotificationData = {
        title: 'Delivery Update',
        body: `Your delivery status has been updated to ${delivery.status}`,
        data: {
          deliveryId: delivery.id,
          status: delivery.status,
          type: 'delivery_update'
        },
        sound: true,
        priority: 'high'
      };

      await this.sendNotification(notificationData);
      console.log('✅ Delivery notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending delivery notification:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isInitialized = false;
    console.log('🔔 NotificationService cleaned up');
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
