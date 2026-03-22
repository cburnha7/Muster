import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { authService } from '../services/auth/AuthService';
import { User } from '../types';
import { selectUser, selectAccessToken, selectIsAuthenticated, loadCachedUser, clearAuth } from '../store/slices/authSlice';
import { fetchSubscription, clearSubscription } from '../store/slices/subscriptionSlice';
import { setDependents, resetContext } from '../store/slices/contextSlice';
import { loggingService } from '../services/LoggingService';

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

  // Load cached user on mount
  useEffect(() => {
    loadStoredSession();
  }, []);

  // Listen for session expired events from BaseApiService
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSessionExpired = () => {
      console.log('AuthContext: Session expired event received, clearing auth state');
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
        console.warn('Auth initialization timed out or failed, continuing without session');
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

      // Hydrate dependents into context slice for the ContextIndicator pill
      fetch(`${process.env.EXPO_PUBLIC_API_URL}/dependents`, {
        headers: { 'X-User-Id': reduxUser.id },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => dispatch(setDependents(data)))
        .catch(() => {}); // silent — DependentsSection will retry on profile
    }

    if (reduxUser && process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true') {
      authService.switchMockUser(
        reduxUser.id,
        reduxUser.email,
        reduxUser.firstName || 'User',
        reduxUser.lastName || ''
      ).catch(err => console.error('Failed to sync authService with Redux user:', err));
    }
  }, [reduxUser]);

  const login = async (usernameOrEmail: string, password: string) => {
    // Login is handled by Redux thunks, this is just for backward compatibility
    throw new Error('Use Redux loginUser thunk instead');
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout...');
      await authService.logout();
      
      // Dispatch Redux action to clear auth state
      dispatch(clearAuth());
      dispatch(clearSubscription());
      dispatch(resetContext());
      
      console.log('AuthContext: Logout complete');
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
