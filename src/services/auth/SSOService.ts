/**
 * SSOService — Apple Sign In + Google Sign In
 *
 * Apple: uses expo-apple-authentication (native iOS).
 * Google: uses expo-auth-session with Google discovery document.
 */

import { Platform } from 'react-native';
import { makeRedirectUri, AuthRequest, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SSOUserData } from '../../types/auth';

// Lazy getter for Apple Authentication (iOS only).
// Avoids native module work at module-eval time.
function getAppleAuth(): any {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('expo-apple-authentication');
  } catch {
    return null;
  }
}

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  '297265818886-cn0vu6f658teborvhfdpsjqs0t1q48dl.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc.apps.googleusercontent.com';

// Hardcoded Google OIDC discovery — avoids a network round-trip on every tap.
// These endpoints are effectively static.
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

class SSOService {
  // ── Apple ──────────────────────────────────────────

  async isAppleSignInAvailable(): Promise<boolean> {
    const apple = getAppleAuth();
    if (Platform.OS === 'ios' && apple) {
      try {
        const result = await Promise.race([
          apple.isAvailableAsync(),
          new Promise<boolean>(resolve =>
            setTimeout(() => resolve(false), 2000)
          ),
        ]);
        return result;
      } catch {
        return false;
      }
    }
    return false;
  }

  async signInWithApple(): Promise<SSOUserData> {
    try {
      const apple = getAppleAuth();
      if (!apple) throw new Error('Apple Sign In not available');

      const credential = await apple.signInAsync({
        requestedScopes: [
          apple.AppleAuthenticationScope.FULL_NAME,
          apple.AppleAuthenticationScope.EMAIL,
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
      // On iOS use the iOS client ID, on other platforms use web client ID
      const clientId =
        Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;

      // Generate the redirect URI for the current platform
      let redirectUri: string;
      if (Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID) {
        const reversed = GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.');
        redirectUri = `${reversed}:/oauthredirect`;
      } else {
        redirectUri = makeRedirectUri();
      }

      const discovery = GOOGLE_DISCOVERY;

      // Request both access token and id token
      const request = new AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: ResponseType.Token,
        usePKCE: false,
        extraParams: {
          // Request id_token alongside access_token
          nonce: Math.random().toString(36).substring(2),
        },
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('User cancelled');
      }
      if (result.type !== 'success' || !result.authentication?.accessToken) {
        throw new Error('Google Sign In failed');
      }

      const accessToken = result.authentication.accessToken;
      const idToken = result.authentication.idToken || '';

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
