/**
 * useAuthSync — single hook that runs auth side effects.
 *
 * Called once at the top of RootNavigator. Replaces the side-effect
 * logic that previously lived inside AuthContext/AuthProvider.
 *
 * Responsibilities:
 *   1. When user changes (after boot): sync logging, fetch subscription,
 *      fetch dependents, refresh profile
 *   2. Web: listen for 'auth:sessionExpired' window event
 *
 * Boot is handled entirely by redux-persist rehydration + the REHYDRATE
 * matcher in authSlice. No loadCachedUser thunk needed.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as Sentry from '@sentry/react-native';
import {
  selectUser,
  selectBootLoading,
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
  const bootLoading = useSelector(selectBootLoading);
  const lastRefreshedUserId = useRef<string | null>(null);

  // ── Sync side effects when user changes (only after boot completes) ──
  useEffect(() => {
    loggingService.setUserId(user?.id ?? null);

    // Sentry user context
    if (user?.id) {
      Sentry.setUser({ id: user.id, email: user.email ?? undefined });
    } else {
      Sentry.setUser(null);
    }

    // Don't fire API calls while boot is still in progress
    if (bootLoading) return;

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
  }, [user?.id, bootLoading, dispatch]);

  // ── Web: session expired listener ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleSessionExpired = () => {
      dispatch(clearAuth());
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, [dispatch]);
}
