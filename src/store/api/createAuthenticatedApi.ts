/**
 * Shared authenticated base query factory for all RTK Query API slices.
 *
 * This is the SINGLE source of truth for:
 * - Attaching JWT Bearer tokens to requests
 * - Handling 401 responses with token refresh
 * - Preventing stale 401 handlers from clearing fresh login tokens
 *
 * Every RTK Query API slice must use createAuthenticatedBaseQuery()
 * instead of defining its own baseQueryWithReauth.
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { RootState } from '../store';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';
import {
  acquireRefresh,
  performTokenRefresh,
} from '../../services/auth/tokenRefreshLock';
import { clearAuth, setTokens } from '../slices/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // Dependent context
    const activeUserId = state.context?.activeUserId;
    const authUserId = state.auth.user?.id;
    if (activeUserId && activeUserId !== authUserId) {
      headers.set('X-Active-User-Id', activeUserId);
    }

    headers.set('content-type', 'application/json');
    return headers;
  },
});

/**
 * Creates an authenticated base query with token refresh logic.
 * Use this in every createApi() call:
 *
 *   export const myApi = createApi({
 *     baseQuery: createAuthenticatedBaseQuery(),
 *     ...
 *   });
 */
export function createAuthenticatedBaseQuery(): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> {
  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
      // Capture the token that was used for the failed request
      const failedToken = (api.getState() as RootState).auth.accessToken;

      try {
        // Check if the token has already been refreshed (e.g. by login or another refresh)
        const currentToken = (api.getState() as RootState).auth.accessToken;
        if (currentToken && currentToken !== failedToken) {
          // Token was already refreshed — just retry with the new token
          return await rawBaseQuery(args, api, extraOptions);
        }

        // Get refresh token
        let refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (!refreshToken) {
          refreshToken = await TokenStorage.getRefreshToken();
        }

        if (!refreshToken) {
          // Only clear if the token hasn't changed since we started
          const latestToken = (api.getState() as RootState).auth.accessToken;
          if (!latestToken || latestToken === failedToken) {
            await TokenStorage.clearAll();
            api.dispatch(clearAuth());
          }
          return result;
        }

        // Use the shared lock to prevent duplicate refresh requests
        const tokenData = await acquireRefresh(() =>
          performTokenRefresh(refreshToken!)
        );

        // Update Redux state with new tokens
        api.dispatch(
          setTokens({
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
          })
        );

        // Retry the original query with new token
        result = await rawBaseQuery(args, api, extraOptions);
      } catch (error: any) {
        console.error('🔒 Token refresh failed:', error?.message || error);
        // Only clear session if no fresh login has happened
        const latestToken = (api.getState() as RootState).auth.accessToken;
        if (!latestToken || latestToken === failedToken) {
          await TokenStorage.clearAll();
          api.dispatch(clearAuth());
        }
      }
    }

    return result;
  };
}
