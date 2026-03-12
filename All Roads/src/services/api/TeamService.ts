import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS } from './config';
import {
  Team,
  CreateTeamData,
  UpdateTeamData,
  TeamFilters,
  TeamMember,
  TeamRole,
  Event,
  PaginatedResponse,
  PaginationParams,
  SearchResult,
} from '../../types';

export class TeamService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Get all teams with optional filtering and pagination
   */
  async getTeams(
    filters?: TeamFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Team>> {
    const params = {
      ...filters,
      ...pagination,
    };

    return this.get<PaginatedResponse<Team>>(API_ENDPOINTS.TEAMS.BASE, { params });
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(id: string): Promise<Team> {
    return this.get<Team>(API_ENDPOINTS.TEAMS.BY_ID(id));
  }

  /**
   * Create a new team
   */
  async createTeam(teamData: CreateTeamData): Promise<Team> {
    return this.post<Team>(API_ENDPOINTS.TEAMS.BASE, teamData);
  }

  /**
   * Update an existing team
   */
  async updateTeam(id: string, updates: UpdateTeamData): Promise<Team> {
    return this.put<Team>(API_ENDPOINTS.TEAMS.BY_ID(id), updates);
  }

  /**
   * Delete a team
   */
  async deleteTeam(id: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.TEAMS.BY_ID(id));
  }

  /**
   * Join a team (with optional invite code)
   */
  async joinTeam(teamId: string, inviteCode?: string): Promise<TeamMember> {
    const data = inviteCode ? { inviteCode } : {};
    return this.post<TeamMember>(API_ENDPOINTS.TEAMS.JOIN(teamId), data);
  }

  /**
   * Leave a team
   */
  async leaveTeam(teamId: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.TEAMS.LEAVE(teamId));
  }

  /**
   * Invite a user to join a team
   */
  async inviteToTeam(teamId: string, userId: string, message?: string): Promise<void> {
    const data = { userId, message };
    return this.post<void>(API_ENDPOINTS.TEAMS.INVITE(teamId), data);
  }

  /**
   * Remove a member from a team
   */
  async removeFromTeam(teamId: string, userId: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.TEAMS.REMOVE_MEMBER(teamId, userId));
  }

  /**
   * Update a team member's role
   */
  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMember> {
    const data = { role };
    return this.put<TeamMember>(API_ENDPOINTS.TEAMS.UPDATE_ROLE(teamId, userId), data);
  }

  /**
   * Search teams with advanced filters
   */
  async searchTeams(
    query: string,
    filters?: TeamFilters,
    pagination?: PaginationParams
  ): Promise<SearchResult<Team>> {
    const params = {
      query,
      ...filters,
      ...pagination,
    };

    return this.get<SearchResult<Team>>(API_ENDPOINTS.SEARCH.TEAMS, { params });
  }

  /**
   * Get nearby teams based on location
   */
  async getNearbyTeams(
    latitude: number,
    longitude: number,
    radius: number = 10, // km
    filters?: Omit<TeamFilters, 'location'>
  ): Promise<Team[]> {
    const params = {
      latitude,
      longitude,
      radius,
      ...filters,
    };

    return this.get<Team[]>(API_ENDPOINTS.TEAMS.NEARBY, { params });
  }

  /**
   * Get recommended teams for the current user
   */
  async getRecommendedTeams(limit: number = 10): Promise<Team[]> {
    const params = { limit };
    return this.get<Team[]>(API_ENDPOINTS.TEAMS.RECOMMENDED, { params });
  }

  /**
   * Get events for a specific team
   */
  async getTeamEvents(
    teamId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = pagination || {};
    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.TEAMS.EVENTS(teamId), { params });
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<{
    totalMembers: number;
    totalEvents: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    winRate: number;
    averageScore?: number;
    memberRetentionRate: number;
  }> {
    return this.get(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/stats`);
  }

  /**
   * Get team member statistics
   */
  async getMemberStats(teamId: string, userId: string): Promise<{
    eventsAttended: number;
    eventsOrganized: number;
    averageRating?: number;
    joinedAt: Date;
    lastActive: Date;
    contributions: {
      type: string;
      count: number;
    }[];
  }> {
    return this.get(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/members/${userId}/stats`);
  }

  /**
   * Generate new invite code for a team
   */
  async generateInviteCode(teamId: string): Promise<{ inviteCode: string; expiresAt: Date }> {
    return this.post<{ inviteCode: string; expiresAt: Date }>(
      `${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/invite-code`
    );
  }

  /**
   * Validate invite code
   */
  async validateInviteCode(inviteCode: string): Promise<{
    valid: boolean;
    team?: Team;
    expiresAt?: Date;
  }> {
    const params = { inviteCode };
    return this.get<{ valid: boolean; team?: Team; expiresAt?: Date }>(
      `${API_ENDPOINTS.TEAMS.BASE}/validate-invite`,
      { params }
    );
  }

  /**
   * Get teams by sport type
   */
  async getTeamsBySport(
    sportType: string,
    filters?: Omit<TeamFilters, 'sportType'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Team>> {
    const params = {
      ...filters,
      ...pagination,
      sportType,
    };

    return this.get<PaginatedResponse<Team>>(API_ENDPOINTS.TEAMS.BASE, { params });
  }

  /**
   * Get teams with open slots
   */
  async getTeamsWithOpenSlots(
    filters?: Omit<TeamFilters, 'hasOpenSlots'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Team>> {
    const params = {
      ...filters,
      ...pagination,
      hasOpenSlots: true,
    };

    return this.get<PaginatedResponse<Team>>(API_ENDPOINTS.TEAMS.BASE, { params });
  }

  /**
   * Check team name availability
   */
  async checkNameAvailability(name: string, excludeId?: string): Promise<{ available: boolean }> {
    const params = {
      name,
      excludeId,
    };

    return this.get<{ available: boolean }>(`${API_ENDPOINTS.TEAMS.BASE}/check-name`, {
      params,
    });
  }

  /**
   * Get team leaderboard
   */
  async getTeamLeaderboard(
    sportType?: string,
    region?: string,
    limit: number = 20
  ): Promise<{
    rank: number;
    team: Team;
    stats: {
      gamesPlayed: number;
      gamesWon: number;
      winRate: number;
      points: number;
    };
  }[]> {
    const params = {
      sportType,
      region,
      limit,
    };

    return this.get(`${API_ENDPOINTS.TEAMS.BASE}/leaderboard`, { params });
  }

  /**
   * Upload team logo
   */
  async uploadTeamLogo(
    teamId: string,
    logo: File,
    onProgress?: (progress: number) => void
  ): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', logo);

    return this.uploadFile<{ logoUrl: string }>(
      `${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/logo`,
      formData,
      onProgress
    );
  }

  /**
   * Delete team logo
   */
  async deleteTeamLogo(teamId: string): Promise<void> {
    return this.delete<void>(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/logo`);
  }

  /**
   * Get team activity feed
   */
  async getTeamActivity(
    teamId: string,
    pagination?: PaginationParams
  ): Promise<
    PaginatedResponse<{
      id: string;
      type: 'member_joined' | 'member_left' | 'event_created' | 'game_result' | 'achievement';
      title: string;
      description: string;
      timestamp: Date;
      data?: any;
    }>
  > {
    const params = pagination || {};
    return this.get(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/activity`, { params });
  }

  /**
   * Get leagues that a team is participating in
   */
  async getTeamLeagues(teamId: string): Promise<any[]> {
    return this.get(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/leagues`);
  }
}

// Create and export singleton instance
export const teamService = new TeamService();