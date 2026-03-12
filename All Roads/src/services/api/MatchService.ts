import { BaseApiService, defaultApiConfig } from './BaseApiService';
import {
  Match,
  CreateMatchData,
  UpdateMatchData,
  RecordMatchResultData,
  PaginatedResponse
} from '../../types';

export class MatchService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Get all matches with filtering and pagination
   */
  async getMatches(
    filters?: {
      leagueId?: string;
      seasonId?: string;
      teamId?: string;
      status?: string;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Match>> {
    const params = {
      ...filters,
      page,
      limit
    };

    return this.get<PaginatedResponse<Match>>('/matches', {
      params,
      cacheOptions: { ttl: 30000 } // Cache for 30 seconds
    });
  }

  /**
   * Get match by ID
   */
  async getMatchById(id: string): Promise<Match> {
    return this.get<Match>(`/matches/${id}`, {
      cacheOptions: { ttl: 15000 } // Cache for 15 seconds
    });
  }

  /**
   * Create new match
   */
  async createMatch(data: CreateMatchData, userId: string): Promise<Match> {
    return this.post<Match>('/matches', {
      ...data,
      userId
    });
  }

  /**
   * Update match
   */
  async updateMatch(id: string, data: UpdateMatchData, userId: string): Promise<Match> {
    return this.put<Match>(`/matches/${id}`, {
      ...data,
      userId
    });
  }

  /**
   * Delete match
   */
  async deleteMatch(id: string, userId: string): Promise<void> {
    return this.delete<void>(`/matches/${id}`, {
      data: { userId }
    });
  }

  /**
   * Record match result
   */
  async recordMatchResult(id: string, data: RecordMatchResultData, userId: string): Promise<Match> {
    return this.post<Match>(`/matches/${id}/result`, {
      ...data,
      userId
    });
  }

  /**
   * Get matches for a league
   */
  async getLeagueMatches(
    leagueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Match>> {
    return this.getMatches({ leagueId }, page, limit);
  }

  /**
   * Get matches for a team
   */
  async getTeamMatches(
    teamId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Match>> {
    return this.getMatches({ teamId }, page, limit);
  }

  /**
   * Get upcoming matches
   */
  async getUpcomingMatches(
    leagueId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Match>> {
    return this.getMatches({ leagueId, status: 'scheduled' }, page, limit);
  }

  /**
   * Get completed matches
   */
  async getCompletedMatches(
    leagueId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Match>> {
    return this.getMatches({ leagueId, status: 'completed' }, page, limit);
  }
}

// Export singleton instance
export const matchService = new MatchService();
