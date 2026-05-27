import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { eventsApi } from './api/eventsApi';
import { cancelRequestsApi } from './api/cancelRequestsApi';
import { insuranceDocumentsApi } from './api/insuranceDocumentsApi';
import {
  authSlice,
  eventsSlice,
  facilitiesSlice,
  teamsSlice,
  bookingsSlice,
  matchesSlice,
  subscriptionSlice,
  contextSlice,
  scheduleSlice,
} from './slices';
import messagingReducer from './slices/messagingSlice';
import { contextRecoveryMiddleware } from './middleware/contextRecovery';
import { resetApiCacheListenerMiddleware } from './middleware/resetApiCacheOnLogin';

// Redux Persist configuration — only persist auth + subscription.
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'subscription'],
  blacklist: [
    'api',
    'eventsApi',
    'cancelRequestsApi',
    'insuranceDocumentsApi',
    'context',
  ],
  throttle: 1000,
};

// Root reducer combining all slices
const rootReducer = combineReducers({
  auth: authSlice,
  events: eventsSlice,
  facilities: facilitiesSlice,
  teams: teamsSlice,
  bookings: bookingsSlice,
  matches: matchesSlice,
  subscription: subscriptionSlice,
  context: contextSlice,
  schedule: scheduleSlice,
  messaging: messagingReducer,
  api: api.reducer,
  eventsApi: eventsApi.reducer,
  cancelRequestsApi: cancelRequestsApi.reducer,
  insuranceDocumentsApi: insuranceDocumentsApi.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with RTK Query and Redux Persist
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: __DEV__
        ? {
            ignoredActions: [
              'persist/PERSIST',
              'persist/REHYDRATE',
              eventsApi.reducerPath,
            ],
            ignoredPaths: [
              'events.events',
              'bookings.bookings',
              'facilities.facilities',
              'teams.teams',
              'leagues.leagues',
              'matches.matches',
            ],
            isSerializable: (value: any) => {
              if (value instanceof Date) return true;
              return true;
            },
          }
        : false,
      immutableCheck: __DEV__,
    }).concat(
      resetApiCacheListenerMiddleware.middleware,
      api.middleware,
      eventsApi.middleware,
      cancelRequestsApi.middleware,
      insuranceDocumentsApi.middleware,
      contextRecoveryMiddleware
    ),
  devTools: __DEV__,
});

// Setup RTK Query listeners for caching and synchronization
setupListeners(store.dispatch);

// Create persistor for Redux Persist
export const persistor = persistStore(store);

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
