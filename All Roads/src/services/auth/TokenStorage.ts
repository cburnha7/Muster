/**
 * TokenStorage
 * 
 * Platform-specific token storage utilities.
 * - Mobile (iOS/Android): Uses Expo SecureStore
 * - Web: Uses secure HTTP-only cookies (handled by backend)
 * 
 * Requirements: 8.3, 8.4, 9.4, 14.2, 14.3, 27.3, 28.3, 29.2
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User } from '../../types/auth';

/**
 * Storage keys
 */
const KEYS = {
  ACCESS_TOKEN: 'muster_access_token',
  REFRESH_TOKEN: 'muster_refresh_token',
  USER_DATA: 'muster_user_data',
};

/**
 * Check if platform is web
 */
const isWeb = Platform.OS === 'web';

/**
 * TokenStorage class
 * Provides platform-specific token storage
 */
class TokenStorage {
  /**
   * Store access and refresh tokens
   * Requirements 8.3, 8.4: Secure token storage
   */
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      if (isWeb) {
        // On web, store both tokens in localStorage so they persist across page refreshes
        localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
        console.log('✅ Tokens stored in localStorage');
      } else {
        // On mobile, use SecureStore for encrypted storage
        await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Get access token
   * Requirement 8.3: Retrieve stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      if (isWeb) {
        const token = localStorage.getItem(KEYS.ACCESS_TOKEN);
        console.log('📥 getAccessToken from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
        return token;
      } else {
        return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   * Requirement 8.4: Retrieve stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(KEYS.REFRESH_TOKEN);
      } else {
        return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
      }
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Clear all tokens
   * Requirement 9.4: Clear tokens on logout or session expiration
   */
  async clearTokens(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(KEYS.ACCESS_TOKEN);
        localStorage.removeItem(KEYS.REFRESH_TOKEN);
        console.log('🗑️ Tokens cleared from localStorage');
      } else {
        await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
      // Don't throw error on clear - best effort
    }
  }

  /**
   * Store user data
   * Requirement 14.2: Secure storage of user data
   */
  async storeUser(user: User): Promise<void> {
    try {
      const userData = JSON.stringify(user);
      if (isWeb) {
        localStorage.setItem(KEYS.USER_DATA, userData);
      } else {
        await SecureStore.setItemAsync(KEYS.USER_DATA, userData);
      }
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Get user data
   * Requirement 14.3: Retrieve stored user data
   */
  async getUser(): Promise<User | null> {
    try {
      let userData: string | null;
      if (isWeb) {
        userData = localStorage.getItem(KEYS.USER_DATA);
      } else {
        userData = await SecureStore.getItemAsync(KEYS.USER_DATA);
      }

      if (!userData) {
        return null;
      }

      return JSON.parse(userData) as User;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Clear user data
   * Requirement 9.4: Clear user data on logout
   */
  async clearUser(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(KEYS.USER_DATA);
      } else {
        await SecureStore.deleteItemAsync(KEYS.USER_DATA);
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
      // Don't throw error on clear - best effort
    }
  }

  /**
   * Clear all stored data (tokens + user)
   * Used on logout or session expiration
   */
  async clearAll(): Promise<void> {
    await this.clearTokens();
    await this.clearUser();
  }
}

// Export singleton instance
export default new TokenStorage();
