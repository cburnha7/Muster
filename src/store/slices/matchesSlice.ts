import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Match, MatchStatus, PaginatedResponse } from '../../types';

// Matches state interface
export interface MatchesState {
  matches: Match[];
  selectedMatch: Match | null;
  filters: {
    leagueId?: string;
    seasonId?: string;
    teamId?: string;
    status?: MatchStatus;
  };
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
const initialState: MatchesState = {
  matches: [],
  selectedMatch: null,
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

// Matches slice
const matchesSlice = createSlice({
  name: 'matches',
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

    // Set matches (replace all)
    setMatches: (state, action: PayloadAction<PaginatedResponse<Match>>) => {
      const { data, pagination } = action.payload;
      state.matches = data;
      state.pagination = pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append matches (for pagination)
    appendMatches: (state, action: PayloadAction<PaginatedResponse<Match>>) => {
      const { data, pagination } = action.payload;
      state.matches = [...state.matches, ...data];
      state.pagination = pagination;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Add single match
    addMatch: (state, action: PayloadAction<Match>) => {
      state.matches.unshift(action.payload);
      state.pagination.total += 1;
    },

    // Update match
    updateMatch: (state, action: PayloadAction<Match>) => {
      const index = state.matches.findIndex(match => match.id === action.payload.id);
      if (index !== -1) {
        state.matches[index] = action.payload;
      }
      if (state.selectedMatch?.id === action.payload.id) {
        state.selectedMatch = action.payload;
      }
    },

    // Delete match
    deleteMatch: (state, action: PayloadAction<string>) => {
      state.matches = state.matches.filter(match => match.id !== action.payload);
      state.pagination.total -= 1;
      if (state.selectedMatch?.id === action.payload) {
        state.selectedMatch = null;
      }
    },

    // Record result (update match with result)
    recordResult: (state, action: PayloadAction<Match>) => {
      const index = state.matches.findIndex(match => match.id === action.payload.id);
      if (index !== -1) {
        state.matches[index] = action.payload;
      }
      if (state.selectedMatch?.id === action.payload.id) {
        state.selectedMatch = action.payload;
      }
    },

    // Set selected match
    setSelectedMatch: (state, action: PayloadAction<Match | null>) => {
      state.selectedMatch = action.payload;
    },

    // Set filters
    setFilters: (state, action: PayloadAction<MatchesState['filters']>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },

    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },

    // Reset state
    resetState: () => initialState,
  },
});

// Export actions
export const {
  setLoading,
  setLoadingMore,
  setError,
  clearError,
  setMatches,
  appendMatches,
  addMatch,
  updateMatch,
  deleteMatch,
  recordResult,
  setSelectedMatch,
  setFilters,
  clearFilters,
  resetState,
} = matchesSlice.actions;

// Selectors
export const selectMatches = (state: { matches: MatchesState }) => state.matches.matches;
export const selectSelectedMatch = (state: { matches: MatchesState }) => state.matches.selectedMatch;
export const selectFilters = (state: { matches: MatchesState }) => state.matches.filters;
export const selectPagination = (state: { matches: MatchesState }) => state.matches.pagination;
export const selectIsLoading = (state: { matches: MatchesState }) => state.matches.isLoading;
export const selectIsLoadingMore = (state: { matches: MatchesState }) => state.matches.isLoadingMore;
export const selectError = (state: { matches: MatchesState }) => state.matches.error;

// Filter selectors
export const selectUpcomingMatches = (state: { matches: MatchesState }) =>
  state.matches.matches.filter(match => match.status === 'scheduled');

export const selectCompletedMatches = (state: { matches: MatchesState }) =>
  state.matches.matches.filter(match => match.status === 'completed');

export const selectMatchesByLeague = (leagueId: string) => (state: { matches: MatchesState }) =>
  state.matches.matches.filter(match => match.leagueId === leagueId);

export const selectMatchesByTeam = (teamId: string) => (state: { matches: MatchesState }) =>
  state.matches.matches.filter(
    match => match.homeTeamId === teamId || match.awayTeamId === teamId
  );

// Export reducer
export default matchesSlice.reducer;
