import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Team, TeamFilters, TeamMember, PaginatedResponse } from '../../types';

// Teams state interface
export interface TeamsState {
  teams: Team[];
  userTeams: Team[];
  selectedTeam: Team | null;
  filters: TeamFilters;
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
const initialState: TeamsState = {
  teams: [],
  userTeams: [],
  selectedTeam: null,
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

// Teams slice
const teamsSlice = createSlice({
  name: 'teams',
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

    // Set teams (replace all)
    setTeams: (state, action: PayloadAction<PaginatedResponse<Team>>) => {
      const { data, pagination } = action.payload;
      state.teams = data;
      state.pagination = pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append teams (for pagination)
    appendTeams: (state, action: PayloadAction<PaginatedResponse<Team>>) => {
      const { data, pagination } = action.payload;
      state.teams = [...state.teams, ...data];
      state.pagination = pagination;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Set user teams
    setUserTeams: (state, action: PayloadAction<Team[]>) => {
      state.userTeams = action.payload;
    },

    // Add single team
    addTeam: (state, action: PayloadAction<Team>) => {
      state.teams.unshift(action.payload);
      state.pagination.total += 1;
    },

    // Update team
    updateTeam: (state, action: PayloadAction<Team>) => {
      const index = state.teams.findIndex(team => team.id === action.payload.id);
      if (index !== -1) {
        state.teams[index] = action.payload;
      }
      
      // Update in user teams if present
      const userTeamIndex = state.userTeams.findIndex(team => team.id === action.payload.id);
      if (userTeamIndex !== -1) {
        state.userTeams[userTeamIndex] = action.payload;
      }
      
      // Update selected team if it's the same
      if (state.selectedTeam?.id === action.payload.id) {
        state.selectedTeam = action.payload;
      }
    },

    // Remove team
    removeTeam: (state, action: PayloadAction<string>) => {
      state.teams = state.teams.filter(team => team.id !== action.payload);
      state.userTeams = state.userTeams.filter(team => team.id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      
      // Clear selected team if it's the removed one
      if (state.selectedTeam?.id === action.payload) {
        state.selectedTeam = null;
      }
    },

    // Set selected team
    setSelectedTeam: (state, action: PayloadAction<Team | null>) => {
      state.selectedTeam = action.payload;
    },

    // Add team member
    addTeamMember: (state, action: PayloadAction<{ teamId: string; member: TeamMember }>) => {
      const { teamId, member } = action.payload;
      
      // Update in teams array
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        team.members.push(member);
      }
      
      // Update in user teams array
      const userTeam = state.userTeams.find(t => t.id === teamId);
      if (userTeam) {
        userTeam.members.push(member);
      }
      
      // Update selected team
      if (state.selectedTeam?.id === teamId) {
        state.selectedTeam.members.push(member);
      }
    },

    // Remove team member
    removeTeamMember: (state, action: PayloadAction<{ teamId: string; userId: string }>) => {
      const { teamId, userId } = action.payload;
      
      // Update in teams array
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        team.members = team.members.filter(m => m.userId !== userId);
      }
      
      // Update in user teams array
      const userTeam = state.userTeams.find(t => t.id === teamId);
      if (userTeam) {
        userTeam.members = userTeam.members.filter(m => m.userId !== userId);
      }
      
      // Update selected team
      if (state.selectedTeam?.id === teamId) {
        state.selectedTeam.members = state.selectedTeam.members.filter(m => m.userId !== userId);
      }
    },

    // Update team member role
    updateTeamMemberRole: (state, action: PayloadAction<{ teamId: string; userId: string; role: string }>) => {
      const { teamId, userId, role } = action.payload;
      
      const updateMemberRole = (team: Team) => {
        const member = team.members.find(m => m.userId === userId);
        if (member) {
          member.role = role as any;
        }
      };
      
      // Update in teams array
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        updateMemberRole(team);
      }
      
      // Update in user teams array
      const userTeam = state.userTeams.find(t => t.id === teamId);
      if (userTeam) {
        updateMemberRole(userTeam);
      }
      
      // Update selected team
      if (state.selectedTeam?.id === teamId) {
        updateMemberRole(state.selectedTeam);
      }
    },

    // Join team (add to user teams)
    joinTeam: (state, action: PayloadAction<Team>) => {
      const team = action.payload;
      const existingIndex = state.userTeams.findIndex(t => t.id === team.id);
      if (existingIndex === -1) {
        state.userTeams.push(team);
      } else {
        state.userTeams[existingIndex] = team;
      }
    },

    // Leave team (remove from user teams)
    leaveTeam: (state, action: PayloadAction<string>) => {
      state.userTeams = state.userTeams.filter(team => team.id !== action.payload);
    },

    // Set filters
    setFilters: (state, action: PayloadAction<TeamFilters>) => {
      state.filters = action.payload;
      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Update filters (merge with existing)
    updateFilters: (state, action: PayloadAction<Partial<TeamFilters>>) => {
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

    // Reset teams state
    resetTeams: (state) => {
      state.teams = [];
      state.userTeams = [];
      state.selectedTeam = null;
      state.pagination = initialState.pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = null;
    },

    // Update team stats
    updateTeamStats: (state, action: PayloadAction<{ teamId: string; stats: any }>) => {
      const { teamId, stats } = action.payload;
      
      const updateStats = (team: Team) => {
        team.stats = { ...team.stats, ...stats };
      };
      
      // Update in teams array
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        updateStats(team);
      }
      
      // Update in user teams array
      const userTeam = state.userTeams.find(t => t.id === teamId);
      if (userTeam) {
        updateStats(userTeam);
      }
      
      // Update selected team
      if (state.selectedTeam?.id === teamId) {
        updateStats(state.selectedTeam);
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
  setTeams,
  appendTeams,
  setUserTeams,
  addTeam,
  updateTeam,
  removeTeam,
  setSelectedTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  joinTeam,
  leaveTeam,
  setFilters,
  updateFilters,
  clearFilters,
  setPagination,
  resetTeams,
  updateTeamStats,
} = teamsSlice.actions;

// Export reducer
export default teamsSlice.reducer;

// Selectors
export const selectTeams = (state: { teams: TeamsState }) => state.teams.teams;
export const selectUserTeams = (state: { teams: TeamsState }) => state.teams.userTeams;
export const selectSelectedTeam = (state: { teams: TeamsState }) => state.teams.selectedTeam;
export const selectTeamFilters = (state: { teams: TeamsState }) => state.teams.filters;
export const selectTeamsPagination = (state: { teams: TeamsState }) => state.teams.pagination;
export const selectTeamsLoading = (state: { teams: TeamsState }) => state.teams.isLoading;
export const selectTeamsLoadingMore = (state: { teams: TeamsState }) => state.teams.isLoadingMore;
export const selectTeamsError = (state: { teams: TeamsState }) => state.teams.error;
export const selectTeamsLastUpdated = (state: { teams: TeamsState }) => state.teams.lastUpdated;