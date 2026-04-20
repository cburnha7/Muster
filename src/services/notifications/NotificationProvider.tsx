import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { NotificationService } from './NotificationService';
import TokenStorage from '../auth/TokenStorage';
import { API_BASE_URL } from '../api/config';

interface NotificationContextValue {
  expoPushToken: string | null;
  isInitialized: boolean;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextValue>({
  expoPushToken: null,
  isInitialized: false,
  error: null,
});

export const useNotificationContext = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes notifications for the entire app
 */
export function NotificationProvider({
  children,
}: NotificationProviderProps): JSX.Element {
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

          if (token) {
            console.log('Notifications initialized with token:', token);
            // Register push token with the backend
            try {
              const jwt = await TokenStorage.getAccessToken();
              if (jwt) {
                const platform =
                  Platform.OS === 'ios'
                    ? 'ios'
                    : Platform.OS === 'android'
                      ? 'android'
                      : 'web';
                await fetch(`${API_BASE_URL}/push-tokens`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                  },
                  body: JSON.stringify({ token, platform }),
                });
              }
            } catch (regErr) {
              console.warn(
                'Failed to register push token with backend:',
                regErr
              );
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorObj =
            err instanceof Error
              ? err
              : new Error('Failed to initialize notifications');
          setError(errorObj);
          setIsInitialized(true);
          console.error('Notification initialization error:', errorObj);
        }
      }
    };

    initializeNotifications();

    return () => {
      isMounted = false;
      NotificationService.cleanup();
    };
  }, []);

  const value: NotificationContextValue = {
    expoPushToken,
    isInitialized,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
