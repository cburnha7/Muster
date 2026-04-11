/**
 * SSOService — Apple Sign In + Google Sign In
 *
 * Apple: uses expo-apple-authentication (native iOS).
 * Google: uses expo-auth-session with Expo proxy redirect.
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SSOUserData } from '../../types/auth';

// Conditionally import Apple Authentication (iOS only)
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch {
    console.warn('expo-apple-authentication not available');
  }
}

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

class SSOService {
  // ── Apple ──────────────────────────────────────────

  async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS === 'ios' && AppleAuthentication) {
      try {
        return await AppleAuthentication.isAvailableAsync();
      } catch {
        return false;
      }
    }
    return false;
  }

  async signInWithApple(): Promise<SSOUserData> {
    try {
      if (!AppleAuthentication) throw new Error('Apple Sign In not available');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const providerId = credential.user;
      const providerToken = credential.identityToken || '';
      const email = credential.email || '';
      const firstName = credential.fullName?.givenName || '';
      const lastName = credential.fullName?.familyName || '';

      if (!providerId) throw new Error('Missing Apple user ID');

      return {
        provider: 'apple',
        providerId,
        providerToken,
        email,
        firstName,
        lastName,
      };
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') throw new Error('User cancelled');
      throw error;
    }
  }

  // ── Google ─────────────────────────────────────────

  async isGoogleSignInAvailable(): Promise<boolean> {
    return !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
  }

  async signInWithGoogle(): Promise<SSOUserData> {
    try {
      // Use the web client ID for the OAuth flow — it works on all platforms
      // via the Expo auth proxy and doesn't have the PKCE / redirect issues
      const clientId = GOOGLE_WEB_CLIENT_ID;
      if (!clientId) throw new Error('Google Sign In is not configured');

      // Use Expo auth proxy — handles redirect correctly for dev/preview builds
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

      const discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );

      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      const result = await request.promptAsync(discovery, { useProxy: true });

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('User cancelled');
      }
      if (result.type !== 'success' || !result.authentication?.accessToken) {
        throw new Error('Google Sign In failed');
      }

      const accessToken = result.authentication.accessToken;

      // Fetch profile from Google
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google user info');
      const info = await res.json();

      if (!info.email) throw new Error('No email from Google');

      return {
        provider: 'google',
        providerId: info.id,
        providerToken: accessToken,
        email: info.email,
        firstName: info.given_name || '',
        lastName: info.family_name || '',
      };
    } catch (error: any) {
      if (error.message === 'User cancelled') throw error;
      throw error;
    }
  }
}

export default new SSOService();
