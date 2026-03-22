import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Schedule event for client-side tracking during review
export interface ScheduleEvent {
  id: string;               // client-generated UUID for tracking
  homeRosterId: string;
  homeRosterName: string;
  awayRosterId: string;
  awayRosterName: string;
  scheduledAt: string;       // ISO date-time
  round: number;
  flag?: 'playoffs' | 'tournament';
  gameNumber?: number;       // bracket game number for cross-referencing
}

// Schedule state interface
export interface ScheduleState {
  leagueId: string | null;
  events: ScheduleEvent[];
  isReviewing: boolean;
  isGenerating: boolean;
  error: string | null;
}

// Initial state
const initialState: ScheduleState = {
  leagueId: null,
  events: [],
  isReviewing: false,
  isGenerating: false,
  error: null,
};

// Schedule slice
const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    // Set events and league ID (from auto-generate response)
    setEvents: (state, action: PayloadAction<{ leagueId: string; events: ScheduleEvent[] }>) => {
      state.leagueId = action.payload.leagueId;
      state.events = action.payload.events;
    },

    // Add a single event to the list
    addEvent: (state, action: PayloadAction<ScheduleEvent>) => {
      state.events.push(action.payload);
    },

    // Update an existing event by ID
    updateEvent: (state, action: PayloadAction<ScheduleEvent>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },

    // Remove an event by ID
    removeEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
    },

    // Reset to initial state
    clearSchedule: () => initialState,

    // Set reviewing state
    setReviewing: (state, action: PayloadAction<boolean>) => {
      state.isReviewing = action.payload;
    },

    // Set generating state
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

// Export actions
export const {
  setEvents,
  addEvent,
  updateEvent,
  removeEvent,
  clearSchedule,
  setReviewing,
  setGenerating,
  setError,
} = scheduleSlice.actions;

// Selectors
export const selectScheduleEvents = (state: { schedule: ScheduleState }) => state.schedule.events;
export const selectIsReviewing = (state: { schedule: ScheduleState }) => state.schedule.isReviewing;
export const selectIsGenerating = (state: { schedule: ScheduleState }) => state.schedule.isGenerating;
export const selectScheduleError = (state: { schedule: ScheduleState }) => state.schedule.error;
export const selectScheduleLeagueId = (state: { schedule: ScheduleState }) => state.schedule.leagueId;

// Export reducer
export default scheduleSlice.reducer;
