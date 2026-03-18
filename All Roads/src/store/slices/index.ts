// Redux slice exports
// Auth, events, facilities, teams, bookings, leagues, and matches slices

import authSliceReducer from './authSlice';
import eventsSliceReducer from './eventsSlice';
import facilitiesSliceReducer from './facilitiesSlice';
import teamsSliceReducer from './teamsSlice';
import bookingsSliceReducer from './bookingsSlice';
import leaguesSliceReducer from './leaguesSlice';
import matchesSliceReducer from './matchesSlice';
import subscriptionSliceReducer from './subscriptionSlice';
import contextSliceReducer from './contextSlice';
import scheduleSliceReducer from './scheduleSlice';

export { 
  authSliceReducer as authSlice,
  eventsSliceReducer as eventsSlice,
  facilitiesSliceReducer as facilitiesSlice,
  teamsSliceReducer as teamsSlice,
  bookingsSliceReducer as bookingsSlice,
  leaguesSliceReducer as leaguesSlice,
  matchesSliceReducer as matchesSlice,
  subscriptionSliceReducer as subscriptionSlice,
  contextSliceReducer as contextSlice,
  scheduleSliceReducer as scheduleSlice,
};

// Re-export individual actions with their original names
// Users can import like: import { loginSuccess } from 'store/slices/authSlice'
export * as authActions from './authSlice';
export * as eventsActions from './eventsSlice';
export * as facilitiesActions from './facilitiesSlice';
export * as teamsActions from './teamsSlice';
export * as bookingsActions from './bookingsSlice';
export * as leaguesActions from './leaguesSlice';
export * as matchesActions from './matchesSlice';
export * as subscriptionActions from './subscriptionSlice';
export * as contextActions from './contextSlice';
export * as scheduleActions from './scheduleSlice';