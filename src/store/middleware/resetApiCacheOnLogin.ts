/**
 * Listener middleware that resets all RTK Query caches on login.
 *
 * When a user transitions from unauthenticated → authenticated, the
 * in-memory RTK Query cache may still hold error-state queries from
 * the previous session. This listener clears all four API slices so
 * every screen re-fetches with the fresh token.
 *
 * Uses RTK's createListenerMiddleware instead of store.subscribe()
 * to avoid synchronous dispatch re-entrancy (resetApiState dispatches
 * actions that would re-trigger a subscriber, causing an infinite loop).
 * Listener effects run asynchronously after the reducer, so there is
 * no re-entrancy risk.
 */

import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import {
  loginUser,
  loginWithSSO,
  registerUser,
  registerWithSSO,
  linkAccount,
} from '../slices/authSlice';
import { api } from '../api';
import { eventsApi } from '../api/eventsApi';
import { cancelRequestsApi } from '../api/cancelRequestsApi';
import { insuranceDocumentsApi } from '../api/insuranceDocumentsApi';

export const resetApiCacheListenerMiddleware = createListenerMiddleware();

resetApiCacheListenerMiddleware.startListening({
  matcher: isAnyOf(
    loginUser.fulfilled,
    loginWithSSO.fulfilled,
    registerUser.fulfilled,
    registerWithSSO.fulfilled,
    linkAccount.fulfilled
  ),
  effect: async (_action, listenerApi) => {
    // Small yield so the reducer and React re-render cycle settle
    // before we nuke the caches (avoids batching issues).
    await listenerApi.delay(0);

    listenerApi.dispatch(api.util.resetApiState());
    listenerApi.dispatch(eventsApi.util.resetApiState());
    listenerApi.dispatch(cancelRequestsApi.util.resetApiState());
    listenerApi.dispatch(insuranceDocumentsApi.util.resetApiState());
  },
});
