/**
 * AuthService (API Layer)
 * 
 * Handles all authentication-related API calls and token management.
 * Requirements: 1.13, 1.15, 1.16, 3.7, 4.7, 5.4, 6.4, 6.5, 6.6, 7.5, 7.6, 
 *               8.6, 8.7, 8.11, 8.12, 10.1, 11.3, 12.5, 16.1, 16.2, 16.3, 33.1, 33.2
 */

import TokenStorage from '../auth/TokenStorage';
import {
  User,
  RegisterData,
  SSORegisterData,
  LoginCredentials,
  SSOLoginData,
  AccountLinkData,
  AuthResponse,
  TokenResponse,
} from '../../types/auth';

import { API_BASE_URL } from './config';

const API_URL = API_BASE_URL;

// Network timeout in milliseconds (30 seconds)
const NETWORK_TIMEOUT = 30000;

// Token refresh threshold (5 minutes before expiration)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

export interface LoginResponse {
  user: User;
  token: string;
}

class AuthService {
  private tokenCache: string | null = null;
  private initPromise: Promise<void> | null = null;
  private tokenExpirationTime: number | null = null;

  constructor() {
    // Initialize token cache on construction
    this.initPromise = this.initializeTokenCache();
  }

  private async initializeTokenCache(): Promise<void> {
    try {
      const token = await TokenStorage.getAccessToken();
      this.tokenCache = token;
      console.log('🔐 AuthService initialized, token cache:', token ? `${token.substring(0, 20)}...` : 'null');
    } catch (error) {
      console.error('Failed to initialize token cache:', error);
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Make authenticated API request with timeout and error handling
   * Requirements 16.1, 16.2, 16.3: Network error handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Request failed');
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again');
      }
      if (error.message === 'Network request failed') {
        throw new Error('No internet connection. Please check your network and try again');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Service temporarily unavailable. Please try again later');
      }

      throw error;
    }
  }

  /**
   * Check if token needs refresh
   * Requirement 8.11: Automatic token refresh
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenExpirationTime) {
      return false;
    }
    const now = Date.now();
    return this.tokenExpirationTime - now < TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * Parse JWT token to get expiration time
   */
  private parseTokenExpiration(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  /**
   * Store tokens and user data
   * Requirements 1.16, 8.3, 8.4: Token storage
   */
  private async storeAuthData(authResponse: AuthResponse): Promise<void> {
    await TokenStorage.storeTokens(authResponse.accessToken, authResponse.refreshToken);
    await TokenStorage.storeUser(authResponse.user);
    
    // Update cache
    this.tokenCache = authResponse.accessToken;
    this.tokenExpirationTime = this.parseTokenExpiration(authResponse.accessToken);
  }

  /**
   * Register new user with email and password
   * Requirement 1.13: Manual user registration
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        password: data.password,
        agreedToTerms: data.agreedToTerms,
      }),
    });

    await this.storeAuthData(response);
    return response;
  }

  /**
   * Register new user with SSO
   * Requirements 3.7, 4.7: SSO registration
   */
  async registerWithSSO(data: SSORegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(`${API_URL}/auth/register/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: data.provider,
        providerToken: data.providerToken,
        providerUserId: data.providerUserId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
      }),
    });

    await this.storeAuthData(response);
    return response;
  }

  /**
   * Login with email/username and password
   * Requirements 6.4, 6.5, 6.6: Manual login
   */
  async login(emailOrUsername: string, password: string, rememberMe: boolean): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailOrUsername,
        password,
        rememberMe,
      }),
    });

    await this.storeAuthData(response);
    return response;
  }

  /**
   * Login with SSO
   * Requirements 7.5, 7.6: SSO login
   */
  async loginWithSSO(provider: 'apple' | 'google', token: string, userId: string): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(`${API_URL}/auth/login/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        providerToken: token,
        providerUserId: userId,
      }),
    });

    await this.storeAuthData(response);
    return response;
  }

  /**
   * Link SSO account to existing account
   * Requirement 5.4: Account linking
   */
  async linkAccount(
    email: string,
    password: string,
    provider: string,
    token: string,
    userId: string
  ): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(`${API_URL}/auth/link-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        provider,
        providerToken: token,
        providerUserId: userId,
      }),
    });

    await this.storeAuthData(response);
    return response;
  }

  /**
   * Refresh access token
   * Requirements 8.6, 8.7: Token refresh
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.makeRequest<TokenResponse>(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    // Store new tokens
    await TokenStorage.storeTokens(response.accessToken, response.refreshToken);
    this.tokenCache = response.accessToken;
    this.tokenExpirationTime = this.parseTokenExpiration(response.accessToken);

    return response;
  }

  /**
   * Logout user
   * Requirement 10.1: User logout
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      
      // Call logout endpoint if we have a refresh token
      if (refreshToken) {
        await this.makeRequest(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Continue with local cleanup even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Always clear local storage
      await TokenStorage.clearAll();
      this.tokenCache = null;
      this.tokenExpirationTime = null;
    }
  }

  /**
   * Request password reset
   * Requirement 11.3: Password reset request
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.makeRequest(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token
   * Requirement 12.5: Password reset completion
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.makeRequest(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });
  }

  /**
   * Get stored access token
   * Requirement 8.11: Token retrieval
   */
  async getStoredToken(): Promise<string | null> {
    try {
      console.log('📥 getStoredToken() called');
      
      // Check if token needs refresh
      if (this.shouldRefreshToken()) {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (refreshToken) {
          try {
            const tokens = await this.refreshToken(refreshToken);
            return tokens.accessToken;
          } catch (error) {
            console.error('Token refresh failed:', error);
            // Clear invalid tokens
            await this.logout();
            return null;
          }
        }
      }

      const token = await TokenStorage.getAccessToken();
      console.log('📥 Token from storage:', token ? `${token.substring(0, 20)}...` : 'null');
      
      // Update cache
      this.tokenCache = token;
      if (token) {
        this.tokenExpirationTime = this.parseTokenExpiration(token);
      }
      
      console.log('📥 Token cache updated');
      return token;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }

  /**
   * Synchronous method for interceptors (backward compatibility)
   */
  getToken(): string | null {
    if (__DEV__) {
      console.log('🔑 getToken() called, cache:', this.tokenCache ? `${this.tokenCache.substring(0, 20)}...` : 'null');
    }
    return this.tokenCache;
  }

  /**
   * Get stored user data
   * Requirement 8.12: User data retrieval
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const user = await TokenStorage.getUser();
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * Requirement 8.11: Authentication check
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }
}

export const authService = new AuthService();
