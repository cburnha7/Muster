import { useState, useEffect, useCallback } from 'react';
import { authService } from './AuthService';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User 
} from '../../types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isInitialized = await authService.initialize();
        setState(prev => ({
          ...prev,
          user: authService.getCurrentUser(),
          isAuthenticated: authService.isAuthenticated(),
          isLoading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Authentication initialization failed',
          isLoading: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authResponse = await authService.login(credentials);
      setState(prev => ({
        ...prev,
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authResponse = await authService.register(userData);
      setState(prev => ({
        ...prev,
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await authService.logout();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      // Even if logout fails on server, clear local state
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }));
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await authService.requestPasswordReset(email);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Password reset request failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await authService.resetPassword(token, newPassword);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Password reset failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await authService.refreshAccessToken();
      setState(prev => ({
        ...prev,
        user: authService.getCurrentUser(),
        isAuthenticated: authService.isAuthenticated(),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    clearError,
    refreshAuth,
  };
}