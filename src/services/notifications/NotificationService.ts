import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  eventReminders: boolean;
  eventUpdates: boolean;
  newEventAlerts: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
}

export interface NotificationData {
  type:
    | 'booking_confirmation'
    | 'booking_reminder'
    | 'event_update'
    | 'event_cancelled'
    | 'discovery';
  eventId?: string;
  bookingId?: string;
  teamId?: string;
  [key: string]: any;
}

class NotificationServiceClass {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<string | null> {
    try {
      // Request permissions
      const token = await this.registerForPushNotifications();

      if (token) {
        this.expoPushToken = token;

        // Set up notification listeners
        this.setupNotificationListeners();

        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  /**
   * Register device for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check if running on a physical device
    const isDevice = Constants.isDevice;

    if (!isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
        // Handle notification received in foreground
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for user interactions with notifications
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        // Handle notification tap/interaction
        this.handleNotificationResponse(response);
      });
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const data = notification.request.content.data as NotificationData;

    // Custom handling based on notification type
    switch (data.type) {
      case 'booking_confirmation':
      case 'booking_reminder':
      case 'event_update':
      case 'event_cancelled':
      case 'discovery':
        // Notification will be displayed automatically by the handler
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Handle user interaction with notification
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as NotificationData;

    // Navigate to appropriate screen based on notification type
    switch (data.type) {
      case 'booking_confirmation':
      case 'booking_reminder':
        if (data.bookingId) {
          // Navigation will be handled by the app's navigation system
          console.log('Navigate to booking:', data.bookingId);
        }
        break;
      case 'event_update':
      case 'event_cancelled':
        if (data.eventId) {
          console.log('Navigate to event:', data.eventId);
        }
        break;
      case 'discovery':
        console.log('Navigate to event discovery');
        break;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || null, // null means immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Get the current Expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clean up notification listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Get badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }
}

export const NotificationService = new NotificationServiceClass();
