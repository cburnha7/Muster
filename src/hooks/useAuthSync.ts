/**
 * useAuthSync — single hook that runs auth side effects.
 *
 * Called once at the top of RootNavigator. Replaces the side-effect
 * logic that previously lived inside AuthContext/AuthProvider.
 *
 * Responsibilities:
 *   1. Boot: dispatch loadCachedUser on mount
 *   2. When user changes: sync logging, fetch subscription, fetch dependents, refresh profile
 *   3. Web: listen for 'auth:sessionExpired' window event
 */

import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUser,
  loadCachedUser,
  setUser,
  clearAuth,
} from '../store/slices/authSlice';
import { fetchSubscription } from '../store/slices/subscriptionSlice';
import { setDependents } from '../store/slices/contextSlice';
import { loggingService } from '../services/LoggingService';
import { userService } from '../services/api/UserService';
import TokenStorage from '../services/auth/TokenStorage';
import { API_BASE_URL } from '../services/api/config';

export function useAuthSync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const lastRefreshedUserId = useRef<string | null>(null);

  // ── Boot: load cached session ──
  useEffect(() => {
    dispatch(loadCachedUser() as any);
  }, [dispatch]);

  // ── Sync side effects when user changes ──
  useEffect(() => {
    loggingService.setUserId(user?.id ?? null);

    if (!user?.id) {
      lastRefreshedUserId.current = null;
      return;
    }

    // Hydrate subscription
    dispatch(fetchSubscription(user.id) as any);

    // Refresh profile once per user ID
    if (lastRefreshedUserId.current !== user.id) {
      lastRefreshedUserId.current = user.id;
      userService
        .getProfile()
        .then(async fresh => {
          dispatch(setUser(fresh as any));
          await TokenStorage.storeUser(fresh as any);
        })
        .catch(() => {});
    }

    // Hydrate dependents
    TokenStorage.getAccessToken()
      .then(tkn =>
        fetch(`${API_BASE_URL}/dependents`, {
          headers: { ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}) },
        })
      )
      .then(res => (res.ok ? res.json() : []))
      .then(data => dispatch(setDependents(data)))
      .catch(() => {});
  }, [user?.id, dispatch]);

  // ── Web: session expired listener ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleSessionExpired = () => {
      dispatch(clearAuth());
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{ text: 'OK' }]
      );
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, [dispatch]);
}
