import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { authService } from '../services/auth/AuthService';
import TokenStorage from '../services/auth/TokenStorage';
import { User } from '../types';
import {
  selectUser,
  selectAccessToken,
  selectIsAuthenticated,
  loadCachedUser,
  clearAuth,
  setUser,
} from '../store/slices/authSlice';
import {
  fetchSubscription,
  clearSubscription,
} from '../store/slices/subscriptionSlice';
import { setDependents, resetContext } from '../store/slices/contextSlice';
import { loggingService } from '../services/LoggingService';
import { userService } from '../services/api/UserService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch();

  // Get auth state from Redux
  const reduxUser = useSelector(selectUser);
  const reduxToken = useSelector(selectAccessToken);
  const reduxIsAuthenticated = useSelector(selectIsAuthenticated);

  const [isLoading, setIsLoading] = useState(true);
  const lastRefreshedUserId = useRef<string | null>(null);

  // Load cached user on mount
  useEffect(() => {
    loadStoredSession();
  }, []);

  // Listen for session expired events from BaseApiService (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleSessionExpired = () => {
      dispatch(clearAuth());
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{ text: 'OK' }]
      );
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, [dispatch]);

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);

      // Initialize auth service with a timeout to prevent hanging on bad network
      const initPromise = authService.initialize();
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Auth init timeout')), 5000)
      );

      try {
        await Promise.race([initPromise, timeoutPromise]);
      } catch (err) {
        console.warn(
          'Auth initialization timed out or failed, continuing without session'
        );
      }

      // Load cached user from TokenStorage into Redux
      await dispatch(loadCachedUser() as any);
    } catch (error) {
      console.error('Load session error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync authService with Redux user for mock auth
  useEffect(() => {
    // Keep logging service in sync with current user
    loggingService.setUserId(reduxUser?.id ?? null);

    // Hydrate subscription state when user is available
    if (reduxUser?.id) {
      dispatch(fetchSubscription(reduxUser.id) as any);

      // Fetch fresh profile from server to ensure avatar and other data are current
      // Only do this once per user ID to avoid redundant fetches
      if (lastRefreshedUserId.current !== reduxUser.id) {
        lastRefreshedUserId.current = reduxUser.id;

        userService
          .getProfile()
          .then(async freshProfile => {
            dispatch(setUser(freshProfile as any));
            await TokenStorage.storeUser(freshProfile as any);
          })
          .catch(err => console.warn('Failed to refresh profile:', err));
      }

      // Hydrate dependents into context slice for the ContextIndicator pill
      TokenStorage.getAccessToken()
        .then(tkn =>
          import('../services/api/config').then(({ API_BASE_URL }) =>
            fetch(`${API_BASE_URL}/dependents`, {
              headers: { ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}) },
            })
          )
        )
        .then(res => (res.ok ? res.json() : []))
        .then(data => dispatch(setDependents(data)))
        .catch(err => console.warn('Failed to load dependents:', err));
    }

    if (reduxUser && process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true') {
      authService
        .switchMockUser(
          reduxUser.id,
          reduxUser.email,
          reduxUser.firstName || 'User',
          reduxUser.lastName || ''
        )
        .catch(err =>
          console.error('Failed to sync authService with Redux user:', err)
        );
    }
  }, [reduxUser]);

  const login = async (usernameOrEmail: string, password: string) => {
    // Login is handled by Redux thunks, this is just for backward compatibility
    throw new Error('Use Redux loginUser thunk instead');
  };

  const logout = async () => {
    try {
      await authService.logout();

      // Ensure TokenStorage is fully cleared (covers both old and new key sets)
      await TokenStorage.clearAll();

      // Dispatch Redux action to clear auth state
      dispatch(clearAuth());
      dispatch(clearSubscription());
      dispatch(resetContext());
      lastRefreshedUserId.current = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user: reduxUser,
    token: reduxToken,
    isLoading,
    isAuthenticated: reduxIsAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
