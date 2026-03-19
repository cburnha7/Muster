import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Event, Booking } from '../../types';
import { DEFAULT_EVENT_FILTERS } from '../api/eventsApi';

// Helper to generate cache key for RTK Query
const generateCacheKey = (filters: any, pagination: any) => {
  return `getEvents(${JSON.stringify({ filters, pagination })})`;
};

// Base selector for events from RTK Query cache
const selectEventsResult = (state: RootState) => {
  const cacheKey = generateCacheKey(DEFAULT_EVENT_FILTERS, { page: 1, limit: 20 });
  const queryState = (state.eventsApi.queries as any)[cacheKey];
  return queryState?.data;
};

// Base selector for bookings from RTK Query cache
const selectBookingsResult = (state: RootState) => {
  const cacheKey = 'getUserBookings({"status":"upcoming","pagination":{"page":1,"limit":100}})';
  const queryState = (state.eventsApi.queries as any)[cacheKey];
  return queryState?.data;
};

// Memoized selector: Get set of booked event IDs
export const selectBookedEventIds = createSelector(
  [selectBookingsResult],
  (bookingsResult): Set<string> => {
    if (!bookingsResult?.data) return new Set();
    return new Set(bookingsResult.data.map((booking: Booking) => booking.eventId));
  }
);

// Memoized selector: Get events excluding joined events
export const selectAvailableEvents = createSelector(
  [selectEventsResult, selectBookedEventIds],
  (eventsResult, bookedEventIds): Event[] => {
    if (!eventsResult?.data) return [];
    return eventsResult.data.filter((event: Event) => !bookedEventIds.has(event.id));
  }
);

// Memoized selector: Get first 10 available events for Home Screen
export const selectHomeScreenEvents = createSelector(
  [selectAvailableEvents],
  (availableEvents): Event[] => {
    return availableEvents.slice(0, 10);
  }
);

// Memoized selector: Get all available events for Events Tab
export const selectEventsTabEvents = createSelector(
  [selectAvailableEvents],
  (availableEvents): Event[] => {
    return availableEvents;
  }
);
