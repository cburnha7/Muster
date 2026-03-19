/**
 * Context Recovery Middleware
 *
 * Detects 403 responses from RTK Query when the active context is a dependent.
 * On 403: resets activeUserId to the guardian's own ID (null) and shows a notification.
 *
 * This handles edge cases like:
 * - A transferred dependent still set as active context
 * - A dependent removed by another process
 * - Stale context references
 *
 * Requirements: 5.3, 8.4
 */

import { Middleware, isRejectedWithValue } from '@reduxjs/toolkit';
import { Alert, Platform } from 'react-native';
import { setActiveUser } from '../slices/contextSlice';

/**
 * Checks whether an RTK Query rejected action carries a 403 status.
 */
function is403Error(action: any): boolean {
  if (!isRejectedWithValue(action)) return false;

  const payload = action.payload;

  // RTK Query fetchBaseQuery puts status on the payload directly
  if (payload?.status === 403) return true;

  // Also check nested originalStatus (some RTK Query versions)
  if (payload?.originalStatus === 403) return true;

  return false;
}

export const contextRecoveryMiddleware: Middleware = (storeApi) => (next) => (action) => {
  // Let the action pass through first
  const result = next(action);

  // Only react to rejected RTK Query actions with 403
  if (!is403Error(action)) return result;

  const state = storeApi.getState();
  const activeUserId = state.context?.activeUserId;

  // Only reset if we're currently in a dependent context (activeUserId is non-null)
  if (activeUserId == null) return result;

  console.warn(
    '⚠️ [contextRecovery] 403 received while in dependent context. Resetting to guardian context.'
  );

  // Reset to guardian's own context
  storeApi.dispatch(setActiveUser(null));

  // Show a brief notification to the user
  if (Platform.OS === 'web') {
    console.warn('Switched back to your account — the dependent context is no longer valid.');
  } else {
    Alert.alert(
      'Context Reset',
      'Switched back to your account — the dependent context is no longer valid.'
    );
  }

  return result;
};
