import { useEffect, useState } from 'react';
import { NotificationService } from '../services/notifications';

export interface UseNotificationsResult {
  expoPushToken: string | null;
  isInitialized: boolean;
  error: Error | null;
  scheduleNotification: typeof NotificationService.scheduleNotification;
  cancelNotification: typeof NotificationService.cancelNotification;
  cancelAllNotifications: typeof NotificationService.cancelAllNotifications;
  setBadgeCount: typeof NotificationService.setBadgeCount;
  getBadgeCount: typeof NotificationService.getBadgeCount;
}

/**
 * Hook for managing push notifications in React components
 */
export const useNotifications = (): UseNotificationsResult => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeNotifications = async () => {
      try {
        const token = await NotificationService.initialize();
        
        if (isMounted) {
          setExpoPushToken(token);
          setIsInitialized(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize notifications'));
          setIsInitialized(true);
        }
      }
    };

    initializeNotifications();

    return () => {
      isMounted = false;
      NotificationService.cleanup();
    };
  }, []);

  return {
    expoPushToken,
    isInitialized,
    error,
    scheduleNotification: NotificationService.scheduleNotification.bind(NotificationService),
    cancelNotification: NotificationService.cancelNotification.bind(NotificationService),
    cancelAllNotifications: NotificationService.cancelAllNotifications.bind(NotificationService),
    setBadgeCount: NotificationService.setBadgeCount.bind(NotificationService),
    getBadgeCount: NotificationService.getBadgeCount.bind(NotificationService),
  };
};
