import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { eventsApi } from './api/eventsApi';
import { authSlice, eventsSlice, facilitiesSlice, teamsSlice, bookingsSlice, leaguesSlice, matchesSlice, subscriptionSlice } from './slices';

// Transform to handle cache expiration and selective persistence
const cacheTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState: any, key) => {
    // Add timestamp to track when data was cached
    return {
      ...inboundState,
      _cachedAt: Date.now(),
    };
  },
  // Transform state being rehydrated
  (outboundState: any, key) => {
    const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cachedAt = outboundState._cachedAt || 0;
    const age = Date.now() - cachedAt;

    // If cache is too old, return initial state
    if (age > MAX_CACHE_AGE) {
      const { _cachedAt, ...rest } = outboundState;
      // Return empty state for expired cache
      return {};
    }

    // Remove metadata before returning to store
    const { _cachedAt, ...cleanState } = outboundState;
    return cleanState;
  },
  // Apply to specific slices
  { whitelist: ['events', 'facilities', 'teams', 'bookings'] }
);

// Redux Persist configuration with selective caching
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'events', 'facilities', 'teams', 'bookings', 'leagues', 'matches', 'subscription'], // Only persist these slices
  blacklist: ['api', 'eventsApi'], // Don't persist RTK Query cache
  transforms: [cacheTransform],
  // Throttle writes to storage
  throttle: 1000,
};

// Root reducer combining all slices
const rootReducer = combineReducers({
  auth: authSlice,
  events: eventsSlice,
  facilities: facilitiesSlice,
  teams: teamsSlice,
  bookings: bookingsSlice,
  leagues: leaguesSlice,
  matches: matchesSlice,
  subscription: subscriptionSlice,
  api: api.reducer,
  eventsApi: eventsApi.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with RTK Query and Redux Persist
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', eventsApi.reducerPath],
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
    }).concat(api.middleware, eventsApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners for caching and synchronization
setupListeners(store.dispatch);

// Create persistor for Redux Persist
export const persistor = persistStore(store);

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;