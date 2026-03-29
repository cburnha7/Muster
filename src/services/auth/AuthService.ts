import { Platform } from 'react-native';
import TokenStorage from './TokenStorage';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenResponse,
  User,
  SportType,
} from '../../types';

export interface AuthServiceConfig {
  baseURL: string;
  tokenRefreshThreshold: number; // minutes before expiry to refresh
}

export class AuthService {
  private config: AuthServiceConfig;
  private currentUser: User | null = null;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: Date | null = null;

  constructor(config: AuthServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the auth service by loading stored tokens and user data
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we're in development mode and want to use mock auth
      const useMockAuth = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

      if (useMockAuth) {
        // DEVELOPMENT MODE: Check localStorage for selected user, no default
        console.warn('⚠️ Using mock authentication - NOT FOR PRODUCTION');

        let userId: string | null = null;
        let email: string | null = null;
        let firstName: string | null = null;
        let lastName: string | null = null;

        if (Platform.OS === 'web') {
          userId = localStorage.getItem('mock_user_id');
          email = localStorage.getItem('mock_user_email');
          firstName = localStorage.getItem('mock_user_firstName');
          lastName = localStorage.getItem('mock_user_lastName');
        }

        // If no user selected, return false to show login screen
        if (!userId || !email || !firstName || !lastName) {
          console.log('⚠️ No mock user selected, showing login screen');
          return false;
        }

        this.currentUser = {
          id: userId,
          email,
          firstName,
          lastName,
          profileImage: `https://ui-avatars.com/api/?name=${firstName}&background=3B82F6&color=fff&size=200`,
          phoneNumber: '+1 (555) 123-4567',
          preferredSports: [SportType.BASKETBALL, SportType.SOCCER],
          notificationPreferences: {
            eventReminders: true,
            eventUpdates: true,
            newEventAlerts: true,
            marketingEmails: false,
            pushNotifications: true,
          },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date(),
        };
        this.token = 'mock_token_' + Date.now();
        this.refreshToken = 'mock_refresh_token_' + Date.now();
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        console.log('👤 Mock user loaded:', email, userId);
        return true;
      }

      // Production code: Load from TokenStorage (unified storage layer)
      const token = await TokenStorage.getAccessToken();
      const refreshToken = await TokenStorage.getRefreshToken();
      const user = await TokenStorage.getUser();

      if (token && refreshToken && user) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.currentUser = user;
        // expiresAt is not stored in TokenStorage; rely on server 401 / JWT parsing
        this.expiresAt = null;

        // Check if token needs refresh
        if (this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      await this.clearStoredAuth();
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const authResponse: AuthResponse = await response.json();
      await this.storeAuthData(authResponse);

      return authResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user account
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const authResponse: AuthResponse = await response.json();
      await this.storeAuthData(authResponse);

      return authResponse;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout and clear all stored authentication data
   */
  async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      if (this.token && this.refreshToken) {
        await fetch(`${this.config.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch (error) {
      // Logout from server failed, but we'll still clear local data
      console.warn('Server logout failed:', error);
    } finally {
      await this.clearStoredAuth();
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.config.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        // If refresh fails, clear auth data and require re-login
        await this.clearStoredAuth();
        throw new Error(error.message || 'Token refresh failed');
      }

      const tokenResponse: TokenResponse = await response.json();
      await this.storeTokenData(tokenResponse);

      return tokenResponse;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Get current authentication token (in-memory)
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get stored token from persistent storage via TokenStorage
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await TokenStorage.getAccessToken();
    } catch {
      return null;
    }
  }

  /**
   * Get current authenticated user (in-memory)
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get stored user from persistent storage via TokenStorage
   */
  async getStoredUser(): Promise<User | null> {
    try {
      return await TokenStorage.getUser();
    } catch {
      return null;
    }
  }

  /**
   * Switch mock user (development only)
   */
  async switchMockUser(userId: string, email: string, firstName: string, lastName: string): Promise<void> {
    if (process.env.EXPO_PUBLIC_USE_MOCK_AUTH !== 'true') {
      throw new Error('Mock user switching only available in development mode');
    }

    // Store selected user in localStorage
    if (Platform.OS === 'web') {
      localStorage.setItem('mock_user_id', userId);
      localStorage.setItem('mock_user_email', email);
      localStorage.setItem('mock_user_firstName', firstName);
      localStorage.setItem('mock_user_lastName', lastName);
    }

    // Update current user
    this.currentUser = {
      id: userId,
      email,
      firstName,
      lastName,
      profileImage: `https://ui-avatars.com/api/?name=${firstName}&background=3B82F6&color=fff&size=200`,
      phoneNumber: '+1 (555) 123-4567',
      preferredSports: [SportType.BASKETBALL, SportType.SOCCER],
      notificationPreferences: {
        eventReminders: true,
        eventUpdates: true,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    };
    this.token = 'mock_token_' + Date.now();
    this.refreshToken = 'mock_refresh_token_' + Date.now();
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log('🔄 Switched to mock user:', email, userId);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.token && this.currentUser);
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.expiresAt) return false;

    const now = new Date();
    const refreshThreshold = new Date(this.expiresAt.getTime() - (this.config.tokenRefreshThreshold * 60 * 1000));

    return now >= refreshThreshold;
  }

  /**
   * Store authentication data via TokenStorage
   */
  private async storeAuthData(authResponse: AuthResponse): Promise<void> {
    this.token = authResponse.token;
    this.refreshToken = authResponse.refreshToken;
    this.currentUser = authResponse.user;
    this.expiresAt = authResponse.expiresAt;

    await TokenStorage.storeTokens(authResponse.token, authResponse.refreshToken);
    await TokenStorage.storeUser(authResponse.user);
  }

  /**
   * Store token data via TokenStorage (for refresh operations)
   */
  private async storeTokenData(tokenResponse: TokenResponse): Promise<void> {
    this.token = tokenResponse.token;
    this.refreshToken = tokenResponse.refreshToken;
    this.expiresAt = tokenResponse.expiresAt;

    await TokenStorage.storeTokens(tokenResponse.token, tokenResponse.refreshToken);
  }

  /**
   * Clear all stored authentication data via TokenStorage
   */
  async clearStoredAuth(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.expiresAt = null;

    try {
      await TokenStorage.clearAll();
    } catch (error) {
      console.log('Storage clear failed:', error);
    }
  }
}

// Create and export a singleton instance
export const authService = new AuthService({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  tokenRefreshThreshold: 5, // Refresh token 5 minutes before expiry
});
