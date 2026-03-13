import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { authService } from '../services/auth/AuthService';
import { User } from '../types';
import { selectUser, selectAccessToken, selectIsAuthenticated, loadCachedUser } from '../store/slices/authSlice';

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

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service (loads mock user in development)
      await authService.initialize();
      
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
