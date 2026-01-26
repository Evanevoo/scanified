import logger from '../utils/logger';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Helper to check if running in Expo Go
const isExpoGo = () => {
  return Constants.appOwnership === 'expo' || 
         Constants.executionEnvironment === 'storeClient' ||
         __DEV__ && !Constants.appOwnership;
};

// Configure notification behavior (skip in Expo Go for Android SDK 53+)
if (!isExpoGo()) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    // Expo Go limitation - remote push not supported in SDK 53+
    // Local notifications still work, but this prevents startup error
    logger.log('ℹ️  Notification handler setup skipped (likely Expo Go limitation)');
  }
} else {
  logger.log('📱 Running in Expo Go - notification handler setup skipped');
}

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Skip push token registration in Expo Go (SDK 53+ doesn't support remote push)
      if (isExpoGo()) {
        logger.log('📱 Running in Expo Go - skipping remote push setup');
        logger.log('ℹ️  Local notifications still work. Use a development build for full push support.');
        // Still set up local notification listeners for Expo Go
        this.setupNotificationListeners();
        this.isInitialized = true;
        return;
      }

      // Check if device supports push notifications
      if (!Device.isDevice) {
        logger.log('Must use physical device for Push Notifications');
        this.isInitialized = true;
        return;
      }

      // Request permissions (skip in Expo Go to avoid SDK 53+ warnings)
      let finalStatus = 'undetermined';
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (permError: any) {
        // Handle SDK 53+ Expo Go limitation for permissions
        if (permError?.message?.includes('removed from Expo Go') || 
            permError?.message?.includes('development build')) {
          logger.log('📱 Notification permissions not available in Expo Go (SDK 53+)');
          this.isInitialized = true;
          return;
        }
        throw permError;
      }

      if (finalStatus !== 'granted') {
        logger.log('Failed to get push token for push notification!');
        this.isInitialized = true;
        return;
      }

      // Get the push token - wrap in try-catch to handle SDK 53+ Expo Go limitation
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'd71ec042-1fec-4186-ac3b-0ae85a6af345',
        });

        this.expoPushToken = token.data;
        logger.log('Expo push token:', this.expoPushToken);
      } catch (tokenError: any) {
        // Handle SDK 53+ Expo Go limitation gracefully
        if (tokenError?.message?.includes('removed from Expo Go') || 
            tokenError?.message?.includes('development build')) {
          logger.log('📱 Remote push notifications not available in Expo Go (SDK 53+)');
          logger.log('ℹ️  Local notifications still work. Use a development build for full push support.');
        } else {
          logger.error('Error getting push token:', tokenError);
        }
        // Continue initialization even if push token fails - local notifications still work
      }

      // Configure notification categories (skip in Expo Go)
      if (!isExpoGo()) {
        try {
          await this.setupNotificationCategories();
        } catch (error) {
          logger.log('ℹ️  Notification categories setup skipped (Expo Go limitation)');
        }
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
    } catch (error) {
      logger.error('Error initializing notification service:', error);
      this.isInitialized = true; // Mark as initialized to prevent retry loops
    }
  }

  /**
   * Setup notification categories for different types of notifications
   */
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('scan_complete', [
      {
        identifier: 'view_details',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('sync_status', [
      {
        identifier: 'retry_sync',
        buttonTitle: 'Retry Sync',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('maintenance_reminder', [
      {
        identifier: 'schedule_maintenance',
        buttonTitle: 'Schedule',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      logger.log('Notification received:', notification);
      // You can handle the notification here, e.g., show an in-app banner
    });

    // Handle notification response (when user taps on notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      logger.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification response based on category and action
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data;

    switch (notification.request.content.categoryIdentifier) {
      case 'scan_complete':
        if (actionIdentifier === 'view_details') {
          // Navigate to scan details
          // You would typically use navigation here
          logger.log('Navigate to scan details:', data);
        }
        break;

      case 'sync_status':
        if (actionIdentifier === 'retry_sync') {
          // Trigger sync retry
          logger.log('Retry sync requested');
        }
        break;

      case 'maintenance_reminder':
        if (actionIdentifier === 'schedule_maintenance') {
          // Navigate to maintenance scheduling
          logger.log('Navigate to maintenance scheduling:', data);
        }
        break;

      default:
        // Default action - just open the app
        logger.log('Default notification action');
        break;
    }
  }

  /**
   * Send a local notification
   */
  public async sendLocalNotification(data: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          categoryIdentifier: data.categoryId,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      logger.error('Error sending local notification:', error);
    }
  }

  /**
   * Schedule a notification for a specific time
   */
  public async scheduleNotification(
    data: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          categoryIdentifier: data.categoryId,
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      logger.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      logger.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get the Expo push token
   */
  public getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Register device for push notifications with Supabase
   */
  public async registerDevice(userId: string, organizationId: string): Promise<void> {
    if (!this.expoPushToken) {
      logger.log('No push token available');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          organization_id: organizationId,
          device_token: this.expoPushToken,
          platform: Platform.OS,
          device_model: Device.modelName || 'Unknown',
          os_version: Device.osVersion || 'Unknown',
          app_version: '1.0.0', // You should get this from your app config
          is_active: true,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_token'
        });

      if (error) {
        logger.error('Error registering device:', error);
        // Don't throw error - just log it so the app doesn't crash
        logger.log('Device registration failed, but app will continue to work');
      } else {
        logger.log('Device registered successfully');
      }
    } catch (error) {
      logger.error('Error registering device:', error);
      // Don't throw error - just log it so the app doesn't crash
      logger.log('Device registration failed, but app will continue to work');
    }
  }

  /**
   * Unregister device from push notifications
   */
  public async unregisterDevice(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) {
        logger.error('Error unregistering device:', error);
      } else {
        logger.log('Device unregistered successfully');
      }
    } catch (error) {
      logger.error('Error unregistering device:', error);
    }
  }

  /**
   * Send a push notification to a specific user
   */
  public async sendPushNotification(
    userId: string,
    data: NotificationData
  ): Promise<void> {
    try {
      // Get user's device tokens
      const { data: devices, error } = await supabase
        .from('user_devices')
        .select('device_token')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching user devices:', error);
        return;
      }

      if (!devices || devices.length === 0) {
        logger.log('No active devices found for user');
        return;
      }

      // Send notification to all user devices
      const messages = devices.map(device => ({
        to: device.device_token,
        sound: 'default',
        title: data.title,
        body: data.body,
        data: data.data || {},
        categoryId: data.categoryId,
      }));

      // Send via Expo push service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`Push notification failed: ${response.status}`);
      }

      logger.log('Push notification sent successfully');
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  /**
   * Send a push notification to all users in an organization
   */
  public async sendOrganizationNotification(
    organizationId: string,
    data: NotificationData
  ): Promise<void> {
    try {
      // Get all active devices in the organization
      const { data: devices, error } = await supabase
        .from('user_devices')
        .select('device_token')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching organization devices:', error);
        return;
      }

      if (!devices || devices.length === 0) {
        logger.log('No active devices found for organization');
        return;
      }

      // Send notification to all devices
      const messages = devices.map(device => ({
        to: device.device_token,
        sound: 'default',
        title: data.title,
        body: data.body,
        data: data.data || {},
        categoryId: data.categoryId,
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`Organization notification failed: ${response.status}`);
      }

      logger.log('Organization notification sent successfully');
    } catch (error) {
      logger.error('Error sending organization notification:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  public async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  public async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get notification settings
   */
  public async getNotificationSettings(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Send a success notification for barcode scan
   */
  public async sendScanSuccessNotification(barcode: string): Promise<void> {
    await this.sendLocalNotification({
      title: 'Scan Successful',
      body: `Barcode ${barcode} processed successfully`,
      categoryId: 'scan_complete',
      data: { barcode, type: 'scan_success' }
    });
  }

  /**
   * Send an error notification for barcode scan
   */
  public async sendScanErrorNotification(error: string): Promise<void> {
    await this.sendLocalNotification({
      title: 'Scan Failed',
      body: error || 'Failed to process scan',
      categoryId: 'sync_status',
      data: { error, type: 'scan_error' }
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
export default notificationService;