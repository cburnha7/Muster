// Redux slice exports

import authSliceReducer from './authSlice';
import eventsSliceReducer from './eventsSlice';
import facilitiesSliceReducer from './facilitiesSlice';
import teamsSliceReducer from './teamsSlice';
import bookingsSliceReducer from './bookingsSlice';
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
  matchesSliceReducer as matchesSlice,
  subscriptionSliceReducer as subscriptionSlice,
  contextSliceReducer as contextSlice,
  scheduleSliceReducer as scheduleSlice,
};

export * as authActions from './authSlice';
export * as eventsActions from './eventsSlice';
export * as facilitiesActions from './facilitiesSlice';
export * as teamsActions from './teamsSlice';
export * as bookingsActions from './bookingsSlice';
export * as matchesActions from './matchesSlice';
export * as subscriptionActions from './subscriptionSlice';
export * as contextActions from './contextSlice';
export * as scheduleActions from './scheduleSlice';
