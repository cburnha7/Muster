/**
 * TokenStorage
 * 
 * Platform-specific token storage utilities.
 * - Mobile (iOS/Android): Uses Expo SecureStore
 * - Web: Uses localStorage with a sessionStorage sentinel
 *         to force re-login when the browser/tab is fully closed.
 *         Page refreshes and in-app navigation keep the session alive.
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
 * Sentinel key — lives in sessionStorage.
 * Present = same browser session (page refresh is fine).
 * Missing = new session (browser was closed) → wipe localStorage auth data.
 */
const SESSION_SENTINEL = 'muster_session_active';

const isWeb = Platform.OS === 'web';

/**
 * On web, check the sentinel on first load.
 * If it's missing the user closed the browser, so clear persisted auth.
 */
if (isWeb) {
  if (!sessionStorage.getItem(SESSION_SENTINEL)) {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER_DATA);
    console.log('🔒 New browser session detected — cleared stored auth');
  }
  // Set the sentinel so refreshes within this session are fine
  sessionStorage.setItem(SESSION_SENTINEL, '1');
}

class TokenStorage {
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(KEYS.ACCESS_TOKEN);
      } else {
        return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

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

  async clearTokens(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(KEYS.ACCESS_TOKEN);
        localStorage.removeItem(KEYS.REFRESH_TOKEN);
      } else {
        await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

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

  async getUser(): Promise<User | null> {
    try {
      let userData: string | null;
      if (isWeb) {
        userData = localStorage.getItem(KEYS.USER_DATA);
      } else {
        userData = await SecureStore.getItemAsync(KEYS.USER_DATA);
      }
      if (!userData) return null;
      return JSON.parse(userData) as User;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  async clearUser(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(KEYS.USER_DATA);
      } else {
        await SecureStore.deleteItemAsync(KEYS.USER_DATA);
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  async clearAll(): Promise<void> {
    await this.clearTokens();
    await this.clearUser();
  }
}

export default new TokenStorage();
