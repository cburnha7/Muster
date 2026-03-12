import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  League,
  LeagueFilters,
  TeamStanding,
  PlayerRanking,
  LeagueDocument,
  PaginatedResponse
} from '../../types';

// Leagues state interface
export interface LeaguesState {
  leagues: League[];
  selectedLeague: League | null;
  standings: TeamStanding[];
  playerRankings: PlayerRanking[];
  documents: LeagueDocument[];
  filters: LeagueFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  isLoadingStandings: boolean;
  isLoadingRankings: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial state
const initialState: LeaguesState = {
  leagues: [],
  selectedLeague: null,
  standings: [],
  playerRankings: [],
  documents: [],
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  isLoadingMore: false,
  isLoadingStandings: false,
  isLoadingRankings: false,
  error: null,
  lastUpdated: null,
};

// Leagues slice
const leaguesSlice = createSlice({
  name: 'leagues',
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

    // Set loading standings state
    setLoadingStandings: (state, action: PayloadAction<boolean>) => {
      state.isLoadingStandings = action.payload;
    },

    // Set loading rankings state
    setLoadingRankings: (state, action: PayloadAction<boolean>) => {
      state.isLoadingRankings = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.isLoadingStandings = false;
      state.isLoadingRankings = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set leagues (replace all)
    setLeagues: (state, action: PayloadAction<PaginatedResponse<League>>) => {
      const { data, pagination } = action.payload;
      state.leagues = data;
      state.pagination = pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append leagues (for pagination)
    appendLeagues: (state, action: PayloadAction<PaginatedResponse<League>>) => {
      const { data, pagination } = action.payload;
      state.leagues = [...state.leagues, ...data];
      state.pagination = pagination;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Add single league
    addLeague: (state, action: PayloadAction<League>) => {
      state.leagues.unshift(action.payload);
      state.pagination.total += 1;
    },

    // Update league
    updateLeague: (state, action: PayloadAction<League>) => {
      const index = state.leagues.findIndex(league => league.id === action.payload.id);
      if (index !== -1) {
        state.leagues[index] = action.payload;
      }
      if (state.selectedLeague?.id === action.payload.id) {
        state.selectedLeague = action.payload;
      }
    },

    // Delete league
    deleteLeague: (state, action: PayloadAction<string>) => {
      state.leagues = state.leagues.filter(league => league.id !== action.payload);
      state.pagination.total -= 1;
      if (state.selectedLeague?.id === action.payload) {
        state.selectedLeague = null;
      }
    },

    // Set selected league
    setSelectedLeague: (state, action: PayloadAction<League | null>) => {
      state.selectedLeague = action.payload;
    },

    // Set standings
    setStandings: (state, action: PayloadAction<TeamStanding[]>) => {
      state.standings = action.payload;
      state.isLoadingStandings = false;
    },

    // Set player rankings
    setPlayerRankings: (state, action: PayloadAction<PlayerRanking[]>) => {
      state.playerRankings = action.payload;
      state.isLoadingRankings = false;
    },

    // Set documents
    setDocuments: (state, action: PayloadAction<LeagueDocument[]>) => {
      state.documents = action.payload;
    },

    // Add document
    addDocument: (state, action: PayloadAction<LeagueDocument>) => {
      state.documents.unshift(action.payload);
    },

    // Delete document
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter(doc => doc.id !== action.payload);
    },

    // Set filters
    setFilters: (state, action: PayloadAction<LeagueFilters>) => {
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
  setLoadingStandings,
  setLoadingRankings,
  setError,
  clearError,
  setLeagues,
  appendLeagues,
  addLeague,
  updateLeague,
  deleteLeague,
  setSelectedLeague,
  setStandings,
  setPlayerRankings,
  setDocuments,
  addDocument,
  deleteDocument,
  setFilters,
  clearFilters,
  resetState,
} = leaguesSlice.actions;

// Selectors
export const selectLeagues = (state: { leagues: LeaguesState }) => state.leagues.leagues;
export const selectSelectedLeague = (state: { leagues: LeaguesState }) => state.leagues.selectedLeague;
export const selectStandings = (state: { leagues: LeaguesState }) => state.leagues.standings;
export const selectPlayerRankings = (state: { leagues: LeaguesState }) => state.leagues.playerRankings;
export const selectDocuments = (state: { leagues: LeaguesState }) => state.leagues.documents;
export const selectFilters = (state: { leagues: LeaguesState }) => state.leagues.filters;
export const selectPagination = (state: { leagues: LeaguesState }) => state.leagues.pagination;
export const selectIsLoading = (state: { leagues: LeaguesState }) => state.leagues.isLoading;
export const selectIsLoadingMore = (state: { leagues: LeaguesState }) => state.leagues.isLoadingMore;
export const selectIsLoadingStandings = (state: { leagues: LeaguesState }) => state.leagues.isLoadingStandings;
export const selectIsLoadingRankings = (state: { leagues: LeaguesState }) => state.leagues.isLoadingRankings;
export const selectError = (state: { leagues: LeaguesState }) => state.leagues.error;

// Export reducer
export default leaguesSlice.reducer;
