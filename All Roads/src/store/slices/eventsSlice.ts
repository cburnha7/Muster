import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Event, EventFilters, PaginatedResponse } from '../../types';

// Events state interface
export interface EventsState {
  events: Event[];
  selectedEvent: Event | null;
  filters: EventFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial state
const initialState: EventsState = {
  events: [],
  selectedEvent: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  isLoadingMore: false,
  error: null,
  lastUpdated: null,
};

// Events slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set loading more state (for pagination)
    setLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isLoadingMore = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set events (replace all)
    setEvents: (state, action: PayloadAction<PaginatedResponse<Event>>) => {
      const { data, pagination } = action.payload;
      state.events = data;
      state.pagination = pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append events (for pagination)
    appendEvents: (state, action: PayloadAction<PaginatedResponse<Event>>) => {
      const { data, pagination } = action.payload;
      state.events = [...state.events, ...data];
      state.pagination = pagination;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Add single event
    addEvent: (state, action: PayloadAction<Event>) => {
      state.events.unshift(action.payload);
      state.pagination.total += 1;
    },

    // Update event
    updateEvent: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      
      // Update selected event if it's the same
      if (state.selectedEvent?.id === action.payload.id) {
        state.selectedEvent = action.payload;
      }
    },

    // Remove event
    removeEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      
      // Clear selected event if it's the removed one
      if (state.selectedEvent?.id === action.payload) {
        state.selectedEvent = null;
      }
    },

    // Set selected event
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },

    // Set filters
    setFilters: (state, action: PayloadAction<EventFilters>) => {
      state.filters = action.payload;
      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Update filters (merge with existing)
    updateFilters: (state, action: PayloadAction<Partial<EventFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },

    // Set pagination
    setPagination: (state, action: PayloadAction<{ page: number; limit: number }>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Reset events state
    resetEvents: (state) => {
      state.events = [];
      state.selectedEvent = null;
      state.pagination = initialState.pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = null;
    },

    // Update event participant count (for booking operations)
    updateEventParticipants: (state, action: PayloadAction<{ eventId: string; count: number }>) => {
      const { eventId, count } = action.payload;
      const event = state.events.find(e => e.id === eventId);
      if (event) {
        event.currentParticipants = count;
      }
      
      if (state.selectedEvent?.id === eventId) {
        state.selectedEvent.currentParticipants = count;
      }
    },
  },
});

// Export actions
export const {
  setLoading,
  setLoadingMore,
  setError,
  clearError,
  setEvents,
  appendEvents,
  addEvent,
  updateEvent,
  removeEvent,
  setSelectedEvent,
  setFilters,
  updateFilters,
  clearFilters,
  setPagination,
  resetEvents,
  updateEventParticipants,
} = eventsSlice.actions;

// Export reducer
export default eventsSlice.reducer;

// Selectors
export const selectEvents = (state: { events: EventsState }) => state.events.events;
export const selectSelectedEvent = (state: { events: EventsState }) => state.events.selectedEvent;
export const selectEventFilters = (state: { events: EventsState }) => state.events.filters;
export const selectEventsPagination = (state: { events: EventsState }) => state.events.pagination;
export const selectEventsLoading = (state: { events: EventsState }) => state.events.isLoading;
export const selectEventsLoadingMore = (state: { events: EventsState }) => state.events.isLoadingMore;
export const selectEventsError = (state: { events: EventsState }) => state.events.error;
export const selectEventsLastUpdated = (state: { events: EventsState }) => state.events.lastUpdated;