/**
 * SSOService
 * 
 * Handles Apple Sign In and Google Sign In OAuth flows.
 * Requirements: 3.2, 3.3, 4.2, 4.3, 7.3, 7.4, 27.1, 27.2, 28.1, 28.2, 29.1
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { SSOUserData } from '../../types/auth';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

class SSOService {
  private googleRequest: any = null;
  private googlePromptAsync: any = null;

  /**
   * Initialize Google Sign In
   */
  private initializeGoogle() {
    if (!this.googleRequest) {
      const [request, , promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      });
      this.googleRequest = request;
      this.googlePromptAsync = promptAsync;
    }
  }

  /**
   * Check if Apple Sign In is available
   * Requirement 27.1: Platform-specific availability check
   */
  async isAppleSignInAvailable(): Promise<boolean> {
    try {
      // Apple Sign In is only available on iOS 13+ and macOS 10.15+
      if (Platform.OS === 'ios') {
        return await AppleAuthentication.isAvailableAsync();
      }
      return false;
    } catch (error) {
      console.error('Error checking Apple Sign In availability:', error);
      return false;
    }
  }

  /**
   * Check if Google Sign In is available
   * Requirement 28.1: Platform-specific availability check
   */
  async isGoogleSignInAvailable(): Promise<boolean> {
    try {
      // Google Sign In is available on all platforms
      return true;
    } catch (error) {
      console.error('Error checking Google Sign In availability:', error);
      return false;
    }
  }

  /**
   * Sign in with Apple
   * Requirements 3.2, 3.3, 7.3, 7.4, 27.2: Apple Sign In implementation
   */
  async signInWithApple(): Promise<SSOUserData> {
    try {
      // Check availability first
      const isAvailable = await this.isAppleSignInAvailable();
      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract user data
      const email = credential.email || '';
      const firstName = credential.fullName?.givenName || '';
      const lastName = credential.fullName?.familyName || '';
      const providerId = credential.user;
      const providerToken = credential.identityToken || '';

      // Validate required fields
      if (!email) {
        throw new Error('Email is required for Apple Sign In');
      }
      if (!providerId) {
        throw new Error('User ID is required for Apple Sign In');
      }
      if (!providerToken) {
        throw new Error('Identity token is required for Apple Sign In');
      }

      return {
        provider: 'apple',
        providerId,
        providerToken,
        email,
        firstName,
        lastName,
      };
    } catch (error: any) {
      // Handle specific Apple Sign In errors
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple Sign In was cancelled');
      }
      if (error.code === 'ERR_INVALID_RESPONSE') {
        throw new Error('Invalid response from Apple Sign In');
      }
      if (error.code === 'ERR_REQUEST_FAILED') {
        throw new Error('Apple Sign In request failed. Please check your network connection');
      }
      
      console.error('Apple Sign In error:', error);
      throw new Error(error.message || 'Sign in with Apple failed. Please try again');
    }
  }

  /**
   * Sign in with Google
   * Requirements 4.2, 4.3, 7.3, 7.4, 28.2: Google Sign In implementation
   */
  async signInWithGoogle(): Promise<SSOUserData> {
    try {
      // Check availability first
      const isAvailable = await this.isGoogleSignInAvailable();
      if (!isAvailable) {
        throw new Error('Google Sign In is not available');
      }

      // Initialize Google Sign In if not already done
      this.initializeGoogle();

      // Prompt for Google authentication
      const result = await this.googlePromptAsync();

      // Handle cancellation
      if (result.type === 'cancel') {
        throw new Error('Google Sign In was cancelled');
      }

      // Handle error
      if (result.type === 'error') {
        throw new Error('Google Sign In failed. Please try again');
      }

      // Handle success
      if (result.type === 'success') {
        const { authentication } = result;
        
        if (!authentication?.accessToken) {
          throw new Error('Failed to get access token from Google');
        }

        // Fetch user info from Google
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${authentication.accessToken}`,
            },
          }
        );

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info from Google');
        }

        const userInfo = await userInfoResponse.json();

        // Extract user data
        const email = userInfo.email || '';
        const firstName = userInfo.given_name || '';
        const lastName = userInfo.family_name || '';
        const providerId = userInfo.id;
        const providerToken = authentication.accessToken;

        // Validate required fields
        if (!email) {
          throw new Error('Email is required for Google Sign In');
        }
        if (!providerId) {
          throw new Error('User ID is required for Google Sign In');
        }

        return {
          provider: 'google',
          providerId,
          providerToken,
          email,
          firstName,
          lastName,
        };
      }

      throw new Error('Unexpected result from Google Sign In');
    } catch (error: any) {
      // Handle network errors
      if (error.message === 'Network request failed') {
        throw new Error('Network error. Please check your internet connection');
      }
      
      console.error('Google Sign In error:', error);
      throw new Error(error.message || 'Sign in with Google failed. Please try again');
    }
  }
}

// Export singleton instance
export default new SSOService();
