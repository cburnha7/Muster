import * as SecureStore from 'expo-secure-store';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  TokenResponse, 
  User,
  SportType,
} from '../../types';

// Storage keys for secure storage
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const EXPIRES_AT_KEY = 'token_expires_at';

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
      // DEVELOPMENT MODE: Auto-login with mock user
      // Comment out this block to re-enable real authentication
      this.currentUser = {
        id: 'a6e3e977-0cea-4374-9008-047de0b0618c', // player@muster.app
        email: 'player@muster.app',
        firstName: 'Player',
        lastName: 'Account',
        profileImage: 'https://ui-avatars.com/api/?name=Player&background=3B82F6&color=fff&size=200',
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
      return true;
      // END DEVELOPMENT MODE
      
      /* Production code (currently disabled):
      const [token, refreshToken, userData, expiresAt] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(EXPIRES_AT_KEY),
      ]);

      if (token && refreshToken && userData && expiresAt) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.currentUser = JSON.parse(userData);
        this.expiresAt = new Date(expiresAt);

        // Check if token needs refresh
        if (this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }

        return true;
      }

      return false;
      */
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
      if (this.token) {
        await fetch(`${this.config.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
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
   * Get current authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.token && this.currentUser && this.expiresAt && this.expiresAt > new Date());
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
   * Store authentication data securely
   */
  private async storeAuthData(authResponse: AuthResponse): Promise<void> {
    this.token = authResponse.token;
    this.refreshToken = authResponse.refreshToken;
    this.currentUser = authResponse.user;
    this.expiresAt = authResponse.expiresAt;

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, authResponse.token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, authResponse.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(authResponse.user)),
      SecureStore.setItemAsync(EXPIRES_AT_KEY, authResponse.expiresAt.toISOString()),
    ]);
  }

  /**
   * Store token data securely (for refresh operations)
   */
  private async storeTokenData(tokenResponse: TokenResponse): Promise<void> {
    this.token = tokenResponse.token;
    this.refreshToken = tokenResponse.refreshToken;
    this.expiresAt = tokenResponse.expiresAt;

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, tokenResponse.token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResponse.refreshToken),
      SecureStore.setItemAsync(EXPIRES_AT_KEY, tokenResponse.expiresAt.toISOString()),
    ]);
  }

  /**
   * Clear all stored authentication data
   */
  private async clearStoredAuth(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.expiresAt = null;

    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
        SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
      ]);
    } catch (error) {
      // SecureStore may not be available on web, ignore errors
      console.log('SecureStore clear failed (expected on web):', error);
    }
  }
}

// Create and export a singleton instance
export const authService = new AuthService({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  tokenRefreshThreshold: 5, // Refresh token 5 minutes before expiry
});