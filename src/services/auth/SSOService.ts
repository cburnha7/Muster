/**
 * SSOService — Apple Sign In + Google Sign In
 *
 * Apple: uses expo-apple-authentication (native iOS).
 * Google: uses expo-auth-session with Google discovery document.
 */

import { Platform } from 'react-native';
import {
  makeRedirectUri,
  AuthRequest,
  ResponseType,
  fetchDiscoveryAsync,
} from 'expo-auth-session';
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

const GOOGLE_WEB_CLIENT_ID =
  '297265818886-cn0vu6f658teborvhfdpsjqs0t1q48dl.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc.apps.googleusercontent.com';

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
    return true;
  }

  async signInWithGoogle(): Promise<SSOUserData> {
    try {
      // Always use the Web client ID with expo-auth-session.
      // iOS client IDs are for the native Google Sign-In SDK only.
      // The Web client supports authorization code flow with PKCE via browser.
      const clientId = GOOGLE_WEB_CLIENT_ID;

      // Redirect URI:
      // - Web: current page URL (handled by makeRedirectUri)
      // - Native: Expo auth proxy (registered in Google Cloud Console)
      const redirectUri =
        Platform.OS === 'web'
          ? makeRedirectUri()
          : 'https://auth.expo.io/@cburnha7/muster';

      const discovery = await fetchDiscoveryAsync(
        'https://accounts.google.com'
      );

      // Authorization code flow with PKCE (secure, works on all platforms)
      const request = new AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: ResponseType.Code,
        usePKCE: true,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('User cancelled');
      }
      if (result.type !== 'success' || !result.params?.code) {
        throw new Error('Google Sign In failed');
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(discovery.tokenEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          code: result.params.code,
          code_verifier: request.codeVerifier || '',
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text().catch(() => '');
        throw new Error(
          `Token exchange failed: ${tokenResponse.status} ${errBody}`
        );
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const idToken = tokens.id_token || '';

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Fetch profile from Google userinfo endpoint
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google user info');
      const info = await res.json();

      if (!info.id) throw new Error('No user ID from Google');

      return {
        provider: 'google',
        providerId: info.id,
        providerToken: idToken || accessToken,
        email: info.email || '',
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
