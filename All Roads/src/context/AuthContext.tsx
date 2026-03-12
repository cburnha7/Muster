import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth/AuthService';
import { User } from '../types';

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored session on mount
  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service (loads mock user in development)
      await authService.initialize();
      
      const currentUser = authService.getCurrentUser();
      const currentToken = authService.getToken();

      if (currentToken && currentUser) {
        setToken(currentToken);
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Load session error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await authService.login(usernameOrEmail, password);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout...');
      await authService.logout();
      console.log('AuthContext: Cleared storage, setting user to null');
      setUser(null);
      setToken(null);
      console.log('AuthContext: Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
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
