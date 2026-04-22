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

// Redux Persist configuration — only persist auth + subscription.
// Server data (events, facilities, teams, bookings, leagues, matches)
// is owned by RTK Query and the service-layer cache. Persisting it
// here caused redundant AsyncStorage writes on every list screen.
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
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          eventsApi.reducerPath,
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'events.events',
          'bookings.bookings',
          'facilities.facilities',
          'teams.teams',
          'leagues.leagues',
          'matches.matches',
        ],
        // Ignore Date instances
        isSerializable: (value: any) => {
          // Allow Date objects to pass through
          if (value instanceof Date) {
            return true;
          }
          return true;
        },
      },
    }).concat(
      api.middleware,
      eventsApi.middleware,
      cancelRequestsApi.middleware,
      insuranceDocumentsApi.middleware,
      contextRecoveryMiddleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners for caching and synchronization
setupListeners(store.dispatch);

// Create persistor for Redux Persist
export const persistor = persistStore(store);

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
