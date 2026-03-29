/**
 * Shared token refresh lock
 *
 * Ensures that only one token refresh is in flight at a time across
 * all interceptors (RTK Query baseQueryWithReauth and Axios response interceptor).
 *
 * Both interceptors call `acquireRefresh(refreshFn)`:
 *   - The first caller actually executes `refreshFn` and stores the promise.
 *   - Subsequent callers receive the same promise and wait for it to resolve.
 *   - Once the promise settles the lock is released.
 */

import TokenStorage from './TokenStorage';
import { API_BASE_URL } from '../api/config';

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

let refreshPromise: Promise<RefreshResult> | null = null;

/**
 * Acquire the refresh lock. If a refresh is already in progress, returns the
 * existing promise. Otherwise runs `refreshFn` and shares its promise.
 */
export function acquireRefresh(
  refreshFn: () => Promise<RefreshResult>,
): Promise<RefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshFn().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Check whether a refresh is currently in flight.
 */
export function isRefreshInProgress(): boolean {
  return refreshPromise !== null;
}

/**
 * Wait for any in-flight refresh to settle, then return.
 * Resolves even if the refresh rejects (callers handle their own errors).
 */
export async function waitForRefresh(): Promise<void> {
  if (refreshPromise) {
    try {
      await refreshPromise;
    } catch {
      // swallow — the caller that initiated the refresh handles the error
    }
  }
}

/**
 * Shared refresh function that calls the /auth/refresh endpoint directly.
 * Both interceptors can use this so there is one canonical refresh implementation.
 */
export async function performTokenRefresh(currentRefreshToken: string): Promise<RefreshResult> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Token refresh failed');
  }

  const data: RefreshResult = await response.json();

  // Persist new tokens centrally
  await TokenStorage.storeTokens(data.accessToken, data.refreshToken);

  return data;
}
